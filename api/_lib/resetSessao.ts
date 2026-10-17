// Reset da sessão da Comissão. Esboço: implementação no commit feat:.

import type { Autor } from './gravar.js'

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

const pendente = (): never => {
  throw new Error('não implementado')
}

export async function previaReset(_chamamentoId: string, _sessaoId: string): Promise<PreviaReset> {
  return pendente()
}

export async function executarReset(
  _autor: Autor,
  _chamamentoId: string,
  _sessaoId: string,
  _justificativa: string,
  _opcoes: OpcoesReset = {},
): Promise<ResultadoReset> {
  return pendente()
}
