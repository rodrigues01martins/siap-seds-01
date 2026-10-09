// Utilitários puros dos scripts administrativos: projeto alvo e credencial.

export type AliasProjeto = 'dev' | 'prod'

import type { Credencial } from '../../api/_lib/credencial.js'

export { lerCredencial, type Credencial } from '../../api/_lib/credencial.js'

/** Traduz --projeto dev|prod para o ID do projeto definido no .firebaserc. */
export function resolverProjeto(alias: string | undefined, firebaserc: unknown): string {
  if (alias !== 'dev' && alias !== 'prod') {
    throw new Error(`Informe o projeto com --projeto dev|prod (recebido: ${alias ?? 'nada'})`)
  }
  const projetos = (firebaserc as { projects?: Record<string, unknown> } | null)?.projects
  const id = projetos?.[alias]
  if (typeof id !== 'string' || id === '') throw new Error(`Alias "${alias}" ausente em .firebaserc (projects.${alias})`)
  return id
}

/** Impede usar a credencial de um projeto contra outro (ex.: chave de dev em prod). */
export function conferirCredencial(credencial: Credencial, projectId: string): void {
  if (credencial.projectId !== projectId) {
    throw new Error(
      `A credencial é do projeto "${credencial.projectId}", mas o alvo é "${projectId}". ` +
        'Confira --projeto e FIREBASE_SERVICE_ACCOUNT.',
    )
  }
}

/** Quem executou o script, para a auditoria: usuário do GitHub (Actions) ou do sistema operacional. */
export function identificarExecutor(env: Record<string, string | undefined>, usuarioSistema: string): string {
  if (env.GITHUB_ACTIONS === 'true') return `github:${env.GITHUB_ACTOR || 'desconhecido'}`
  return `local:${usuarioSistema}`
}
