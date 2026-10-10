// POST /api/perfis (dar ou trocar perfil) e DELETE /api/perfis (remover). Perfil: admin.
// PUT /api/perfis: PRIMEIRO administrador, sem terminal. Só enquanto não existir nenhum usuário com perfil
// admin (depois: 409) e só para o usuário logado cujo e-mail é ADMIN_INICIAL_EMAIL (variável da Vercel;
// sem ela ou com outro e-mail: 403). Fica neste arquivo porque o plano Hobby da Vercel aceita no máximo
// 12 funções (api/_lib/limiteFuncoes.test.ts).
// Define o custom claim "perfil", espelha em usuarios/{uid} e audita.

import type { Auth } from 'firebase-admin/auth'

import { extrairPerfil, type Perfil } from '../src/domain/perfis.js'
import { PERMISSOES } from '../src/domain/permissoes.js'
import { esquemaDefinirPerfil, esquemaRemoverPerfil } from '../src/esquemas/cadastros.js'
import { obterAdmin } from './_lib/admin.js'
import { ErroApi } from './_lib/erros.js'
import { gravar, type Autor } from './_lib/gravar.js'
import { criarRota, json } from './_lib/http.js'
import { autenticar, identificar } from './_lib/porteiro.js'
import { lerCorpo } from './_lib/validacao.js'

async function aplicarPerfil(autor: Autor, emailAlvo: string, novo: Perfil | null): Promise<Response> {
  const { auth, db } = obterAdmin()
  const usuario = await auth.getUserByEmail(emailAlvo).catch((erro: { code?: string }) => {
    if (erro.code === 'auth/user-not-found') {
      throw new ErroApi(404, 'Usuário não encontrado no Firebase Authentication.')
    }
    throw erro
  })

  if (usuario.uid === autor.uid && novo !== 'admin') {
    throw new ErroApi(409, 'Você não pode remover o seu próprio perfil de administrador.')
  }

  const claimsAnteriores = usuario.customClaims ?? {}
  const claims: Record<string, unknown> = { ...claimsAnteriores }
  if (novo) claims.perfil = novo
  else delete claims.perfil
  await auth.setCustomUserClaims(usuario.uid, claims)

  try {
    const caminho = `usuarios/${usuario.uid}`
    await gravar(autor, async (transacao) => {
      const atual = await transacao.get(db.doc(caminho))
      return [{ caminho, acao: atual.exists ? 'editar' : 'criar', dados: { email: emailAlvo, perfil: novo } }]
    })
  } catch (erro) {
    // Sem registro em auditoria, o claim não pode ficar aplicado.
    await auth.setCustomUserClaims(usuario.uid, claimsAnteriores)
    throw erro
  }

  // Ao remover o acesso, encerra as sessões: o porteiro passa a recusar o token atual.
  if (!novo && extrairPerfil(claimsAnteriores)) await auth.revokeRefreshTokens(usuario.uid)

  return json(200, { uid: usuario.uid, email: emailAlvo, perfil: novo })
}

export const { GET, POST, PUT, PATCH, DELETE } = criarRota({
  POST: async (requisicao) => {
    const autor = await autenticar(requisicao, PERMISSOES.perfis)
    const dados = await lerCorpo(requisicao, esquemaDefinirPerfil)
    return aplicarPerfil(autor, dados.email, dados.perfil)
  },

  DELETE: async (requisicao) => {
    const autor = await autenticar(requisicao, PERMISSOES.perfis)
    const dados = await lerCorpo(requisicao, esquemaRemoverPerfil)
    return aplicarPerfil(autor, dados.email, null)
  },

  PUT: async (requisicao) => {
    const quem = await identificar(requisicao)
    const { auth } = obterAdmin()
    if (await existeAdmin(auth)) {
      throw new ErroApi(409, 'Já existe um administrador. Peça a ele o seu perfil na tela Perfis de acesso.')
    }
    const esperado = process.env.ADMIN_INICIAL_EMAIL?.trim().toLowerCase()
    if (!esperado || !quem.email || quem.email.toLowerCase() !== esperado) {
      throw new ErroApi(403, 'Esta conta não é a do administrador inicial (ADMIN_INICIAL_EMAIL).')
    }
    // O próprio usuário é o autor do registro de auditoria, já como admin.
    return aplicarPerfil({ uid: quem.uid, email: quem.email, perfil: 'admin' }, quem.email, 'admin')
  },
})

/** Algum usuário do Firebase Authentication já tem o claim perfil=admin? */
async function existeAdmin(auth: Auth): Promise<boolean> {
  let pagina: string | undefined
  do {
    const lista = await auth.listUsers(1000, pagina)
    if (lista.users.some((u) => u.customClaims?.perfil === 'admin')) return true
    pagina = lista.pageToken
  } while (pagina)
  return false
}
