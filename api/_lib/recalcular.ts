// C4: recálculo dos totais da proposta dentro da MESMA transação da alteração,
// usando apenas src/domain (consolidarProposta = calcularD1 + calcularD2).
// Toda alteração na avaliação (nível, experiência, documento) desfaz a conclusão da proposta (concluida = false):
// o documento final só sai de proposta concluída com os dados que estão gravados.

import type { Transaction } from 'firebase-admin/firestore'
import type { NiveisD1 } from '../../src/domain/d1.js'
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
 * Lê avaliações, experiências e a data limite, aplica a mudança em memória (se houver) e devolve as
 * operações que gravam `totais` na proposta e `resultadoD2/atual` (com a memória de cálculo).
 */
export async function recalcular(
  transacao: Transaction,
  chamamentoId: string,
  propostaId: string,
  mudanca?: Mudanca | Mudanca[],
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

  // Nível null (rascunho do salvamento automático, só com justificativa) = subcritério ainda pendente.
  const niveis: NiveisD1 = Object.fromEntries(avaliacoes.docs.map((d) => [d.id, d.get('nivel') as number | null]))
  const porId = new Map(experiencias.docs.map((d) => [d.id, paraExperiencia(d.id, d.data())]))

  // Sem mudança: só recalcula com o que está gravado (ex.: depois da exclusão de uma sessão). Várias mudanças:
  // ex.: as experiências copiadas de uma vez pela replicação para o outro lote.
  for (const m of mudanca === undefined ? [] : Array.isArray(mudanca) ? mudanca : [mudanca]) {
    if (m.colecao === 'avaliacoes') {
      if (m.dados) niveis[m.id] = m.dados.nivel as number | null
      else delete niveis[m.id]
    } else if (m.dados) {
      porId.set(m.id, paraExperiencia(m.id, m.dados))
    } else {
      porId.delete(m.id)
    }
  }

  // Ordem estável (início, id): a memória de cálculo lista as experiências nessa ordem.
  const lista = [...porId.values()].sort((a, b) => a.inicio.localeCompare(b.inicio) || a.id.localeCompare(b.id))
  const { totais, resultadoD2 } = consolidarProposta({ niveis, experiencias: lista, dataLimite })

  return {
    totais,
    operacoes: [
      { caminho, acao: 'editar', dados: { totais, concluida: false } },
      {
        caminho: `${caminho}/resultadoD2/atual`,
        acao: resultado.exists ? 'editar' : 'criar',
        dados: resultadoD2 as unknown as Record<string, unknown>,
      },
    ],
  }
}

/**
 * Lê a proposta (404 se não existe) e recusa, antes de qualquer validação, se a admissibilidade a deixou
 * fora da avaliação (não admitida ou desclassificada) — 409.
 */
export async function exigirPropostaEditavel(
  transacao: Transaction,
  chamamentoId: string,
  propostaId: string,
): Promise<void> {
  const proposta = await transacao.get(obterAdmin().db.doc(`chamamentos/${chamamentoId}/propostas/${propostaId}`))
  if (!proposta.exists) throw new ErroApi(404, MENSAGENS.propostaNaoEncontrada)
  const admissao = proposta.get('admissibilidade.situacao') as string | undefined
  if (admissao === 'nao_admitida' || admissao === 'desclassificada') throw new ErroApi(409, MENSAGENS.naoAdmitida)
}
