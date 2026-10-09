// Inicialização única do Firebase (Auth + Firestore) no navegador.
// O cliente só LÊ o Firestore; toda escrita passa pela /api.

import { initializeApp, type FirebaseApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore'
import { lerConfigFirebase, usarEmuladores } from './configFirebase'

interface InstanciasFirebase {
  app: FirebaseApp
  auth: Auth
  db: Firestore
}

let instancias: InstanciasFirebase | null = null

/** Inicializa na primeira chamada; lança ErroConfiguracao se faltar alguma VITE_FIREBASE_*. */
export function iniciarFirebase(): InstanciasFirebase {
  if (instancias) return instancias
  const app = initializeApp(lerConfigFirebase(import.meta.env))
  const auth = getAuth(app)
  const db = getFirestore(app)
  if (usarEmuladores(import.meta.env)) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
    connectFirestoreEmulator(db, '127.0.0.1', 8080)
  }
  instancias = { app, auth, db }
  return instancias
}

export const obterAuth = (): Auth => iniciarFirebase().auth
export const obterDb = (): Firestore => iniciarFirebase().db
