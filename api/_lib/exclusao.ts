// Exclusão de cadastros (chamamento, OSC, proposta). Admin e presidente, com justificativa.
// O Firestore não apaga subcoleções sozinho e a transação aceita no máximo 500 escritas, então a ordem é:
//   a) transação: confere os bloqueios, marca o documento com status "excluindo" (o gravar passa a recusar
//      qualquer escrita nele ou abaixo dele com 409) e grava em auditoria a ação "excluir" com a fotografia
//      COMPLETA (documento + todas as subcoleções, recursivamente), justificativa, uid e perfil;
//   b) recursiveDelete no documento (apaga as subcoleções e, por último, o próprio documento);
//   c) se b falhar, o documento continua "excluindo" e a operação pode ser repetida: a repetição não refaz
//      a fotografia (a primeira é a completa) e só termina de apagar.
// A prévia (GET ?simular=true) usa as mesmas leituras, sem gravar nada.

import {
  FieldValue,
  type DocumentReference,
  type DocumentSnapshot,
  type Query,
  type QuerySnapshot,
  type Transaction,
} from 'firebase-admin/firestore'
import { obterAdmin } from './admin.js'
import { ErroApi, MENSAGENS } from './erros.js'
import type { Autor } from './gravar.js'

/** Motivo que impede a exclusão; `itens` lista os registros que a impedem. */
export interface Bloqueio {
  mensagem: string
  itens: string[]
}

/** Lê um documento ou uma consulta: dentro da transação (exclusão) ou fora dela (prévia). */
export interface Leitor {
  doc(referencia: DocumentReference): Promise<DocumentSnapshot>
  consulta(consulta: Query): Promise<QuerySnapshot>
}

export interface AlvoExclusao {
  caminho: string
  bloqueios: (ler: Leitor) => Promise<Bloqueio[]>
}

export interface Previa {
  caminho: string
  existe: boolean
  emExclusao: boolean
  /** Documentos que serão apagados, por subcoleção (aninhadas como "experiencias/documentos"). */
  subcolecoes: Record<string, number>
  /** Total de documentos apagados, contando o próprio registro. */
  total: number
  bloqueios: Bloqueio[]
}

export type ResultadoExclusao = Omit<Previa, 'existe' | 'emExclusao' | 'bloqueios'>

/** Fotografia de um documento e de suas subcoleções (por nome da coleção e id do documento). */
interface Fotografia {
  dados: Record<string, unknown>
  subcolecoes?: Subcolecoes
}
type Subcolecoes = Record<string, Record<string, Fotografia>>

const EXCLUINDO = 'excluindo'

const leitorDaTransacao = (transacao: Transaction): Leitor => ({
  doc: (referencia) => transacao.get(referencia),
  consulta: (consulta) => transacao.get(consulta),
})

const leitorDireto: Leitor = { doc: (referencia) => referencia.get(), consulta: (consulta) => consulta.get() }

const plural = (n: number, singular: string, varios: string) => `${n} ${n === 1 ? singular : varios}`

/** Texto do 409: cada bloqueio seguido dos registros que o causam. */
const textoDoBloqueio = (b: Bloqueio) => (b.itens.length > 0 ? `${b.mensagem} ${b.itens.join('; ')}.` : b.mensagem)

/** Lê as subcoleções de `referencia`, recursivamente (listCollections não é transacional; os documentos são). */
async function fotografarSubcolecoes(ler: Leitor, referencia: DocumentReference): Promise<Subcolecoes> {
  const colecoes = (await referencia.listCollections()).sort((a, b) => a.id.localeCompare(b.id))
  const fotografia: Subcolecoes = {}
  for (const colecao of colecoes) {
    const documentos = await ler.consulta(colecao)
    const porId: Record<string, Fotografia> = {}
    for (const documento of documentos.docs) {
      const subcolecoes = await fotografarSubcolecoes(ler, documento.ref)
      porId[documento.id] = { dados: documento.data(), ...(Object.keys(subcolecoes).length > 0 ? { subcolecoes } : {}) }
    }
    fotografia[colecao.id] = porId
  }
  return fotografia
}

/** Contagem por subcoleção (aninhadas como "pai/filha") e total, contando o próprio documento. */
function contar(subcolecoes: Subcolecoes): Pick<Previa, 'subcolecoes' | 'total'> {
  const contagem: Record<string, number> = {}
  const somar = (nivel: Subcolecoes, prefixo: string) => {
    for (const [nome, documentos] of Object.entries(nivel)) {
      const chave = prefixo ? `${prefixo}/${nome}` : nome
      contagem[chave] = (contagem[chave] ?? 0) + Object.keys(documentos).length
      for (const doc of Object.values(documentos)) if (doc.subcolecoes) somar(doc.subcolecoes, chave)
    }
  }
  somar(subcolecoes, '')
  return { subcolecoes: contagem, total: 1 + Object.values(contagem).reduce((a, b) => a + b, 0) }
}

// ---------- Alvos ----------

export function alvoProposta(chamamentoId: string, propostaId: string): AlvoExclusao {
  const caminho = `chamamentos/${chamamentoId}/propostas/${propostaId}`
  return {
    caminho,
    bloqueios: async (ler) => {
      const proposta = await ler.doc(obterAdmin().db.doc(caminho))
      return proposta.get('bloqueada') === true
        ? [{ mensagem: 'Proposta homologada. Reabra a proposta antes de excluir.', itens: [] }]
        : []
    },
  }
}

