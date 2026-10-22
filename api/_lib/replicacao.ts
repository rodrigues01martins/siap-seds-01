// "Replicar para outro lote" (D2) no servidor, chamado por /api/experiencia (sem nova função na Vercel).
// Origem e destino: propostas do MESMO chamamento (o caminho já garante), da MESMA OSC e de lotes DIFERENTES; destino
// omitido = a proposta da OSC no outro lote. A cópia (src/domain/replicacaoD2.ts) leva só os dados cadastrais e
// documentais — documentos com aceito = false, sem desconsiderações, ids novos e o sessaoId do destino — e não
// duplica experiências equivalentes já presentes no destino. Tudo numa transação com o recálculo da D2 do destino:
// a transação lê e grava o documento da proposta de destino, então requisições simultâneas são serializadas (a
// segunda relê o destino e não duplica). A origem só é lida. Nada copiado = nada gravado (a conclusão do destino fica).

import type { DocumentReference, DocumentSnapshot, Query, QuerySnapshot, Transaction } from 'firebase-admin/firestore'
import { problemasDaExperiencia } from '../../src/domain/d2.js'
import { copiaParaOutroLote, planejarReplicacao, type ExperienciaParaReplicar } from '../../src/domain/replicacaoD2.js'
import { camposDoErro } from '../../src/esquemas/base.js'
import {
  esquemaCamposExperiencia,
  paraExperiencia,
  type PreviaReplicacao,
  type ResultadoReplicacao,
} from '../../src/esquemas/experiencia.js'
import { obterAdmin } from './admin.js'
import { ErroApi, MENSAGENS } from './erros.js'
import { gravar, type Autor, type Operacao } from './gravar.js'
import { exigirPropostaEditavel, recalcular, type Mudanca } from './recalcular.js'
import { exigirSessaoAberta } from './sessaoAberta.js'

/** Uma transação grava no máximo 500 documentos; sobram 2 para os totais e a memória da D2. */
const LIMITE_COPIAS = 400

interface Leitor {
  doc(ref: DocumentReference): Promise<DocumentSnapshot>
  consulta(q: Query): Promise<QuerySnapshot>
}

const leitorDireto: Leitor = { doc: (ref) => ref.get(), consulta: (q) => q.get() }
const leitorDaTransacao = (t: Transaction): Leitor => ({ doc: (ref) => t.get(ref), consulta: (q) => t.get(q) })

const caminhoProposta = (ch: string, p: string) => `chamamentos/${ch}/propostas/${p}`

interface Par {
  origem: DocumentSnapshot
  destino: DocumentSnapshot
}

/** Origem e destino conferidos: mesmo chamamento, mesma OSC, lotes diferentes. */
async function resolverPar(ler: Leitor, ch: string, p: string, destinoId?: string): Promise<Par> {
  const { db } = obterAdmin()
  const origem = await ler.doc(db.doc(caminhoProposta(ch, p)))
  if (!origem.exists) throw new ErroApi(404, MENSAGENS.propostaNaoEncontrada)
  const osc = origem.get('oscCnpj') as string
  const lote = origem.get('loteCodigo') as string

  if (destinoId) {
    const destino = await ler.doc(db.doc(caminhoProposta(ch, destinoId)))
    if (!destino.exists) throw new ErroApi(404, 'Proposta de destino não encontrada neste chamamento.')
    if (destino.get('oscCnpj') !== osc) throw new ErroApi(409, 'A proposta de destino é de outra OSC.')
    if (destino.get('loteCodigo') === lote) throw new ErroApi(409, 'A proposta de destino precisa ser de outro lote.')
    return { origem, destino }
  }
  const mesmaOsc = await ler.consulta(db.collection(`chamamentos/${ch}/propostas`).where('oscCnpj', '==', osc))
  const candidatas = mesmaOsc.docs.filter((d) => d.get('loteCodigo') !== lote)
  if (candidatas.length === 0) throw new ErroApi(409, 'Não há proposta desta OSC em outro lote deste chamamento.')
  if (candidatas.length > 1) throw new ErroApi(409, 'Há mais de uma proposta desta OSC em outros lotes: escolha a proposta de destino.')
  return { origem, destino: candidatas[0]! }
}

type ExperienciaLida = ExperienciaParaReplicar & Record<string, unknown> & { id: string }

async function lerExperiencias(ler: Leitor, ch: string, p: string): Promise<ExperienciaLida[]> {
  const lista = await ler.consulta(obterAdmin().db.collection(`${caminhoProposta(ch, p)}/experiencias`))
  return lista.docs
    .map((d) => ({ ...(d.data() as Record<string, unknown>), id: d.id }) as ExperienciaLida)
    .sort((a, b) => String(a.inicio ?? '').localeCompare(String(b.inicio ?? '')) || a.id.localeCompare(b.id))
}

