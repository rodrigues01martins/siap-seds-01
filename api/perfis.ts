// POST /api/perfis (dar ou trocar perfil) e DELETE /api/perfis (remover). Perfil: admin.
// Define o custom claim "perfil", espelha em usuarios/{uid} e audita.

import { z } from 'zod'
import { PERFIS, extrairPerfil, type Perfil } from '../src/domain/perfis.js'
import { PERMISSOES } from '../src/domain/permissoes.js'
import { obterAdmin } from './_lib/admin.js'
import { ErroApi } from './_lib/erros.js'
import { gravar, type Autor } from './_lib/gravar.js'
import { criarRota, json } from './_lib/http.js'
import { autenticar } from './_lib/porteiro.js'
import { lerCorpo } from './_lib/validacao.js'

const email = z
  .email({ error: 'Informe um e-mail válido.' })
  .transform((valor) => valor.trim().toLowerCase())

const esquemaDefinir = z.strictObject({
  email,
  perfil: z.enum(PERFIS, { error: `Perfil inválido. Use: ${PERFIS.join(', ')}.` }),
})

const esquemaRemover = z.strictObject({ email })

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
    const dados = await lerCorpo(requisicao, esquemaDefinir)
    return aplicarPerfil(autor, dados.email, dados.perfil)
  },

  DELETE: async (requisicao) => {
    const autor = await autenticar(requisicao, PERMISSOES.perfis)
    const dados = await lerCorpo(requisicao, esquemaRemover)
    return aplicarPerfil(autor, dados.email, null)
  },
})
