// Define (ou remove) o custom claim "perfil" de um usuário pelo e-mail,
// espelha em usuarios/{uid} e registra em auditoria.
//
// Uso: FIREBASE_SERVICE_ACCOUNT='{...}' npm run set-role -- --projeto dev --email pessoa@go.gov.br --perfil admin
//      FIREBASE_SERVICE_ACCOUNT='{...}' npm run set-role -- --projeto dev --email pessoa@go.gov.br --remover

import { parseArgs } from 'node:util'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { PERFIS, ehPerfil, extrairPerfil } from '../src/domain/perfis'
import { executar, iniciarAdmin } from './lib/admin'
import { registroDeScript } from './lib/auditoria'

executar(async () => {
  const { values } = parseArgs({
    options: {
      projeto: { type: 'string' },
      email: { type: 'string' },
      perfil: { type: 'string' },
      remover: { type: 'boolean', default: false },
      confirmar: { type: 'boolean', default: false },
    },
  })
  const email = values.email?.trim().toLowerCase()
  if (!email) throw new Error('Informe --email')
  if (values.remover === (values.perfil !== undefined)) throw new Error('Informe --perfil <perfil> OU --remover')
  if (values.perfil !== undefined && !ehPerfil(values.perfil)) {
    throw new Error(`Perfil inválido "${values.perfil}". Use: ${PERFIS.join(', ')}`)
  }
  const novo = values.remover ? null : (values.perfil as (typeof PERFIS)[number])

  const { app, executor } = iniciarAdmin(values.projeto, values.confirmar)
  const auth = getAuth(app)

  const usuario = await auth.getUserByEmail(email).catch((erro: { code?: string }) => {
    if (erro.code === 'auth/user-not-found') {
      throw new Error(`Usuário ${email} não existe. Crie-o no Firebase Console: Authentication → Users → Add user.`)
    }
    throw erro
  })
  const anterior = extrairPerfil(usuario.customClaims)

  const claims: Record<string, unknown> = { ...usuario.customClaims }
  if (novo) claims.perfil = novo
  else delete claims.perfil
  await auth.setCustomUserClaims(usuario.uid, claims)
  // Ao remover o acesso, encerra as sessões (o ID token atual ainda vale até expirar, no máximo 1 h).
  if (!novo) await auth.revokeRefreshTokens(usuario.uid)

  const db = getFirestore(app)
  const lote = db.batch()
  lote.set(
    db.doc(`usuarios/${usuario.uid}`),
    { email, perfil: novo, atualizadoEm: FieldValue.serverTimestamp() },
    { merge: true },
  )
  lote.create(
    db.collection('auditoria').doc(),
    registroDeScript({
      acao: 'usuario.perfil',
      caminho: `usuarios/${usuario.uid}`,
      detalhes: { email, anterior, novo },
      origem: 'scripts/set-role.ts',
      executor,
    }),
  )
  try {
    await lote.commit()
  } catch (erro) {
    throw new Error(
      `Claim aplicado, mas o registro em usuarios/auditoria falhou — rode o comando de novo. (${(erro as Error).message})`,
    )
  }

  console.log(
    novo
      ? `Perfil "${novo}" atribuído a ${email} (antes: ${anterior ?? 'nenhum'}). ` +
          'A pessoa deve sair e entrar de novo, ou clicar em "Verificar novamente".'
      : `Perfil removido de ${email} (antes: ${anterior ?? 'nenhum'}); sessões revogadas.`,
  )
})
