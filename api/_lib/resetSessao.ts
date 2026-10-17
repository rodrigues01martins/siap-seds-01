// Reset da sessão da Comissão (presidente): descarta tudo o que foi gravado com o sessaoId da sessão —
// admissibilidade, níveis da D1, experiências da D2 (com seus documentos) e decisões de desempate. Diligências
// não são afetadas. Cada documento volta ao estado ANTERIOR à sessão: o "antes" do primeiro registro de
// auditoria daquela sessão para ele (antes nulo = o documento não existia e é apagado). Totais, D2 e status
// das propostas afetadas são recalculados com src/domain (recalcular.ts). A sessão não é apagada.
//
// Bloqueios (409): proposta afetada homologada ("Reabra antes de resetar") ou registro da sessão alterado
// depois, em outra sessão ainda não resetada, ou fora de sessão ("Resete primeiro a sessão posterior").
//
// Ordem (idempotente): 1) planeja e confere bloqueios; 2) marca a sessão "reiniciando" (nenhum registro novo
// entra nela); 3) reverte em lotes de até 400 escritas por transação (documento + auditoria "resetar_sessao");
// cada lote pula o que já está no estado de destino; 4) recalcula as propostas; 5) marca "reiniciada".
// Se cair no meio, a sessão fica "reiniciando" e repetir continua de onde parou.

import { FieldValue, Timestamp, type DocumentData } from 'firebase-admin/firestore'
import { obterAdmin } from './admin.js'
import { ErroApi, MENSAGENS } from './erros.js'
import { gravar, propostaDoCaminho, type Autor, type Operacao } from './gravar.js'
import { recalcular } from './recalcular.js'

export interface Bloqueio {
  mensagem: string
  itens: string[]
}

export interface PreviaReset {
  sessaoId: string
  status: string
  propostas: { propostaId: string; protocolo: string | null; reverter: string[]; apagar: string[] }[]
  desempates: { reverter: string[]; apagar: string[] }
  /** Documentos que serão revertidos ou apagados. */
  total: number
  bloqueios: Bloqueio[]
}

export interface ResultadoReset {
  revertidos: number
  apagados: number
  propostas: string[]
  resets: number
}

export interface OpcoesReset {
  /** Escritas por transação (documento + auditoria de cada reversão); padrão 400. */
  escritasPorLote?: number
  /** Só para testes: chamado depois de cada lote (lançar simula a queda). */
  aposLote?: (indice: number) => void | Promise<void>
}

type Tipo = 'nivel' | 'experiencia' | 'admissibilidade' | 'desempate'

/** Um documento (ou, na proposta, o campo admissibilidade) a devolver ao estado anterior à sessão. */
interface Reversao {
  caminho: string
  tipo: Tipo
  propostaId: string | null
  /** Estado anterior à sessão (null = não existia: apagar). Na admissibilidade, o valor do campo. */
  alvo: Record<string, unknown> | null
  rotulo: string
}

interface Registro {
  caminho: string
  acao: string
  antes: Record<string, unknown> | null
  depois: Record<string, unknown> | null
  sessaoId?: string
  dataHora: Timestamp
}

export const ESCRITAS_POR_LOTE = 400
export const ACAO_RESET = 'resetar_sessao'
const STATUS_REINICIANDO = 'reiniciando'
const STATUS_REINICIADA = 'reiniciada'

const db = () => obterAdmin().db

// ---------- Comparação de estados (Timestamp, mapas e listas) ----------

export function iguais(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a instanceof Timestamp || b instanceof Timestamp) return a instanceof Timestamp && b instanceof Timestamp && a.isEqual(b)
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => iguais(x, b[i]))
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a).filter((k) => (a as Record<string, unknown>)[k] !== undefined)
    const kb = Object.keys(b).filter((k) => (b as Record<string, unknown>)[k] !== undefined)
    return ka.length === kb.length && ka.every((k) => iguais((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]))
  }
  return (a ?? null) === (b ?? null)
}

const admissibilidadeDe = (d: Record<string, unknown> | null | undefined) => (d?.admissibilidade as Record<string, unknown> | undefined) ?? null

// ---------- Planejamento ----------

function tipoDoCaminho(ch: string, caminho: string): Tipo | null {
  const base = `chamamentos/${ch}/`
  if (!caminho.startsWith(base)) return null
  const partes = caminho.slice(base.length).split('/')
  if (partes[0] === 'desempates' && partes.length === 2) return 'desempate'
  if (partes[0] !== 'propostas') return null
  if (partes.length === 2) return 'admissibilidade'
  if (partes.length === 4 && partes[2] === 'avaliacoes') return 'nivel'
  if (partes.length === 4 && partes[2] === 'experiencias') return 'experiencia'
  return null
}

