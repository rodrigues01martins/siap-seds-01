// Leitura e validação das variáveis públicas do Firebase Web SDK.
// Não são segredos: identificam o projeto e vão para o bundle do navegador.

export interface ConfigFirebase {
  apiKey: string
  authDomain: string
  projectId: string
  appId: string
}

const VARIAVEIS: Record<keyof ConfigFirebase, string> = {
  apiKey: 'VITE_FIREBASE_API_KEY',
  authDomain: 'VITE_FIREBASE_AUTH_DOMAIN',
  projectId: 'VITE_FIREBASE_PROJECT_ID',
  appId: 'VITE_FIREBASE_APP_ID',
}

export class ErroConfiguracao extends Error {
  constructor(readonly faltando: string[]) {
    super(
      `Configuração do Firebase incompleta. Defina as variáveis de ambiente: ${faltando.join(', ')}. ` +
        'Localmente, use um arquivo .env.local (modelo em .env.example); na Vercel, veja o README.',
    )
    this.name = 'ErroConfiguracao'
  }
}

export function lerConfigFirebase(env: Record<string, unknown>): ConfigFirebase {
  const config: Partial<ConfigFirebase> = {}
  const faltando: string[] = []
  for (const [chave, variavel] of Object.entries(VARIAVEIS) as [keyof ConfigFirebase, string][]) {
    const valor = env[variavel]
    if (typeof valor === 'string' && valor.trim() !== '') config[chave] = valor.trim()
    else faltando.push(variavel)
  }
  if (faltando.length > 0) throw new ErroConfiguracao(faltando)
  return config as ConfigFirebase
}
