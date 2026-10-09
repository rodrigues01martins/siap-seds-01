// Gravação única da /api: tudo em runTransaction, com um registro em auditoria/{id}
// por operação, no mesmo commit. Bloqueia escrita em proposta homologada (bloqueada = true).

import { FieldValue, type Transaction } from 'firebase-admin/firestore'
import { obterAdmin } from './admin.js'
import { ErroApi, MENSAGENS } from './erros.js'
import type { Autor } from './porteiro.js'

export type { Autor }

export interface Operacao {
  caminho: string
  acao: 'criar' | 'editar' | 'excluir'
  dados?: Record<string, unknown>
}

/** Caminho da proposta que contém `caminho` (ela própria ou suas subcoleções), se houver. */
export function propostaDoCaminho(caminho: string): string | null {
  return /^(chamamentos\/[^/]+\/propostas\/[^/]+)(\/.*)?$/.exec(caminho)?.[1] ?? null
}

/** Lança 409 se a proposta estiver homologada. Use dentro da transação. */
export async function conferirDesbloqueada(transacao: Transaction, caminhoProposta: string): Promise<void> {
  const proposta = await transacao.get(obterAdmin().db.doc(caminhoProposta))
  if (proposta.exists && proposta.get('bloqueada') === true) throw new ErroApi(409, MENSAGENS.homologada)
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
  /** Só a reabertura (RF-18) escreve em proposta homologada; ela mesma confere a regra. */
  opcoes: { permitirPropostaHomologada?: boolean } = {},
): Promise<void> {
  const { db } = obterAdmin()
  await db.runTransaction(async (transacao) => {
    const operacoes = await preparar(transacao)

    // Leituras: trava de homologação (B5) e estado atual de cada documento.
    const propostas = new Set(operacoes.map((op) => propostaDoCaminho(op.caminho)).filter((c) => c !== null))
    if (!opcoes.permitirPropostaHomologada) {
      for (const caminho of propostas) await conferirDesbloqueada(transacao, caminho)
    }
    const atuais = await Promise.all(operacoes.map((op) => transacao.get(db.doc(op.caminho))))

    // Escritas.
    operacoes.forEach((op, i) => {
      const atual = atuais[i]!
      const antes = atual.exists ? (atual.data() ?? null) : null
      const referencia = db.doc(op.caminho)
      const agora = FieldValue.serverTimestamp()
      const dados = semIndefinidos(op.dados)
      let depois: Record<string, unknown> | null

      if (op.acao === 'criar') {
        if (atual.exists) throw new ErroApi(409, MENSAGENS.jaExiste)
        depois = dados
        transacao.create(referencia, { ...dados, criadoEm: agora, atualizadoEm: agora })
      } else {
        if (!atual.exists) throw new ErroApi(404, MENSAGENS.naoEncontrado)
        if (op.acao === 'editar') {
          depois = { ...antes, ...dados }
          transacao.update(referencia, { ...dados, atualizadoEm: agora })
        } else {
          depois = null
          transacao.delete(referencia)
        }
      }

      transacao.create(db.collection('auditoria').doc(), {
        caminho: op.caminho,
        acao: op.acao,
        antes,
        depois,
        uid: autor.uid,
        perfil: autor.perfil,
        dataHora: agora,
      })
    })
  })
}