/** Na proposta, só conta o registro que mudou a admissibilidade (totais são recalculados). */
const mudouAdmissibilidade = (r: Registro) => !iguais(admissibilidadeDe(r.antes), admissibilidadeDe(r.depois))

function rotular(tipo: Tipo, caminho: string, alvo: Record<string, unknown> | null, atual: Record<string, unknown> | null): string {
  const id = caminho.split('/').at(-1)!
  const dados = alvo ?? atual
  switch (tipo) {
    case 'nivel':
      return `Nível ${id} da D1`
    case 'experiencia':
      return `Experiência “${String(dados?.descricao ?? id)}”`
    case 'admissibilidade':
      return 'Admissibilidade'
    case 'desempate':
      return `Desempate do lote ${String(dados?.loteCodigo ?? id)}`
  }
}

const ordenar = (registros: Registro[]) => [...registros].sort((a, b) => a.dataHora.toMillis() - b.dataHora.toMillis())

async function registrosDosCaminhos(caminhos: string[]): Promise<Map<string, Registro[]>> {
  const porCaminho = new Map<string, Registro[]>()
  for (let i = 0; i < caminhos.length; i += 30) {
    const consulta = await db().collection('auditoria').where('caminho', 'in', caminhos.slice(i, i + 30)).get()
    for (const doc of consulta.docs) {
      const r = doc.data() as Registro
      porCaminho.set(r.caminho, [...(porCaminho.get(r.caminho) ?? []), r])
    }
  }
  return porCaminho
}

interface Plano {
  sessao: DocumentData
  reversoes: Reversao[]
  bloqueios: Bloqueio[]
  /** Estado atual de cada caminho (para a prévia: só o que difere do alvo é revertido/apagado). */
  atuais: Map<string, Record<string, unknown> | null>
  protocolos: Map<string, string | null>
}

const dataBr = (iso: string) => iso.split('-').reverse().join('/')
const dataHoraBr = (t: Timestamp) => t.toDate().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })

