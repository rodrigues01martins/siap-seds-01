// Exclusão livre em cascata (Simplificação 2/4): admin e presidente, sem justificativa, sem identificador
// digitado e sem status "excluindo". Cada alvo sabe contar o que apaga (prévia GET ?simular=true) e apagar:
//   chamamento → lotes, sessões, propostas (e tudo dentro delas) e desempates (recursiveDelete);
//   lote       → propostas do lote e desempates do lote; sai do chamamento e da pauta (lotes) das sessões;
//   OSC        → suas propostas, em todos os chamamentos;
//   proposta   → admissibilidade, avaliações, experiências (com documentos) e resultado da D2;
//   sessão     → a sessão e tudo que foi registrado com o sessaoId dela (admissibilidade, níveis,
//                experiências e desempates); os totais das propostas afetadas são recalculados;
//   experiência, documento e nível → numa transação, com o recálculo (C4) da proposta.
// Repetir uma exclusão interrompida termina o serviço: as consultas só encontram o que sobrou.

import { FieldValue, type DocumentReference, type DocumentSnapshot, type QueryDocumentSnapshot } from 'firebase-admin/firestore'
import { previaDe, type Contagem, type PreviaExclusao, type TipoExcluido } from '../../src/esquemas/exclusao.js'
import { obterAdmin } from './admin.js'
import { ErroApi, MENSAGENS } from './erros.js'
import { gravar, type Autor, type Operacao } from './gravar.js'
import { recalcular } from './recalcular.js'

export interface AlvoExclusao {
  /** O que será apagado (404 se o registro não existe). */
  contar(): Promise<Contagem>
  apagar(autor: Autor): Promise<void>
}

const db = () => obterAdmin().db

function somar(contagem: Contagem, tipo: TipoExcluido, n = 1): void {
  if (n > 0) contagem[tipo] = (contagem[tipo] ?? 0) + n
}

const quantosDocumentos = (experiencia: DocumentSnapshot) => ((experiencia.get('documentos') ?? []) as unknown[]).length

async function exigirExistente(referencia: DocumentReference): Promise<DocumentSnapshot> {
  const atual = await referencia.get()
  if (!atual.exists) throw new ErroApi(404, MENSAGENS.naoEncontrado)
  return atual
}

/** Proposta e tudo dentro dela (subcoleções desconhecidas contam como "outros registros"). */
async function contarProposta(proposta: DocumentSnapshot, contagem: Contagem): Promise<void> {
  somar(contagem, 'proposta')
  if (proposta.get('admissibilidade') !== undefined) somar(contagem, 'admissibilidade')
  for (const colecao of await proposta.ref.listCollections()) {
    const documentos = await colecao.get()
    if (colecao.id === 'avaliacoes') somar(contagem, 'avaliacao', documentos.size)
    else if (colecao.id === 'resultadoD2') somar(contagem, 'resultadoD2', documentos.size)
    else if (colecao.id === 'experiencias') {
      somar(contagem, 'experiencia', documentos.size)
      somar(contagem, 'documento', documentos.docs.reduce((soma, e) => soma + quantosDocumentos(e), 0))
    } else somar(contagem, 'outro', documentos.size)
  }
}

const apagarTudo = (referencias: DocumentReference[]) => Promise.all(referencias.map((r) => db().recursiveDelete(r)))

// ---------- Cadastros ----------

export function alvoProposta(chamamentoId: string, propostaId: string): AlvoExclusao {
  const referencia = db().doc(`chamamentos/${chamamentoId}/propostas/${propostaId}`)
  return {
    async contar() {
      const contagem: Contagem = {}
      await contarProposta(await exigirExistente(referencia), contagem)
      return contagem
    },
    apagar: () => db().recursiveDelete(referencia),
  }
}

export function alvoChamamento(id: string): AlvoExclusao {
  const referencia = db().doc(`chamamentos/${id}`)
  return {
    async contar() {
      const chamamento = await exigirExistente(referencia)
      const contagem: Contagem = { chamamento: 1 }
      somar(contagem, 'lote', ((chamamento.get('lotes') ?? []) as unknown[]).length)
      for (const colecao of await referencia.listCollections()) {
        const documentos = await colecao.get()
        if (colecao.id === 'propostas') for (const p of documentos.docs) await contarProposta(p, contagem)
        else if (colecao.id === 'sessoes') somar(contagem, 'sessao', documentos.size)
        else if (colecao.id === 'desempates') somar(contagem, 'desempate', documentos.size)
        else somar(contagem, 'outro', documentos.size)
      }
      return contagem
    },
    apagar: () => db().recursiveDelete(referencia),
  }
}

