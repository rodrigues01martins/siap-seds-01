// /api/usuarios — gestão de usuários (tela Usuários). Cadastro em usuarios/{uid}: nome, e-mail, admin,
// permissoes, ativo e papel na Comissão (comissao). Tudo com histórico (auditoria).
// POST (administrador): novo usuário. Cria a conta no Firebase Authentication com senha aleatória; o app
//   envia em seguida o e-mail "redefinir senha" do Firebase, com que a pessoa cria a própria senha.
// PATCH (administrador): permissões, administrador, nome, papel e ativo. Desativar bloqueia a conta no
//   Authentication e encerra as sessões. Ninguém tira o próprio acesso de administrador nem se desativa.
// PUT (qualquer conta logada): primeiro acesso. Conta sem acesso (sem cadastro ou com cadastro antigo, do
//   modelo de perfis), e-mail em api/_lib/adminsIniciais.ts e nenhum administrador no projeto → vira
//   administrador. Quem já tem acesso recebe 200 sem mudança.

import { randomBytes } from 'node:crypto'
import { podeLer } from '../src/domain/permissoes.js'
import { esquemaAlterarUsuario, esquemaNovoUsuario } from '../src/esquemas/usuarios.js'
import { obterAdmin } from './_lib/admin.js'
import { ADMINS_INICIAIS } from './_lib/adminsIniciais.js'
import { ErroApi } from './_lib/erros.js'
import { gravar } from './_lib/gravar.js'
import { criarRota, json } from './_lib/http.js'
import { autenticar, identificar } from './_lib/porteiro.js'
import { lerCorpo } from './_lib/validacao.js'

const SEM_ACESSO = 'Sua conta ainda não tem acesso. Peça ao administrador que a libere na tela Usuários.'

/** Conta do Authentication com este e-mail, ou null. */
async function contaPorEmail(email: string) {
  return obterAdmin()
    .auth.getUserByEmail(email)
    .catch((erro: { code?: string }) => {
      if (erro.code === 'auth/user-not-found') return null
      throw erro
    })
}

export const { GET, POST, PUT, PATCH, DELETE } = criarRota({
  POST: async (requisicao) => {
    const autor = await autenticar(requisicao, 'admin')
    const dados = await lerCorpo(requisicao, esquemaNovoUsuario)
    const { auth, db } = obterAdmin()

    const existente = await contaPorEmail(dados.email)
    if (existente && (await db.doc(`usuarios/${existente.uid}`).get()).exists) {
      throw new ErroApi(409, 'Este e-mail já está cadastrado.')
    }
    // Senha aleatória que ninguém conhece: a pessoa define a sua pelo e-mail de redefinição.
    // Conta antiga sem cadastro é reaproveitada (e reativada, se estava bloqueada).
    const conta = existente
      ? await auth.updateUser(existente.uid, { displayName: dados.nome, disabled: false })
      : await auth.createUser({ email: dados.email, displayName: dados.nome, password: randomBytes(24).toString('base64url') })

    try {
      await gravar(autor, () => [
        { caminho: `usuarios/${conta.uid}`, acao: 'criar', dados: { ...dados, ativo: true } },
      ])
    } catch (erro) {
      if (!existente) await auth.deleteUser(conta.uid) // sem cadastro, a conta criada agora não fica
      throw erro
    }
    return json(201, { uid: conta.uid, email: dados.email })
  },

  PATCH: async (requisicao) => {
    const autor = await autenticar(requisicao, 'admin')
    const { uid, ...alteracao } = await lerCorpo(requisicao, esquemaAlterarUsuario)
    if (uid === autor.uid && alteracao.admin === false) {
      throw new ErroApi(409, 'Você não pode tirar o seu próprio acesso de administrador.')
    }
    if (uid === autor.uid && alteracao.ativo === false) {
      throw new ErroApi(409, 'Você não pode desativar a sua própria conta.')
    }

    await gravar(autor, () => [{ caminho: `usuarios/${uid}`, acao: 'editar', dados: alteracao }])

    const { auth } = obterAdmin()
    if (alteracao.ativo !== undefined) await auth.updateUser(uid, { disabled: !alteracao.ativo })
    if (alteracao.ativo === false) await auth.revokeRefreshTokens(uid)
    if (alteracao.nome) await auth.updateUser(uid, { displayName: alteracao.nome })
    return json(200, { uid })
  },

  PUT: async (requisicao) => {
    const quem = await identificar(requisicao)
    if (podeLer(quem.acesso)) return json(200, { uid: quem.uid, admin: quem.acesso!.admin })

    const email = quem.email?.toLowerCase() ?? ''
    if (!ADMINS_INICIAIS.map((e) => e.toLowerCase()).includes(email)) throw new ErroApi(403, SEM_ACESSO)

    const { db } = obterAdmin()
    const autor = { uid: quem.uid, email, perfil: 'admin' as const }
    await gravar(autor, async (transacao) => {
      // Dentro da transação: dois primeiros acessos ao mesmo tempo não criam dois administradores.
      const admins = await transacao.get(db.collection('usuarios').where('admin', '==', true).limit(1))
      if (!admins.empty) throw new ErroApi(403, SEM_ACESSO)
      const atual = await transacao.get(db.doc(`usuarios/${quem.uid}`))
      return [
        {
          caminho: `usuarios/${quem.uid}`,
          acao: atual.exists ? 'editar' : 'criar',
          dados: { email, nome: (atual.get('nome') as string | undefined) ?? email, admin: true, ativo: true, permissoes: [], comissao: null },
        },
      ]
    })
    return json(200, { uid: quem.uid, admin: true })
  },
})