async function planejar(ch: string, sessaoId: string): Promise<Plano> {
  const sessao = await db().doc(`chamamentos/${ch}/sessoes/${sessaoId}`).get()
  if (!sessao.exists) throw new ErroApi(404, MENSAGENS.sessaoNaoEncontrada)

  // Registros da sessão, agrupados por documento (consulta por igualdade: sem índice composto).
  const daSessao = (await db().collection('auditoria').where('sessaoId', '==', sessaoId).get()).docs.map((d) => d.data() as Registro)
  const porCaminho = new Map<string, Registro[]>()
  for (const r of ordenar(daSessao)) {
    const tipo = tipoDoCaminho(ch, r.caminho)
    if (!tipo || (tipo === 'admissibilidade' && !mudouAdmissibilidade(r))) continue
    porCaminho.set(r.caminho, [...(porCaminho.get(r.caminho) ?? []), r])
  }
  const caminhos = [...porCaminho.keys()]

  // Estado atual dos documentos e das propostas envolvidas.
  const atuais = new Map<string, Record<string, unknown> | null>()
  const lidos = caminhos.length ? await db().getAll(...caminhos.map((c) => db().doc(c))) : []
  lidos.forEach((d, i) => atuais.set(caminhos[i]!, d.exists ? (d.data() ?? null) : null))

  const reversoes: Reversao[] = []
  for (const [caminho, registros] of porCaminho) {
    const tipo = tipoDoCaminho(ch, caminho)!
    const primeiro = registros[0]!
    const alvo = tipo === 'admissibilidade' ? admissibilidadeDe(primeiro.antes) : primeiro.antes
    const propostaCaminho = propostaDoCaminho(caminho)
    reversoes.push({
      caminho,
      tipo,
      propostaId: propostaCaminho ? propostaCaminho.split('/').at(-1)! : null,
      alvo,
      rotulo: rotular(tipo, caminho, alvo, tipo === 'admissibilidade' ? null : (atuais.get(caminho) ?? null)),
    })
  }

  // Propostas afetadas (inclusive as do desempate) e as que ainda existem.
  const idsPropostas = new Set<string>()
  for (const r of reversoes) {
    if (r.propostaId) idsPropostas.add(r.propostaId)
    if (r.tipo === 'desempate') {
      const dados = r.alvo ?? atuais.get(r.caminho) ?? null
      for (const p of (dados?.propostas as string[] | undefined) ?? []) idsPropostas.add(p)
    }
  }
  const ids = [...idsPropostas]
  const propostas = ids.length ? await db().getAll(...ids.map((p) => db().doc(`chamamentos/${ch}/propostas/${p}`))) : []
  const protocolos = new Map<string, string | null>()
  const existentes = new Set<string>()
  const homologadas: string[] = []
  propostas.forEach((d, i) => {
    if (!d.exists) return
    existentes.add(ids[i]!)
    protocolos.set(ids[i]!, (d.get('protocolo') as string | undefined) ?? null)
    if (d.get('bloqueada') === true) homologadas.push(`protocolo ${(d.get('protocolo') as string | undefined) ?? ids[i]!}`)
  })
  // Proposta excluída depois: nada a reverter nela.
  const validas = reversoes.filter((r) => r.propostaId === null || existentes.has(r.propostaId))
  for (const r of validas) {
    if (r.tipo === 'admissibilidade') atuais.set(r.caminho, admissibilidadeDe(atuais.get(r.caminho)))
  }

  const bloqueios: Bloqueio[] = []
  if (homologadas.length > 0) {
    bloqueios.push({ mensagem: 'Há proposta homologada entre as afetadas pela sessão. Reabra antes de resetar:', itens: homologadas })
  }

  // Alterações posteriores, feitas fora desta sessão (outra sessão não resetada, ou fora de sessão).
  const historico = await registrosDosCaminhos(validas.map((r) => r.caminho))
  const posteriores = new Map<string, number>()
  const sessoesVistas = new Map<string, DocumentData | null>()
  for (const r of validas) {
    const ultimo = porCaminho.get(r.caminho)!.at(-1)!.dataHora
    for (const outro of historico.get(r.caminho) ?? []) {
      if (outro.dataHora.toMillis() <= ultimo.toMillis() || outro.sessaoId === sessaoId || outro.acao === ACAO_RESET) continue
      if (r.tipo === 'admissibilidade' && !mudouAdmissibilidade(outro)) continue
      let chave: string
      if (outro.sessaoId) {
        if (!sessoesVistas.has(outro.sessaoId)) {
          const s = await db().doc(`chamamentos/${ch}/sessoes/${outro.sessaoId}`).get()
          sessoesVistas.set(outro.sessaoId, s.exists ? (s.data() ?? null) : null)
        }
        const outra = sessoesVistas.get(outro.sessaoId)
        if (outra?.status === STATUS_REINICIADA) continue // já resetada: não conta
        chave = `sessão de ${dataBr(String(outra?.data ?? '')) || outro.sessaoId}`
      } else {
        chave = `alteração fora de sessão em ${dataHoraBr(outro.dataHora)}`
      }
      posteriores.set(chave, (posteriores.get(chave) ?? 0) + 1)
    }
  }
  if (posteriores.size > 0) {
    bloqueios.push({
      mensagem: 'Registros desta sessão foram alterados depois, em outra sessão. Resete primeiro a sessão posterior:',
      itens: [...posteriores].map(([quem, n]) => `${quem} (${n} ${n === 1 ? 'registro' : 'registros'})`),
    })
  }

  return { sessao: sessao.data() ?? {}, reversoes: validas, bloqueios, atuais, protocolos }
}

const pendentesDe = (plano: Plano) => plano.reversoes.filter((r) => !iguais(plano.atuais.get(r.caminho) ?? null, r.alvo))
const textoDoBloqueio = (b: Bloqueio) => (b.itens.length > 0 ? `${b.mensagem} ${b.itens.join('; ')}.` : b.mensagem)

// ---------- Prévia ----------

export async function previaReset(chamamentoId: string, sessaoId: string): Promise<PreviaReset> {
  const plano = await planejar(chamamentoId, sessaoId)
  const pendentes = pendentesDe(plano)
  const porProposta = new Map<string, { reverter: string[]; apagar: string[] }>()
  const desempates = { reverter: [] as string[], apagar: [] as string[] }
  for (const r of pendentes) {
    const destino = r.propostaId ? (porProposta.get(r.propostaId) ?? { reverter: [], apagar: [] }) : desempates
    ;(r.alvo === null ? destino.apagar : destino.reverter).push(r.rotulo)
    if (r.propostaId) porProposta.set(r.propostaId, destino)
  }
  return {
    sessaoId,
    status: String(plano.sessao.status ?? ''),
    propostas: [...porProposta].map(([propostaId, itens]) => ({ propostaId, protocolo: plano.protocolos.get(propostaId) ?? null, ...itens })),
    desempates,
    total: pendentes.length,
    bloqueios: plano.bloqueios,
  }
}

// ---------- Execução ----------