export function alvoLote(chamamentoId: string, codigo: string): AlvoExclusao {
  const caminho = `chamamentos/${chamamentoId}`
  const doLote = async () => {
    const chamamento = await exigirExistente(db().doc(caminho))
    if (!((chamamento.get('lotes') ?? []) as { codigo: string }[]).some((l) => l.codigo === codigo)) {
      throw new ErroApi(404, MENSAGENS.naoEncontrado)
    }
    const [propostas, desempates] = await Promise.all([
      db().collection(`${caminho}/propostas`).where('loteCodigo', '==', codigo).get(),
      db().collection(`${caminho}/desempates`).where('loteCodigo', '==', codigo).get(),
    ])
    return { propostas: propostas.docs, desempates: desempates.docs }
  }
  return {
    async contar() {
      const { propostas, desempates } = await doLote()
      const contagem: Contagem = { lote: 1 }
      for (const p of propostas) await contarProposta(p, contagem)
      somar(contagem, 'desempate', desempates.length)
      return contagem
    },
    async apagar(autor) {
      const { propostas, desempates } = await doLote()
      await apagarTudo([...propostas, ...desempates].map((d) => d.ref))
      // O lote sai do chamamento e da pauta das sessões, na mesma transação.
      await gravar(autor, async (transacao) => {
        const chamamento = await transacao.get(db().doc(caminho))
        const sessoes = await transacao.get(db().collection(`${caminho}/sessoes`).where('lotes', 'array-contains', codigo))
        const lotes = ((chamamento.get('lotes') ?? []) as { codigo: string }[]).filter((l) => l.codigo !== codigo)
        return [
          { caminho, acao: 'editar', dados: { lotes } },
          ...sessoes.docs.map((s): Operacao => ({ caminho: s.ref.path, acao: 'editar', dados: { lotes: FieldValue.arrayRemove(codigo) } })),
        ]
      })
    },
  }
}

export function alvoOsc(cnpj: string): AlvoExclusao {
  const referencia = db().doc(`oscs/${cnpj}`)
  /** Sem consulta de grupo de coleções (exigiria índice): percorre os chamamentos. */
  const propostasDaOsc = async () => {
    const chamamentos = await db().collection('chamamentos').get()
    const consultas = await Promise.all(chamamentos.docs.map((c) => c.ref.collection('propostas').where('oscCnpj', '==', cnpj).get()))
    return consultas.flatMap((c) => c.docs)
  }
  return {
    async contar() {
      await exigirExistente(referencia)
      const contagem: Contagem = { osc: 1 }
      for (const p of await propostasDaOsc()) await contarProposta(p, contagem)
      return contagem
    },
    async apagar() {
      await apagarTudo((await propostasDaOsc()).map((p) => p.ref))
      await db().recursiveDelete(referencia)
    },
  }
}

// ---------- Sessão ----------

interface RegistrosDaSessao {
  porProposta: { propostaId: string; avaliacoes: QueryDocumentSnapshot[]; experiencias: QueryDocumentSnapshot[]; admissibilidade: boolean }[]
  desempates: QueryDocumentSnapshot[]
}

/** Tudo o que foi registrado com o sessaoId: níveis, experiências, admissibilidade e desempates. */
async function registrosDaSessao(chamamentoId: string, sessaoId: string): Promise<RegistrosDaSessao> {
  const caminho = `chamamentos/${chamamentoId}`
  const [propostas, desempates] = await Promise.all([
    db().collection(`${caminho}/propostas`).get(),
    db().collection(`${caminho}/desempates`).where('sessaoId', '==', sessaoId).get(),
  ])
  const porProposta = await Promise.all(
    propostas.docs.map(async (p) => {
      const [avaliacoes, experiencias] = await Promise.all([
        p.ref.collection('avaliacoes').where('sessaoId', '==', sessaoId).get(),
        p.ref.collection('experiencias').where('sessaoId', '==', sessaoId).get(),
      ])
      return {
        propostaId: p.id,
        avaliacoes: avaliacoes.docs,
        experiencias: experiencias.docs,
        admissibilidade: p.get('admissibilidade.sessaoId') === sessaoId,
      }
    }),
  )
  return {
    porProposta: porProposta.filter((p) => p.avaliacoes.length + p.experiencias.length > 0 || p.admissibilidade),
    desempates: desempates.docs,
  }
}

