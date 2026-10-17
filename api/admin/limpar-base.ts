// /api/admin/limpar-base — limpeza da base para começar do zero (Simplificação 4/4). Só o perfil admin.
// GET ?simular=true: prévia — documentos que serão apagados por coleção (subcoleções dos chamamentos somadas
//   pelo nome), os outros usuários, o ambiente (DEV ou PRODUÇÃO, pelo projectId) e se a matriz está atual.
// POST { acao: 'limpar', confirmacao: 'APAGAR TUDO', projectId, removerUsuarios? }: apaga recursivamente toda
//   coleção da raiz (chamamentos com lotes, sessões, propostas e subcoleções; oscs; as obsoletas — auditoria,
//   diligencias, permissoes… — e qualquer outra que o código não usa mais), menos matrizes/ e usuarios/. Com
//   removerUsuarios, tira do Firebase Auth e de usuarios/ todos, menos o admin que executa. No fim, garante a
//   matriz atual em matrizes/{versão}. projectId diferente do servidor → 409 (a prévia era de outro ambiente).
//   Interrompida (tempo da função), basta repetir: o que já foi apagado não volta.
// POST { acao: 'recarregar-matriz' }: regrava matrizes/{versão} a partir de src/domain/matriz/matriz_2026.json.

import type { CollectionReference } from 'firebase-admin/firestore'
import { esquemaLimparBase, esquemaPreviaLimpeza, type PreviaLimpeza, type ResultadoLimpeza } from '../../src/esquemas/limpeza.js'
import { obterAdmin } from '../_lib/admin.js'
import { ambienteDoProjeto } from '../_lib/ambiente.js'
import { ErroApi } from '../_lib/erros.js'
import { criarRota, json } from '../_lib/http.js'
import { recarregarMatriz, situacaoMatriz } from '../_lib/matriz.js'
import { autenticar } from '../_lib/porteiro.js'
import { lerConsulta, lerCorpo } from '../_lib/validacao.js'

/** Coleções da raiz que a limpeza não apaga (os cadastros só saem com removerUsuarios). */
const PRESERVADAS = ['matrizes', 'usuarios']
/** Coleções com subcoleções no modelo do app: contadas documento a documento. */
const COM_SUBCOLECOES = ['chamamentos']

const somar = (itens: Record<string, number>, colecao: string, n: number) => {
  if (n > 0) itens[colecao] = (itens[colecao] ?? 0) + n
}

async function contarComSubcolecoes(colecao: CollectionReference, itens: Record<string, number>): Promise<void> {
  const documentos = await colecao.select().get()
  somar(itens, colecao.id, documentos.size)
  for (const documento of documentos.docs) {
    for (const sub of await documento.ref.listCollections()) await contarComSubcolecoes(sub, itens)
  }
}

async function colecoesParaApagar(): Promise<CollectionReference[]> {
  return (await obterAdmin().db.listCollections()).filter((c) => !PRESERVADAS.includes(c.id))
}

async function contar(): Promise<{ itens: Record<string, number>; total: number }> {
  const itens: Record<string, number> = {}
  for (const colecao of await colecoesParaApagar()) {
    if (COM_SUBCOLECOES.includes(colecao.id)) await contarComSubcolecoes(colecao, itens)
    else somar(itens, colecao.id, (await colecao.count().get()).data().count)
  }
  return { itens, total: Object.values(itens).reduce((a, b) => a + b, 0) }
}

/** Contas do Authentication, menos a de quem executa. */
async function outrasContas(uid: string): Promise<string[]> {
  const { auth } = obterAdmin()
  const uids: string[] = []
  let pagina: string | undefined
  do {
    const lista = await auth.listUsers(1000, pagina)
    uids.push(...lista.users.map((u) => u.uid).filter((u) => u !== uid))
    pagina = lista.pageToken
  } while (pagina)
  return uids
}

async function outrosCadastros(uid: string) {
  return (await obterAdmin().db.collection('usuarios').get()).docs.filter((d) => d.id !== uid)
}

export const { GET, POST, PUT, PATCH, DELETE } = criarRota({
  GET: async (requisicao) => {
    const autor = await autenticar(requisicao, 'admin')
    lerConsulta(requisicao, esquemaPreviaLimpeza)
    const { projectId } = obterAdmin().app.options as { projectId: string }
    const [{ itens, total }, cadastros, contas, matriz] = await Promise.all([
      contar(),
      outrosCadastros(autor.uid),
      outrasContas(autor.uid),
      situacaoMatriz(),
    ])
    const previa: PreviaLimpeza = {
      projectId,
      ambiente: ambienteDoProjeto(projectId),
      itens,
      total,
      usuarios: { cadastros: cadastros.length, contas: contas.length },
      matriz,
    }
    return json(200, previa)
  },

  POST: async (requisicao) => {
    const autor = await autenticar(requisicao, 'admin')
    const pedido = await lerCorpo(requisicao, esquemaLimparBase)
    if (pedido.acao === 'recarregar-matriz') return json(200, { matriz: await recarregarMatriz(autor) })

    const { db, auth, app } = obterAdmin()
    const { projectId } = app.options as { projectId: string }
    if (pedido.projectId !== projectId) {
      throw new ErroApi(409, `A prévia era de "${pedido.projectId}", mas este servidor grava em "${projectId}". Recarregue a tela.`)
    }

    const { itens, total } = await contar()
    for (const colecao of await colecoesParaApagar()) await db.recursiveDelete(colecao)

    let usuariosRemovidos = 0
    if (pedido.removerUsuarios) {
      const contas = await outrasContas(autor.uid)
      for (let i = 0; i < contas.length; i += 1000) await auth.deleteUsers(contas.slice(i, i + 1000))
      const cadastros = await outrosCadastros(autor.uid)
      await Promise.all(cadastros.map((d) => d.ref.delete()))
      usuariosRemovidos = new Set([...contas, ...cadastros.map((d) => d.id)]).size
    }

    const resultado: ResultadoLimpeza = { itens, total, usuariosRemovidos, matriz: await recarregarMatriz(autor) }
    return json(200, resultado)
  },
})
