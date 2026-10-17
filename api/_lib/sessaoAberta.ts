// Gravações da Comissão só em sessão aberta do chamamento (Etapa 4a): nível da D1, admissibilidade,
// experiências da D2 e desempate trazem o sessaoId, guardado no documento e na auditoria (base do reset).

import type { Transaction } from 'firebase-admin/firestore'
import { obterAdmin } from './admin.js'
import { ErroApi, MENSAGENS } from './erros.js'

/**
 * Lê a sessão na transação (encerrar a sessão conflita com a gravação): 409 se não existe ou não está
 * aberta e, quando há proposta, se o lote dela não está na pauta (lotes da sessão). Devolve o caminho da sessão.
 */
export async function exigirSessaoAberta(
  transacao: Transaction,
  chamamentoId: string,
  sessaoId: string,
  propostaId?: string,
): Promise<string> {
  const caminho = `chamamentos/${chamamentoId}/sessoes/${sessaoId}`
  const sessao = await transacao.get(obterAdmin().db.doc(caminho))
  if (sessao.get('status') !== 'aberta') throw new ErroApi(409, MENSAGENS.semSessaoAberta)
  if (propostaId !== undefined) {
    const proposta = await transacao.get(obterAdmin().db.doc(`chamamentos/${chamamentoId}/propostas/${propostaId}`))
    if (!((sessao.get('lotes') ?? []) as string[]).includes(proposta.get('loteCodigo') as string)) {
      throw new ErroApi(409, 'Proposta fora da pauta da sessão.')
    }
  }
  return caminho
}
