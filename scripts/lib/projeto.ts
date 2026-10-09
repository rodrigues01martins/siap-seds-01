// Utilitários puros dos scripts administrativos: projeto alvo e credencial.

export type AliasProjeto = 'dev' | 'prod'

export interface Credencial {
  projectId: string
  clientEmail: string
  privateKey: string
}

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

/** Lê a conta de serviço de FIREBASE_SERVICE_ACCOUNT (JSON), sem ecoar o conteúdo em erros. */
export function lerCredencial(json: string | undefined): Credencial {
  if (!json || json.trim() === '') {
    throw new Error('Defina FIREBASE_SERVICE_ACCOUNT com o JSON da conta de serviço do projeto')
  }
  let dados: Record<string, unknown>
  try {
    dados = JSON.parse(json) as Record<string, unknown>
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT não contém um JSON válido')
  }
  for (const campo of ['project_id', 'client_email', 'private_key']) {
    if (typeof dados[campo] !== 'string' || dados[campo] === '') {
      throw new Error(`FIREBASE_SERVICE_ACCOUNT sem o campo ${campo}`)
    }
  }
  return {
    projectId: dados.project_id as string,
    clientEmail: dados.client_email as string,
    privateKey: dados.private_key as string,
  }
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