export function alvoOsc(cnpj: string): AlvoExclusao {
  return {
    caminho: `oscs/${cnpj}`,
    bloqueios: async (ler) => {
      // Sem consulta de grupo de coleções (exigiria índice): percorre os chamamentos.
      const { db } = obterAdmin()
      const itens: string[] = []
      const chamamentos = await ler.consulta(db.collection('chamamentos'))
      for (const chamamento of chamamentos.docs) {
        const propostas = await ler.consulta(chamamento.ref.collection('propostas').where('oscCnpj', '==', cnpj))
        for (const p of propostas.docs) {
          const numero = (chamamento.get('numero') as string | undefined) ?? chamamento.id
          const protocolo = (p.get('protocolo') as string | undefined) ?? p.id
          itens.push(`chamamento ${numero}, protocolo ${protocolo} (lote ${String(p.get('loteCodigo'))})`)
        }
      }
      if (itens.length === 0) return []
      const n = itens.length
      return [
        {
          mensagem: `OSC com ${plural(n, 'proposta vinculada', 'propostas vinculadas')}; exclua ${n === 1 ? 'a proposta' : 'as propostas'} antes de excluir a OSC:`,
          itens,
        },
      ]
    },
  }
}

export function alvoChamamento(id: string): AlvoExclusao {
  const caminho = `chamamentos/${id}`
  return {
    caminho,
    bloqueios: async (ler) => {
      const { db } = obterAdmin()
      const [propostas, sessoes] = await Promise.all([
        ler.consulta(db.collection(`${caminho}/propostas`)),
        ler.consulta(db.collection(`${caminho}/sessoes`)),
      ])
      const bloqueios: Bloqueio[] = []
      if (!propostas.empty) {
        const n = propostas.size
        bloqueios.push({
          mensagem: `Chamamento com ${plural(n, 'proposta', 'propostas')}; exclua ${n === 1 ? 'a proposta' : 'as propostas'} antes de excluir o chamamento:`,
          itens: propostas.docs.map((p) => `protocolo ${(p.get('protocolo') as string | undefined) ?? p.id} (lote ${String(p.get('loteCodigo'))})`),
        })
      }
      if (!sessoes.empty) {
        bloqueios.push({
          mensagem: `Chamamento com ${plural(sessoes.size, 'sessão da Comissão registrada', 'sessões da Comissão registradas')}; as sessões fazem parte do histórico e impedem a exclusão:`,
          itens: sessoes.docs.map((s) => `sessão de ${String(s.get('data') ?? s.id)} (${String(s.get('status') ?? '—')})`),
        })
      }
      return bloqueios
    },
  }
}

// ---------- Prévia e exclusão ----------

/** O que será apagado e o que impede a exclusão, sem gravar nada. 404 se o registro não existe. */
export async function previaExclusao(alvo: AlvoExclusao): Promise<Previa> {
  const referencia = obterAdmin().db.doc(alvo.caminho)
  const atual = await referencia.get()
  if (!atual.exists) throw new ErroApi(404, MENSAGENS.naoEncontrado)
  const emExclusao = atual.get('status') === EXCLUINDO
  const bloqueios = emExclusao ? [] : await alvo.bloqueios(leitorDireto)
  return {
    caminho: alvo.caminho,
    existe: true,
    emExclusao,
    ...contar(await fotografarSubcolecoes(leitorDireto, referencia)),
    bloqueios,
  }
}

export async function excluirComSeguranca(
  autor: Autor,
  alvo: AlvoExclusao,
  justificativa: string,
  /** Só para testes: simula falha na etapa b. */
  opcoes: { apagar?: (referencia: DocumentReference) => Promise<void> } = {},
): Promise<ResultadoExclusao> {
  const { db } = obterAdmin()
  const referencia = db.doc(alvo.caminho)

  // a) Bloqueios, marca "excluindo" e auditoria com a fotografia completa — tudo no mesmo commit.
  const contagem = await db.runTransaction(async (transacao) => {
    const ler = leitorDaTransacao(transacao)
    const atual = await ler.doc(referencia)
    if (!atual.exists) {
      // Repetição em que o documento já se foi mas sobraram subcoleções: só termina de apagar.
      if ((await referencia.listCollections()).length === 0) throw new ErroApi(404, MENSAGENS.naoEncontrado)
      return contar(await fotografarSubcolecoes(ler, referencia))
    }
    const subcolecoes = await fotografarSubcolecoes(ler, referencia)
    if (atual.get('status') === EXCLUINDO) return contar(subcolecoes) // repetição (etapa c)

    const bloqueios = await alvo.bloqueios(ler)
    if (bloqueios.length > 0) throw new ErroApi(409, bloqueios.map(textoDoBloqueio).join(' '))

    const agora = FieldValue.serverTimestamp()
    transacao.update(referencia, {
      status: EXCLUINDO,
      exclusao: { uid: autor.uid, email: autor.email, justificativa, dataHora: agora },
    })
    transacao.create(db.collection('auditoria').doc(), {
      caminho: alvo.caminho,
      acao: 'excluir',
      antes: atual.data() ?? null,
      depois: null,
      subcolecoes,
      justificativa,
      uid: autor.uid,
      email: autor.email,
      perfil: autor.perfil,
      dataHora: agora,
    })
    return contar(subcolecoes)
  })

  // b) Apaga o documento e todas as subcoleções (em lotes, fora da transação).
  const apagar = opcoes.apagar ?? ((r: DocumentReference) => db.recursiveDelete(r))
  try {
    await apagar(referencia)
  } catch (erro) {
    // c) Continua "excluindo" (escritas recusadas); repetir a operação conclui.
    console.error(`[api] exclusão incompleta de ${alvo.caminho}:`, erro)
    throw new ErroApi(503, MENSAGENS.exclusaoIncompleta)
  }
  return { caminho: alvo.caminho, ...contagem }
}
