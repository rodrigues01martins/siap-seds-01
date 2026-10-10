// E-mail de "redefinir senha" do Firebase. Serve também de convite: a conta criada pelo administrador tem
// senha aleatória, e a pessoa cria a sua pelo link. O texto do e-mail fica no Firebase Console
// (Authentication → Templates → Password reset).

import { FirebaseError } from 'firebase/app'
import { sendPasswordResetEmail } from 'firebase/auth'
import { obterAuth } from '../../lib/firebase'

export async function enviarEmailDeSenha(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(obterAuth(), email.trim())
  } catch (e) {
    const codigo = e instanceof FirebaseError ? e.code : ''
    // E-mail inexistente: mesma resposta de sucesso, para não revelar quem está cadastrado.
    if (codigo === 'auth/user-not-found') return
    if (codigo === 'auth/invalid-email' || codigo === 'auth/missing-email') throw new Error('Informe um e-mail válido.')
    if (codigo === 'auth/too-many-requests') throw new Error('Muitos envios seguidos. Aguarde alguns minutos.')
    throw new Error('Não foi possível enviar o e-mail. Verifique a conexão e tente novamente.')
  }
}