/** Prévia: o que a replicação faria agora, sem gravar nada. */
export async function previaReplicacao(ch: string, p: string, destinoId?: string): Promise<PreviaReplicacao> {
  const { origem, destino } = await resolverPar(leitorDireto, ch, p, destinoId)
  const [daOrigem, doDestino, osc] = await Promise.all([
    lerExperiencias(leitorDireto, ch, origem.id),
    lerExperiencias(leitorDireto, ch, destino.id),
    obterAdmin().db.doc(`oscs/${origem.get('oscCnpj') as string}`).get(),
  ])
  const plano = planejarReplicacao(daOrigem, doDestino)
  return {
    osc: { cnpj: origem.get('oscCnpj') as string, razaoSocial: (osc.get('razaoSocial') as string | undefined) ?? null },
    origem: { propostaId: origem.id, lote: origem.get('loteCodigo') as string },
    destino: { propostaId: destino.id, lote: destino.get('loteCodigo') as string },
    experiencias: daOrigem.length,
    documentos: daOrigem.reduce((soma, e) => soma + (e.documentos?.length ?? 0), 0),
    copiar: plano.copiar.length,
    equivalentes: plano.equivalentes,
    existentesNoDestino: doDestino.length,
  }
}

/** Cópia validada com o mesmo esquema e as mesmas regras de domínio do cadastro (sem cópia parcial). */
function validarCopia(experiencia: ExperienciaLida): Record<string, unknown> {
  const nome = String(experiencia.descricao ?? experiencia.id)
  const resultado = esquemaCamposExperiencia.safeParse(copiaParaOutroLote(experiencia))
  const problemas = resultado.success
    ? problemasDaExperiencia(paraExperiencia(experiencia.id, resultado.data))
    : camposDoErro(resultado.error)
  const primeiro = Object.values(problemas)[0]
  if (!resultado.success || primeiro) {
    throw new ErroApi(409, `Não é possível replicar “${nome}”: ${primeiro ?? 'dados inválidos'} Corrija a experiência na origem e tente de novo.`)
  }
  return resultado.data
}

export async function replicarExperiencias(
  autor: Autor,
  pedido: { chamamentoId: string; propostaId: string; sessaoId: string; propostaDestinoId?: string },
): Promise<ResultadoReplicacao> {
  const { chamamentoId: ch, propostaId, sessaoId, propostaDestinoId } = pedido
  const { db } = obterAdmin()
  let resultado: ResultadoReplicacao | undefined

  await gravar(autor, async (transacao) => {
    const ler = leitorDaTransacao(transacao)
    const { destino } = await resolverPar(ler, ch, propostaId, propostaDestinoId)
    await exigirPropostaEditavel(transacao, ch, destino.id)
    await exigirSessaoAberta(transacao, ch, sessaoId, destino.id)

    const [daOrigem, doDestino] = await Promise.all([lerExperiencias(ler, ch, propostaId), lerExperiencias(ler, ch, destino.id)])
    if (daOrigem.length === 0) throw new ErroApi(409, 'A proposta de origem não tem experiências para replicar.')
    const plano = planejarReplicacao(daOrigem, doDestino)
    if (plano.copiar.length > LIMITE_COPIAS) {
      throw new ErroApi(409, `São ${plano.copiar.length} experiências a copiar; o limite por replicação é ${LIMITE_COPIAS}.`)
    }

    const colecao = `${caminhoProposta(ch, destino.id)}/experiencias`
    const copias = plano.copiar.map((e) => ({ id: db.collection(colecao).doc().id, dados: { ...validarCopia(e), sessaoId } }))
    const base = { propostaDestinoId: destino.id, copiadas: copias.length, equivalentes: plano.equivalentes, existentesNoDestino: doDestino.length }
    if (copias.length === 0) {
      resultado = { ...base, totais: destino.get('totais') ?? null }
      return []
    }

    const mudancas: Mudanca[] = copias.map((c) => ({ colecao: 'experiencias', id: c.id, dados: c.dados }))
    const recalculo = await recalcular(transacao, ch, destino.id, mudancas)
    resultado = { ...base, totais: recalculo.totais }
    const criacoes: Operacao[] = copias.map((c) => ({ caminho: `${colecao}/${c.id}`, acao: 'criar', dados: c.dados }))
    return [...criacoes, ...recalculo.operacoes]
  })
  return resultado!
}
