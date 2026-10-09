// Inicialização do firebase-admin para os scripts (credencial em FIREBASE_SERVICE_ACCOUNT).

import { readFileSync } from 'node:fs'
import { cert, initializeApp, type App } from 'firebase-admin/app'
import { conferirCredencial, lerCredencial, resolverProjeto } from './projeto'

export interface ContextoAdmin {
  app: App
  projectId: string
}

/**
 * Resolve o projeto (--projeto dev|prod), confere a credencial e inicializa o Admin SDK.
 * Em prod exige --confirmar, para evitar gravações acidentais.
 */
export function iniciarAdmin(alias: string | undefined, confirmado: boolean): ContextoAdmin {
  const firebaserc: unknown = JSON.parse(readFileSync(new URL('../../.firebaserc', import.meta.url), 'utf8'))
  const projectId = resolverProjeto(alias, firebaserc)
  const credencial = lerCredencial(process.env.FIREBASE_SERVICE_ACCOUNT)
  conferirCredencial(credencial, projectId)

  if (alias === 'prod' && !confirmado) {
    throw new Error(`Projeto de PRODUÇÃO (${projectId}). Repita o comando com --confirmar para prosseguir.`)
  }
  const emuladores = [process.env.FIRESTORE_EMULATOR_HOST, process.env.FIREBASE_AUTH_EMULATOR_HOST].filter(Boolean)
  console.log(`Projeto alvo: ${projectId} (${alias})${emuladores.length ? ` — EMULADORES: ${emuladores.join(', ')}` : ''}`)

  return { app: initializeApp({ credential: cert(credencial), projectId }), projectId }
}

/** Executa o script e encerra com código 1 e mensagem curta em caso de erro. */
export function executar(principal: () => Promise<void>): void {
  principal().catch((erro: unknown) => {
    console.error(`Erro: ${erro instanceof Error ? erro.message : String(erro)}`)
    process.exit(1)
  })
}
