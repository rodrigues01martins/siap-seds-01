// Roteamento por método HTTP e respostas JSON padronizadas.

import { ErroApi, MENSAGENS } from './erros.js'

export type Metodo = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
export type Tratador = (requisicao: Request) => Promise<Response>

const METODOS: Metodo[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

export function json(status: number, corpo: unknown, cabecalhos: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cabecalhos },
  })
}

function responderErro(erro: unknown): Response {
  if (erro instanceof ErroApi) {
    return json(erro.status, { erro: erro.message, ...(erro.campos ? { campos: erro.campos } : {}) }, erro.cabecalhos)
  }
  console.error('[api] erro inesperado:', erro)
  return json(500, { erro: MENSAGENS.interno })
}

/**
 * Monta a rota no formato de função da Vercel (um export por método HTTP).
 * Métodos sem tratador respondem 405 com o cabeçalho Allow; ErroApi vira { erro, campos }.
 */
export function criarRota(tratadores: Partial<Record<Metodo, Tratador>>): Record<Metodo, Tratador> {
  const permitidos = METODOS.filter((m) => tratadores[m]).join(', ')
  const rota: Tratador = async (requisicao) => {
    try {
      const tratador = tratadores[requisicao.method as Metodo]
      if (!tratador) {
        throw new ErroApi(405, `Método ${requisicao.method} não permitido.`, undefined, { Allow: permitidos })
      }
      return await tratador(requisicao)
    } catch (erro) {
      return responderErro(erro)
    }
  }
  return { GET: rota, POST: rota, PUT: rota, PATCH: rota, DELETE: rota }
}
