// C4: recálculo dos totais da proposta dentro da MESMA transação da alteração,
// usando apenas src/domain (consolidarProposta = calcularD1 + calcularD2).

import type { Transaction } from 'firebase-admin/firestore'
import { consolidarProposta, type TotaisProposta } from '../../src/domain/proposta.js'
import { paraExperiencia } from '../../src/esquemas/experiencia.js'
import { obterAdmin } from './admin.js'
import { ErroApi, MENSAGENS } from './erros.js'
import type { Operacao } from './gravar.js'

/** Documento de avaliação ou de experiência que está sendo gravado (null = excluído). */
export interface Mudanca {
  colecao: 'avaliacoes' | 'experiencias'
  id: string
  dados: Record<string, unknown> | null
}

/**
 * Lê avaliações, experiências e a data limite, aplica a mudança em memória e devolve as
 * operações que gravam `totais` na proposta e `resultadoD2/atual` (com a memória de cálculo).
 */
export async function recalcular(
  transacao: Transaction,
  chamamentoId: string,
  propostaId: string,
  mudanca: Mudanca,
): Promise<{ operacoes: Operacao[]; totais: TotaisProposta }> {
  const { db } = obterAdmin()
  const caminho = `chamamentos/${chamamentoId}/propostas/${propostaId}`
  const [chamamento, avaliacoes, experiencias, resultado] = await Promise.all([
    transacao.get(db.doc(`chamamentos/${chamamentoId}`)),
    transacao.get(db.collection(`${caminho}/avaliacoes`)),
    transacao.get(db.collection(`${caminho}/experiencias`)),
    transacao.get(db.doc(`${caminho}/resultadoD2/atual`)),
  ])

  const dataLimite = chamamento.get('dataLimitePropostas') as unknown
  if (typeof dataLimite !== 'string') {
    throw new ErroApi(409, 'Chamamento sem data limite das propostas: cadastre-a antes de avaliar.')
  }

  const niveis: Record<string, number> = Object.fromEntries(avaliacoes.docs.map((d) => [d.id, d.get('nivel') as number]))
  const porId = new Map(experiencias.docs.map((d) => [d.id, paraExperiencia(d.id, d.data())]))

  if (mudanca.colecao === 'avaliacoes') {
    if (mudanca.dados) niveis[mudanca.id] = mudanca.dados.nivel as number
    else delete niveis[mudanca.id]
  } else if (mudanca.dados) {
    porId.set(mudanca.id, paraExperiencia(mudanca.id, mudanca.dados))
  } else {
    porId.delete(mudanca.id)
  }

  // Ordem estável (início, id): a memória de cálculo lista as experiências nessa ordem.
  const lista = [...porId.values()].sort((a, b) => a.inicio.localeCompare(b.inicio) || a.id.localeCompare(b.id))
  const { totais, resultadoD2 } = consolidarProposta({ niveis, experiencias: lista, dataLimite })

  return {
    totais,
    operacoes: [
      { caminho, acao: 'editar', dados: { totais } },
      {
        caminho: `${caminho}/resultadoD2/atual`,
        acao: resultado.exists ? 'editar' : 'criar',
        dados: resultadoD2 as unknown as Record<string, unknown>,
      },
    ],
  }
}

/** Lê a proposta (404 se não existe) e recusa se homologada (409), antes de qualquer validação. */
export async function exigirPropostaEditavel(
  transacao: Transaction,
  chamamentoId: string,
  propostaId: string,
): Promise<void> {
  const proposta = await transacao.get(obterAdmin().db.doc(`chamamentos/${chamamentoId}/propostas/${propostaId}`))
  if (!proposta.exists) throw new ErroApi(404, MENSAGENS.propostaNaoEncontrada)
  if (proposta.get('bloqueada') === true) throw new ErroApi(409, MENSAGENS.homologada)
}
