// Gravação única da /api: tudo em runTransaction, com um registro em auditoria/{id}
// por operação (quem: uid, e-mail e perfil admin/usuario), no mesmo commit. Bloqueia escrita em proposta homologada (bloqueada = true)
// e em registro em exclusão (status "excluindo", ver exclusao.ts): no próprio documento ou abaixo dele.

import { FieldValue, type Transaction } from 'firebase-admin/firestore'
import { obterAdmin } from './admin.js'
import { ErroApi, MENSAGENS } from './erros.js'
import type { Assinatura } from './porteiro.js'

/** Quem grava: basta a assinatura (uid, e-mail e perfil); o Autor do porteiro também serve. */
export type Autor = Assinatura

export interface Operacao {
  caminho: string
  /** restaurar: grava o documento exatamente como `dados` (sem dados = apaga); usado pelo reset da sessão. */
  acao: 'criar' | 'editar' | 'excluir' | 'restaurar'
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

/** Documentos que contêm `caminho`, inclusive ele mesmo (ex.: chamamentos/c, chamamentos/c/propostas/p). */
export function documentosDoCaminho(caminho: string): string[] {
  const partes = caminho.split('/')
  const documentos: string[] = []
  for (let i = 2; i <= partes.length; i += 2) documentos.push(partes.slice(0, i).join('/'))
  return documentos
}

/** Lança 409 se o documento estiver em exclusão. Use dentro da transação. */
export async function conferirForaDeExclusao(transacao: Transaction, caminhos: Iterable<string>): Promise<void> {
  const { db } = obterAdmin()
  const documentos = await Promise.all([...new Set(caminhos)].map((c) => transacao.get(db.doc(c))))
  if (documentos.some((d) => d.get('status') === 'excluindo')) throw new ErroApi(409, MENSAGENS.emExclusao)
}

function semIndefinidos(dados: Record<string, unknown> = {}): Record<string, unknown> {
  return Object.fromEntries(Object.entries(dados).filter(([, valor]) => valor !== undefined))
}

/** FieldValue.delete() apaga o campo no documento; no "depois" da auditoria o campo simplesmente some. */
function semCamposApagados(dados: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(dados).filter(([, v]) => !(v instanceof FieldValue && v.isEqual(FieldValue.delete()))))
}

/**
 * `preparar` roda dentro da transação: pode ler (validar referências) e devolve as operações.
 * Todas as leituras acontecem antes das escritas, como exige o Firestore.
 */
export async function gravar(
  autor: Autor,
  preparar: (transacao: Transaction) => Operacao[] | Promise<Operacao[]>,
  opcoes: {
    /** Só a reabertura (RF-18) escreve em proposta homologada; ela mesma confere a regra. */
    permitirPropostaHomologada?: boolean
    /** Sessão da Comissão em que a gravação acontece: vai para cada registro de auditoria (base do reset). */
    sessaoId?: string
    /** Ação registrada na auditoria no lugar da ação da operação (ex.: resetar_sessao) e campos extras. */
    auditoria?: { acao: string; extras?: Record<string, unknown> }
  } = {},
): Promise<void> {
  const { db } = obterAdmin()
  await db.runTransaction(async (transacao) => {
    const operacoes = await preparar(transacao)

    // Leituras: trava de homologação (B5) e estado atual de cada documento.
    const propostas = new Set(operacoes.map((op) => propostaDoCaminho(op.caminho)).filter((c) => c !== null))
    if (!opcoes.permitirPropostaHomologada) {
      for (const caminho of propostas) await conferirDesbloqueada(transacao, caminho)
    }
    // Trava de exclusão: registro "excluindo" (ou um documento acima dele) não aceita escrita.
    await conferirForaDeExclusao(transacao, operacoes.flatMap((op) => documentosDoCaminho(op.caminho)))
    const atuais = await Promise.all(operacoes.map((op) => transacao.get(db.doc(op.caminho))))

    // Escritas.
    operacoes.forEach((op, i) => {
      const atual = atuais[i]!
      const antes = atual.exists ? (atual.data() ?? null) : null
      const referencia = db.doc(op.caminho)
      const agora = FieldValue.serverTimestamp()
      const dados = semIndefinidos(op.dados)
      let depois: Record<string, unknown> | null

      if (op.acao === 'restaurar') {
        depois = op.dados ?? null
        if (op.dados) transacao.set(referencia, op.dados)
        else if (atual.exists) transacao.delete(referencia)
      } else if (op.acao === 'criar') {
        if (atual.exists) throw new ErroApi(409, MENSAGENS.jaExiste)
        depois = dados
        transacao.create(referencia, { ...dados, criadoEm: agora, atualizadoEm: agora })
      } else {
        if (!atual.exists) throw new ErroApi(404, MENSAGENS.naoEncontrado)
        if (op.acao === 'editar') {
          depois = semCamposApagados({ ...antes, ...dados })
          transacao.update(referencia, { ...dados, atualizadoEm: agora })
        } else {
          depois = null
          transacao.delete(referencia)
        }
      }

      transacao.create(db.collection('auditoria').doc(), {
        caminho: op.caminho,
        acao: opcoes.auditoria?.acao ?? op.acao,
        antes,
        depois,
        uid: autor.uid,
        email: autor.email,
        perfil: autor.perfil,
        ...(opcoes.sessaoId ? { sessaoId: opcoes.sessaoId } : {}),
        ...opcoes.auditoria?.extras,
        dataHora: agora,
      })
    })
  })
}