export function alvoSessao(chamamentoId: string, sessaoId: string): AlvoExclusao {
  const referencia = db().doc(`chamamentos/${chamamentoId}/sessoes/${sessaoId}`)
  return {
    async contar() {
      await exigirExistente(referencia)
      const { porProposta, desempates } = await registrosDaSessao(chamamentoId, sessaoId)
      const contagem: Contagem = { sessao: 1 }
      for (const p of porProposta) {
        if (p.admissibilidade) somar(contagem, 'admissibilidade')
        somar(contagem, 'avaliacao', p.avaliacoes.length)
        somar(contagem, 'experiencia', p.experiencias.length)
        somar(contagem, 'documento', p.experiencias.reduce((soma, e) => soma + quantosDocumentos(e), 0))
      }
      somar(contagem, 'desempate', desempates.length)
      return contagem
    },
    async apagar(autor) {
      await exigirExistente(referencia)
      const { porProposta, desempates } = await registrosDaSessao(chamamentoId, sessaoId)
      for (const p of porProposta) {
        const itens = [...p.avaliacoes, ...p.experiencias]
        await apagarTudo(itens.map((d) => d.ref))
        // Recalcula com o que sobrou e tira a admissibilidade registrada na sessão (desfaz a conclusão).
        await gravar(autor, async (transacao) => {
          if (itens.length === 0) {
            const dados = { admissibilidade: FieldValue.delete(), concluida: false }
            return [{ caminho: caminhoProposta(chamamentoId, p.propostaId), acao: 'editar', dados }]
          }
          const { operacoes } = await recalcular(transacao, chamamentoId, p.propostaId)
          if (!p.admissibilidade) return operacoes
          const [proposta, ...demais] = operacoes
          return [{ ...proposta!, dados: { ...proposta!.dados, admissibilidade: FieldValue.delete() } }, ...demais]
        })
      }
      await apagarTudo(desempates.map((d) => d.ref))
      await db().recursiveDelete(referencia)
    },
  }
}

// ---------- Itens da avaliação (transação com o recálculo da proposta) ----------

const caminhoProposta = (chamamentoId: string, propostaId: string) => `chamamentos/${chamamentoId}/propostas/${propostaId}`

async function exigirProposta(chamamentoId: string, propostaId: string): Promise<void> {
  if (!(await db().doc(caminhoProposta(chamamentoId, propostaId)).get()).exists) throw new ErroApi(404, MENSAGENS.propostaNaoEncontrada)
}

export function alvoExperiencia(chamamentoId: string, propostaId: string, id: string): AlvoExclusao {
  const caminho = `${caminhoProposta(chamamentoId, propostaId)}/experiencias/${id}`
  return {
    async contar() {
      await exigirProposta(chamamentoId, propostaId)
      const experiencia = await exigirExistente(db().doc(caminho))
      const contagem: Contagem = { experiencia: 1 }
      somar(contagem, 'documento', quantosDocumentos(experiencia))
      return contagem
    },
    apagar: (autor) =>
      gravar(autor, async (transacao) => {
        const { operacoes } = await recalcular(transacao, chamamentoId, propostaId, { colecao: 'experiencias', id, dados: null })
        return [{ caminho, acao: 'excluir' }, ...operacoes]
      }),
  }
}

export function alvoDocumento(chamamentoId: string, propostaId: string, id: string, indice: number): AlvoExclusao {
  const caminho = `${caminhoProposta(chamamentoId, propostaId)}/experiencias/${id}`
  const exigirDocumento = (experiencia: DocumentSnapshot) => {
    const documentos = (experiencia.get('documentos') ?? []) as unknown[]
    if (!experiencia.exists || indice >= documentos.length) throw new ErroApi(404, MENSAGENS.naoEncontrado)
    return documentos
  }
  return {
    async contar() {
      await exigirProposta(chamamentoId, propostaId)
      exigirDocumento(await db().doc(caminho).get())
      return { documento: 1 }
    },
    apagar: (autor) =>
      gravar(autor, async (transacao) => {
        const experiencia = await transacao.get(db().doc(caminho))
        const documentos = exigirDocumento(experiencia).filter((_, i) => i !== indice)
        const dados = { ...experiencia.data(), documentos }
        const { operacoes } = await recalcular(transacao, chamamentoId, propostaId, { colecao: 'experiencias', id, dados })
        return [{ caminho, acao: 'editar', dados: { documentos } }, ...operacoes]
      }),
  }
}

export function alvoNivel(chamamentoId: string, propostaId: string, codigo: string): AlvoExclusao {
  const caminho = `${caminhoProposta(chamamentoId, propostaId)}/avaliacoes/${codigo}`
  return {
    async contar() {
      await exigirProposta(chamamentoId, propostaId)
      await exigirExistente(db().doc(caminho))
      return { avaliacao: 1 }
    },
    apagar: (autor) =>
      gravar(autor, async (transacao) => {
        const { operacoes } = await recalcular(transacao, chamamentoId, propostaId, { colecao: 'avaliacoes', id: codigo, dados: null })
        return [{ caminho, acao: 'excluir' }, ...operacoes]
      }),
  }
}

// ---------- Prévia e exclusão ----------

export async function previaExclusao(alvo: AlvoExclusao): Promise<PreviaExclusao> {
  return previaDe(await alvo.contar())
}

/** Conta (404 se não existe), apaga e devolve o que foi apagado. */
export async function excluir(autor: Autor, alvo: AlvoExclusao): Promise<PreviaExclusao> {
  const contagem = await alvo.contar()
  await alvo.apagar(autor)
  return previaDe(contagem)
}
