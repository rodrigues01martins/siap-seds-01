// POST /api/primeiro-admin — cria o PRIMEIRO administrador, sem terminal nem GitHub Actions.
// Só funciona enquanto não existir nenhum usuário com perfil admin (depois: 409) e só para o usuário
// logado cujo e-mail é igual a ADMIN_INICIAL_EMAIL (variável da Vercel; sem ela: 403).
// Define o claim perfil=admin, espelha em usuarios/{uid} e audita (como /api/perfis). Os demais perfis
// são dados pelo admin na tela Perfis de acesso (/api/perfis, C6).

import type { Auth } from 'firebase-admin/auth'
import { obterAdmin } from './_lib/admin.js'
import { ErroApi } from './_lib/erros.js'
import { gravar } from './_lib/gravar.js'
import { criarRota, json } from './_lib/http.js'
import { identificar } from './_lib/porteiro.js'

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

export const { GET, POST, PUT, PATCH, DELETE } = criarRota({
  POST: async (requisicao) => {
    const quem = await identificar(requisicao)
    const { auth, db } = obterAdmin()

    if (await existeAdmin(auth)) {
      throw new ErroApi(409, 'Já existe um administrador. Peça a ele o seu perfil na tela Perfis de acesso.')
    }
    const esperado = process.env.ADMIN_INICIAL_EMAIL?.trim().toLowerCase()
    if (!esperado || quem.email?.toLowerCase() !== esperado) {
      throw new ErroApi(403, 'Esta conta não é a do administrador inicial (ADMIN_INICIAL_EMAIL).')
    }

    const usuario = await auth.getUser(quem.uid)
    const claimsAnteriores = usuario.customClaims ?? {}
    await auth.setCustomUserClaims(quem.uid, { ...claimsAnteriores, perfil: 'admin' })
    try {
      const caminho = `usuarios/${quem.uid}`
      await gravar({ uid: quem.uid, email: quem.email, perfil: 'admin' }, async (transacao) => {
        const atual = await transacao.get(db.doc(caminho))
        return [{ caminho, acao: atual.exists ? 'editar' : 'criar', dados: { email: quem.email, perfil: 'admin' } }]
      })
    } catch (erro) {
      // Sem registro em auditoria, o claim não pode ficar aplicado.
      await auth.setCustomUserClaims(quem.uid, claimsAnteriores)
      throw erro
    }
    return json(200, { uid: quem.uid, email: quem.email, perfil: 'admin' })
  },
})
