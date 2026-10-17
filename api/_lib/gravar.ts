// Gravação única da /api: tudo em runTransaction. Sem auditoria detalhada (Simplificação 2/4): cada documento
// criado ou editado guarda só quem gravou por último (atualizadoPor: nome e e-mail) e quando (atualizadoEm).
// Não há trava de homologação nem de exclusão: a proposta concluída aceita escrita (a alteração desfaz a
// conclusão; ver recalcular.ts) e a exclusão é imediata (cascata.ts).

import { FieldValue, type Transaction } from 'firebase-admin/firestore'
import { obterAdmin } from './admin.js'
import { ErroApi, MENSAGENS } from './erros.js'
import type { Assinatura } from './porteiro.js'

/** Quem grava: basta a assinatura (uid, e-mail, perfil e nome); o Autor do porteiro também serve. */
export type Autor = Assinatura

export interface Operacao {
  caminho: string
  acao: 'criar' | 'editar' | 'excluir'
  dados?: Record<string, unknown>
}

/** O que fica em cada documento gravado: nome do cadastro (ou null) e e-mail de quem gravou por último. */
export function atualizadoPor(autor: Autor): { nome: string | null; email: string | null } {
  return { nome: autor.nome ?? null, email: autor.email }
}

function semIndefinidos(dados: Record<string, unknown> = {}): Record<string, unknown> {
  return Object.fromEntries(Object.entries(dados).filter(([, valor]) => valor !== undefined))
}

/**
 * `preparar` roda dentro da transação: pode ler (validar referências) e devolve as operações.
 * Todas as leituras acontecem antes das escritas, como exige o Firestore.
 */
export async function gravar(
  autor: Autor,
  preparar: (transacao: Transaction) => Operacao[] | Promise<Operacao[]>,
): Promise<void> {
  const { db } = obterAdmin()
  await db.runTransaction(async (transacao) => {
    const operacoes = await preparar(transacao)
    const atuais = await Promise.all(operacoes.map((op) => transacao.get(db.doc(op.caminho))))
    const autoria = { atualizadoPor: atualizadoPor(autor), atualizadoEm: FieldValue.serverTimestamp() }

    operacoes.forEach((op, i) => {
      const atual = atuais[i]!
      const referencia = db.doc(op.caminho)
      if (op.acao === 'criar') {
        if (atual.exists) throw new ErroApi(409, MENSAGENS.jaExiste)
        transacao.create(referencia, { ...semIndefinidos(op.dados), ...autoria })
        return
      }
      if (!atual.exists) throw new ErroApi(404, MENSAGENS.naoEncontrado)
      if (op.acao === 'editar') transacao.update(referencia, { ...semIndefinidos(op.dados), ...autoria })
      else transacao.delete(referencia)
    })
  })
}
