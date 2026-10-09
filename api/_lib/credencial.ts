// Leitura da conta de serviço (FIREBASE_SERVICE_ACCOUNT), compartilhada pela /api e pelos scripts.
// Nunca ecoa o conteúdo do segredo em mensagens de erro.

export interface Credencial {
  projectId: string
  clientEmail: string
  privateKey: string
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