export async function executarReset(
  autor: Autor,
  chamamentoId: string,
  sessaoId: string,
  justificativa: string,
  opcoes: OpcoesReset = {},
): Promise<ResultadoReset> {
  const caminhoSessao = `chamamentos/${chamamentoId}/sessoes/${sessaoId}`
  const auditoria = { acao: ACAO_RESET, extras: { resetDaSessao: sessaoId, justificativa } }

  // 1) Bloqueios antes de mexer em qualquer coisa.
  let plano = await planejar(chamamentoId, sessaoId)
  if (plano.bloqueios.length > 0) throw new ErroApi(409, plano.bloqueios.map(textoDoBloqueio).join(' '))

  // 2) Sessão "reiniciando": nenhum registro novo entra nela (a /api só grava em sessão "aberta").
  if (plano.sessao.status !== STATUS_REINICIANDO) {
    await gravar(autor, () => [{ caminho: caminhoSessao, acao: 'editar', dados: { status: STATUS_REINICIANDO, foco: null } }], { auditoria })
    plano = await planejar(chamamentoId, sessaoId) // inclui o que tenha entrado entre o plano e a marcação
    if (plano.bloqueios.length > 0) throw new ErroApi(409, plano.bloqueios.map(textoDoBloqueio).join(' '))
  }

  // 3) Reversões em lotes (cada uma: documento + auditoria = 2 escritas); pula o que já está no destino.
  const porLote = Math.max(1, Math.floor((opcoes.escritasPorLote ?? ESCRITAS_POR_LOTE) / 2))
  const pendentes = pendentesDe(plano)
  let revertidos = 0
  let apagados = 0
  try {
    for (let i = 0, lote = 0; i < pendentes.length; i += porLote, lote++) {
      const fatia = pendentes.slice(i, i + porLote)
      let feitos = { revertidos: 0, apagados: 0 }
      await gravar(
        autor,
        async (transacao) => {
          const atuais = await Promise.all(fatia.map((r) => transacao.get(db().doc(r.caminho))))
          const operacoes: Operacao[] = []
          feitos = { revertidos: 0, apagados: 0 } // a transação pode ser refeita
          fatia.forEach((r, j) => {
            const atual = atuais[j]!.exists ? (atuais[j]!.data() ?? null) : null
            if (r.tipo === 'admissibilidade') {
              if (!atual || iguais(admissibilidadeDe(atual), r.alvo)) return
              operacoes.push({ caminho: r.caminho, acao: 'editar', dados: { admissibilidade: r.alvo ?? FieldValue.delete() } })
            } else {
              if (iguais(atual, r.alvo)) return
              operacoes.push({ caminho: r.caminho, acao: 'restaurar', dados: r.alvo ?? undefined })
            }
            if (r.alvo === null) feitos.apagados++
            else feitos.revertidos++
          })
          return operacoes
        },
        { auditoria },
      )
      revertidos += feitos.revertidos
      apagados += feitos.apagados
      await opcoes.aposLote?.(lote)
    }
  } catch (erro) {
    if (erro instanceof ErroApi) throw erro
    console.error(`[api] reset incompleto da sessão ${caminhoSessao}:`, erro)
    throw new ErroApi(503, 'O reset foi iniciado, mas não terminou. Repita a operação para concluir.')
  }

  // 4) Recalcula D1, D2, NF e status das propostas com nível ou experiência revertidos (src/domain).
  const propostas = [...new Set(plano.reversoes.filter((r) => r.tipo === 'nivel' || r.tipo === 'experiencia').map((r) => r.propostaId!))]
  for (const propostaId of propostas) {
    await gravar(autor, async (transacao) => (await recalcular(transacao, chamamentoId, propostaId)).operacoes, { auditoria })
  }

  // 5) Sessão "reiniciada" (não é apagada): presentes e declarações preservados, foco limpo.
  let resets = 0
  await gravar(
    autor,
    async (transacao) => {
      const sessao = await transacao.get(db().doc(caminhoSessao))
      resets = ((sessao.get('resets') as number | undefined) ?? 0) + 1
      const por = { uid: autor.uid, email: autor.email }
      const historico = (sessao.get('historicoResets') as unknown[] | undefined) ?? []
      return [
        {
          caminho: caminhoSessao,
          acao: 'editar',
          dados: {
            status: STATUS_REINICIADA,
            foco: null,
            reiniciadaPor: por,
            reiniciadaEm: FieldValue.serverTimestamp(),
            motivo: justificativa,
            resets,
            historicoResets: [...historico, { por, em: Timestamp.now(), motivo: justificativa }],
          },
        },
      ]
    },
    { auditoria },
  )
  return { revertidos, apagados, propostas, resets }
}
