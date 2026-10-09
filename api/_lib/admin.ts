// firebase-admin inicializado uma única vez por instância da função.
// Produção: credencial em FIREBASE_SERVICE_ACCOUNT (variável de servidor, nunca VITE_).
// Testes: emuladores, quando FIRESTORE_EMULATOR_HOST e FIREBASE_AUTH_EMULATOR_HOST estão definidas.

import { cert, getApps, initializeApp, type App } from 'firebase-admin/app'
import { getAuth, type Auth } from 'firebase-admin/auth'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import { lerCredencial, type Credencial } from './credencial.js'

export type ConfiguracaoAdmin =
  | { modo: 'emulador'; projectId: string }
  | { modo: 'credencial'; projectId: string; credencial: Credencial }

export function configuracaoAdmin(env: Record<string, string | undefined>): ConfiguracaoAdmin {
  const firestore = env.FIRESTORE_EMULATOR_HOST
  const auth = env.FIREBASE_AUTH_EMULATOR_HOST
  if (firestore || auth) {
    // Só um dos dois misturaria emulador com produção: recusa.
    if (!auth) throw new Error('Defina também FIREBASE_AUTH_EMULATOR_HOST para usar os emuladores.')
    if (!firestore) throw new Error('Defina também FIRESTORE_EMULATOR_HOST para usar os emuladores.')
    // O emulador de Auth aceita tokens sem assinatura: nunca na Vercel (produção ou preview).
    if (env.VERCEL || env.VERCEL_ENV) {
      throw new Error('Variáveis dos emuladores definidas na Vercel: remova-as (os emuladores são só para testes locais).')
    }
    return { modo: 'emulador', projectId: env.GCLOUD_PROJECT || 'demo-siap-seds' }
  }
  const credencial = lerCredencial(env.FIREBASE_SERVICE_ACCOUNT)
  return { modo: 'credencial', projectId: credencial.projectId, credencial }
}

const NOME_APP = 'siap-api'

interface Admin {
  app: App
  auth: Auth
  db: Firestore
}

let admin: Admin | undefined

export function obterAdmin(): Admin {
  if (admin) return admin
  const config = configuracaoAdmin(process.env)
  const app =
    getApps().find((a) => a.name === NOME_APP) ??
    initializeApp(
      config.modo === 'emulador'
        ? { projectId: config.projectId }
        : { credential: cert(config.credencial), projectId: config.projectId },
      NOME_APP,
    )
  admin = { app, auth: getAuth(app), db: getFirestore(app) }
  return admin
}
