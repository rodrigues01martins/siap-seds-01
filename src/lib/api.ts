// Cliente da /api: anexa o ID token atual e converte erros em ErroApi com mensagem em português.

import { obterAuth } from './firebase'

export class ErroApi extends Error {
  constructor(
    readonly status: number,
    mensagem: string,
    readonly campos?: Record<string, string>,
  ) {
    super(mensagem)
    this.name = 'ErroApi'
  }
}

export type MetodoApi = 'GET' | 'POST' | 'PATCH' | 'DELETE'

export interface DependenciasApi {
  obterToken: () => Promise<string | null>
  fetch: (url: string, init: RequestInit) => Promise<Response>
}

export function criarClienteApi({ obterToken, fetch }: DependenciasApi) {
  return async function chamarApi<T = unknown>(
    caminho: string,
    { metodo, corpo }: { metodo: MetodoApi; corpo?: unknown },
  ): Promise<T> {
    const token = await obterToken()
    if (!token) throw new ErroApi(401, 'Faça login para continuar.')

    let resposta: Response
    try {
      resposta = await fetch(caminho, {
        method: metodo,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: corpo === undefined ? undefined : JSON.stringify(corpo),
      })
    } catch {
      throw new ErroApi(0, 'Sem conexão com o servidor. Verifique a internet e tente novamente.')
    }

    const dados = (await resposta.json().catch(() => null)) as {
      erro?: string
      campos?: Record<string, string>
    } | null
    if (!resposta.ok) {
      throw new ErroApi(
        resposta.status,
        dados?.erro ?? `Erro inesperado do servidor (${resposta.status}).`,
        dados?.campos,
      )
    }
    return dados as T
  }
}

/** Cliente padrão do app: usa o usuário logado no Firebase Auth. */
export const chamarApi = criarClienteApi({
  obterToken: async () => (await obterAuth().currentUser?.getIdToken()) ?? null,
  fetch: (url, init) => fetch(url, init),
})
