// Matriz de avaliação no Firestore (matrizes/{versão}): a do código (src/domain/matriz/matriz_2026.json), com a
// assinatura SHA-256 do conteúdo para saber se a gravada está atual. Usado pela limpeza da base (recarregar a
// matriz) e pelo script seed-matriz.

import { createHash } from 'node:crypto'
import { FieldValue } from 'firebase-admin/firestore'
import { MATRIZ_2026, type Matriz } from '../../src/domain/matriz/index.js'
import type { SituacaoMatriz } from '../../src/esquemas/limpeza.js'
import { obterAdmin } from './admin.js'
import { atualizadoPor, type Autor } from './gravar.js'

export const ARQUIVO_MATRIZ = 'src/domain/matriz/matriz_2026.json'

/** SHA-256 do conteúdo da matriz (JSON na ordem do arquivo). */
export function assinaturaMatriz(matriz: Matriz = MATRIZ_2026): string {
  return createHash('sha256').update(JSON.stringify(matriz)).digest('hex')
}

const referencia = () => obterAdmin().db.doc(`matrizes/${MATRIZ_2026.versao}`)

export async function situacaoMatriz(): Promise<SituacaoMatriz> {
  const atual = await referencia().get()
  return { versao: MATRIZ_2026.versao, atual: atual.get('origem.sha256') === assinaturaMatriz() }
}

/** Grava a matriz do código em matrizes/{versão} se estiver ausente ou diferente. */
export async function recarregarMatriz(autor: Autor): Promise<{ versao: string; situacao: 'criada' | 'atualizada' | 'atual' }> {
  const ref = referencia()
  const sha256 = assinaturaMatriz()
  const situacao = await obterAdmin().db.runTransaction(async (transacao) => {
    const atual = await transacao.get(ref)
    if (atual.exists && atual.get('origem.sha256') === sha256) return 'atual' as const
    transacao.set(ref, {
      ...MATRIZ_2026,
      origem: { arquivo: ARQUIVO_MATRIZ, sha256 },
      publicadaEm: FieldValue.serverTimestamp(),
      atualizadoPor: atualizadoPor(autor),
      atualizadoEm: FieldValue.serverTimestamp(),
    })
    return atual.exists ? ('atualizada' as const) : ('criada' as const)
  })
  return { versao: MATRIZ_2026.versao, situacao }
}
