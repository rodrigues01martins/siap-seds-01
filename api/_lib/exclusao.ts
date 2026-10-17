// Exclusão de cadastros (chamamento, OSC, proposta). Esboço: implementação no commit feat:.

import type { DocumentReference, Transaction } from 'firebase-admin/firestore'
import type { Autor } from './gravar.js'

/** Motivo que impede a exclusão; `itens` lista os registros que a impedem. */
export interface Bloqueio {
  mensagem: string
  itens: string[]
}

/** Lê um documento ou coleção: dentro da transação (exclusão) ou fora dela (prévia). */
export type Leitor = Pick<Transaction, 'get'>

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

const pendente = (): never => {
  throw new Error('não implementado')
}

export function alvoProposta(_chamamentoId: string, _propostaId: string): AlvoExclusao {
  return pendente()
}

export function alvoOsc(_cnpj: string): AlvoExclusao {
  return pendente()
}

export function alvoChamamento(_id: string): AlvoExclusao {
  return pendente()
}

export async function previaExclusao(_alvo: AlvoExclusao): Promise<Previa> {
  return pendente()
}

export async function excluirComSeguranca(
  _autor: Autor,
  _alvo: AlvoExclusao,
  _justificativa: string,
  _opcoes: { apagar?: (referencia: DocumentReference) => Promise<void> } = {},
): Promise<ResultadoExclusao> {
  return pendente()
}
