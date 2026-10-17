// /api/usuarios — gestão de usuários (tela Usuários, só o admin). Cadastro em usuarios/{uid}: nome, e-mail,
// perfil (admin ou presidente) e ativo, com atualizadoPor e atualizadoEm.
// POST (admin): novo usuário com perfil. Cria a conta no Firebase Authentication com senha aleatória; o app
//   envia em seguida o e-mail "redefinir senha" do Firebase, com que a pessoa cria a própria senha.
// PATCH (admin): perfil, nome e ativo. Dar perfil a um cadastro do modelo anterior apaga os campos antigos
//   (admin, permissoes, comissao). Desativar bloqueia a conta no Authentication e encerra as sessões.
//   Ninguém tira o próprio perfil de administrador nem se desativa.
// PUT (qualquer conta logada): primeiro acesso. Conta sem acesso (sem cadastro ou com cadastro antigo),
//   e-mail em api/_lib/adminsIniciais.ts e nenhum administrador no projeto → vira admin. Quem já tem perfil
//   recebe 200 sem mudança; cadastro antigo fora da lista → 403 pedindo a atualização pelo admin.

import { randomBytes } from 'node:crypto'
import { FieldValue } from 'firebase-admin/firestore'
import { ACESSO_DESATUALIZADO, podeLer, precisaAtualizarAcesso } from '../src/domain/permissoes.js'
import { esquemaAlterarUsuario, esquemaNovoUsuario } from '../src/esquemas/usuarios.js'
import { obterAdmin } from './_lib/admin.js'
import { ADMINS_INICIAIS } from './_lib/adminsIniciais.js'
import { ErroApi } from './_lib/erros.js'
import { gravar } from './_lib/gravar.js'
import { criarRota, json } from './_lib/http.js'
import { autenticar, identificar } from './_lib/porteiro.js'
import { lerCorpo } from './_lib/validacao.js'

const SEM_ACESSO = 'Sua conta ainda não tem acesso. Peça ao administrador que a libere na tela Usuários.'

/** Campos do modelo anterior, apagados quando o cadastro recebe um perfil. */
const CAMPOS_ANTIGOS = { admin: FieldValue.delete(), permissoes: FieldValue.delete(), comissao: FieldValue.delete() }

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
    if (uid === autor.uid && alteracao.perfil !== undefined && alteracao.perfil !== 'admin') {
      throw new ErroApi(409, 'Você não pode tirar o seu próprio acesso de administrador.')
    }
    if (uid === autor.uid && alteracao.ativo === false) {
      throw new ErroApi(409, 'Você não pode desativar a sua própria conta.')
    }

    const dados = alteracao.perfil ? { ...alteracao, ...CAMPOS_ANTIGOS } : alteracao
    await gravar(autor, () => [{ caminho: `usuarios/${uid}`, acao: 'editar', dados }])

    const { auth } = obterAdmin()
    if (alteracao.ativo !== undefined) await auth.updateUser(uid, { disabled: !alteracao.ativo })
    if (alteracao.ativo === false) await auth.revokeRefreshTokens(uid)
    if (alteracao.nome) await auth.updateUser(uid, { displayName: alteracao.nome })
    return json(200, { uid })
  },

  PUT: async (requisicao) => {
    const quem = await identificar(requisicao)
    if (podeLer(quem.acesso)) return json(200, { uid: quem.uid, perfil: quem.acesso!.perfil })

    const email = quem.email?.toLowerCase() ?? ''
    const semAcesso = precisaAtualizarAcesso(quem.acesso) ? ACESSO_DESATUALIZADO : SEM_ACESSO
    if (!ADMINS_INICIAIS.map((e) => e.toLowerCase()).includes(email)) throw new ErroApi(403, semAcesso)

    const { db } = obterAdmin()
    const autor = { uid: quem.uid, email, perfil: 'admin' as const }
    await gravar(autor, async (transacao) => {
      // Dentro da transação: dois primeiros acessos ao mesmo tempo não criam dois administradores.
      // Já há administrador: perfil admin ou o administrador do modelo anterior (admin: true, sem perfil).
      const [admins, antigos] = await Promise.all([
        transacao.get(db.collection('usuarios').where('perfil', '==', 'admin').limit(1)),
        transacao.get(db.collection('usuarios').where('admin', '==', true)),
      ])
      if (!admins.empty || antigos.docs.some((d) => d.get('perfil') === undefined)) throw new ErroApi(403, semAcesso)
      const atual = await transacao.get(db.doc(`usuarios/${quem.uid}`))
      const dados = { email, nome: (atual.get('nome') as string | undefined) ?? email, perfil: 'admin', ativo: true }
      return [
        atual.exists
          ? { caminho: `usuarios/${quem.uid}`, acao: 'editar', dados: { ...dados, ...CAMPOS_ANTIGOS } }
          : { caminho: `usuarios/${quem.uid}`, acao: 'criar', dados },
      ]
    })
    return json(200, { uid: quem.uid, perfil: 'admin' })
  },
})
