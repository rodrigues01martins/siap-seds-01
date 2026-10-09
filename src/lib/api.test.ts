import { describe, expect, it, vi } from 'vitest'
import { ErroApi, criarClienteApi } from './api'

const resposta = (status: number, corpo: unknown) =>
  new Response(typeof corpo === 'string' ? corpo : JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': typeof corpo === 'string' ? 'text/html' : 'application/json' },
  })

describe('cliente da /api (B6)', () => {
  it('anexa o ID token atual e envia JSON', async () => {
    const fetch = vi.fn(async () => resposta(201, { id: 'c1' }))
    const chamarApi = criarClienteApi({ obterToken: async () => 'TOKEN-123', fetch })

    await expect(chamarApi('/api/chamamentos', { metodo: 'POST', corpo: { titulo: 'X' } })).resolves.toEqual({
      id: 'c1',
    })
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/chamamentos')
    expect(init.method).toBe('POST')
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer TOKEN-123')
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json')
    expect(init.body).toBe(JSON.stringify({ titulo: 'X' }))
  })

  it('sem usuário logado: 401 sem chamar o servidor', async () => {
    const fetch = vi.fn()
    const chamarApi = criarClienteApi({ obterToken: async () => null, fetch })
    await expect(chamarApi('/api/oscs', { metodo: 'POST', corpo: {} })).rejects.toMatchObject({
      status: 401,
      message: 'Faça login para continuar.',
    })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('erro da API vira ErroApi tipado com mensagem e campos em português', async () => {
    const chamarApi = criarClienteApi({
      obterToken: async () => 't',
      fetch: async () => resposta(400, { erro: 'Dados inválidos.', campos: { cnpj: 'CNPJ inválido.' } }),
    })
    const erro = await chamarApi('/api/oscs', { metodo: 'POST', corpo: {} }).catch((e: unknown) => e)
    expect(erro).toBeInstanceOf(ErroApi)
    expect(erro).toMatchObject({ status: 400, message: 'Dados inválidos.', campos: { cnpj: 'CNPJ inválido.' } })
  })

  it('resposta de erro que não é JSON (ex.: 502 da plataforma)', async () => {
    const chamarApi = criarClienteApi({ obterToken: async () => 't', fetch: async () => resposta(502, '<html>') })
    await expect(chamarApi('/api/oscs', { metodo: 'POST', corpo: {} })).rejects.toMatchObject({
      status: 502,
      message: 'Erro inesperado do servidor (502).',
    })
  })

  it('falha de rede vira status 0 com mensagem clara', async () => {
    const chamarApi = criarClienteApi({
      obterToken: async () => 't',
      fetch: async () => {
        throw new TypeError('Failed to fetch')
      },
    })
    await expect(chamarApi('/api/oscs', { metodo: 'POST', corpo: {} })).rejects.toMatchObject({
      status: 0,
      message: 'Sem conexão com o servidor. Verifique a internet e tente novamente.',
    })
  })
})
