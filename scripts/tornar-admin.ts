// Emergência: dá o perfil admin (ou reativa) a uma conta pelo e-mail, direto no projeto, sem o app.
// Uso normal não precisa: o primeiro administrador entra sozinho (api/_lib/adminsIniciais.ts) e os demais
// são definidos na tela Usuários. Serve se todos os administradores perderem o acesso.
// A conta precisa existir no Firebase Authentication. Grava usuarios/{uid} e registra em auditoria.
//
// Uso: FIREBASE_SERVICE_ACCOUNT='{...}' npm run tornar-admin -- --projeto dev --email pessoa@goias.gov.br

import { parseArgs } from 'node:util'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { executar, iniciarAdmin } from './lib/admin'
import { registroDeScript } from './lib/auditoria'

executar(async () => {
  const { values } = parseArgs({
    options: {
      projeto: { type: 'string' },
      email: { type: 'string' },
      confirmar: { type: 'boolean', default: false },
    },
  })
  const email = values.email?.trim().toLowerCase()
  if (!email) throw new Error('Informe --email')

  const { app, executor } = iniciarAdmin(values.projeto, values.confirmar)
  const auth = getAuth(app)
  const usuario = await auth.getUserByEmail(email).catch((erro: { code?: string }) => {
    if (erro.code === 'auth/user-not-found') {
      throw new Error(`Usuário ${email} não existe. Crie-o no Firebase Console: Authentication → Users → Add user.`)
    }
    throw erro
  })
  if (usuario.disabled) await auth.updateUser(usuario.uid, { disabled: false })

  const db = getFirestore(app)
  const caminho = `usuarios/${usuario.uid}`
  const anterior = (await db.doc(caminho).get()).data() ?? null
  const lote = db.batch()
  lote.set(
    db.doc(caminho),
    {
      email,
      nome: (anterior?.nome as string | undefined) ?? usuario.displayName ?? email,
      perfil: 'admin',
      ativo: true,
      // Campos do modelo anterior (permissões por área e papel na Comissão) saem do cadastro.
      admin: FieldValue.delete(),
      permissoes: FieldValue.delete(),
      comissao: FieldValue.delete(),
      atualizadoEm: FieldValue.serverTimestamp(),
      ...(anterior ? {} : { criadoEm: FieldValue.serverTimestamp() }),
    },
    { merge: true },
  )
  lote.create(
    db.collection('auditoria').doc(),
    registroDeScript({
      acao: 'usuario.admin',
      caminho,
      detalhes: { email, antes: anterior ? { perfil: anterior.perfil ?? null, admin: anterior.admin ?? false, ativo: anterior.ativo ?? true } : null },
      origem: 'scripts/tornar-admin.ts',
      executor,
    }),
  )
  await lote.commit()
  console.log(`${email} agora é administrador (conta ativa). Basta recarregar o app.`)
})
