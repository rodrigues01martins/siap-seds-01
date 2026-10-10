import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { obterAdmin } from '../../api/_lib/admin'
import * as rota from '../../api/perfis'
import { auditoriaDe, chamar, criarUsuario, ler, limparAuth, limparFirestore } from './apoio'

const claimsDe = async (uid: string) => (await obterAdmin().auth.getUser(uid)).customClaims ?? {}

beforeEach(async () => {
  await limparAuth()
  await limparFirestore()
})

afterEach(() => {
  delete process.env.ADMIN_INICIAL_EMAIL
})

describe('PUT /api/perfis (primeiro admin) — acesso', () => {
  it('405 em GET e 401 sem login', async () => {
    const pessoa = await criarUsuario(null)
    process.env.ADMIN_INICIAL_EMAIL = pessoa.email
    expect((await chamar(rota, 'GET', undefined, pessoa.token)).status).toBe(405)
    expect((await chamar(rota, 'PUT', undefined, null)).status).toBe(401)
  })

  it('sem ADMIN_INICIAL_EMAIL configurada: 403, nada muda', async () => {
    const pessoa = await criarUsuario(null)
    const r = await chamar(rota, 'PUT', undefined, pessoa.token)
    expect(r.status).toBe(403)
    expect(await claimsDe(pessoa.uid)).toEqual({})
  })

  it('e-mail diferente de ADMIN_INICIAL_EMAIL: 403, nada muda', async () => {
    const pessoa = await criarUsuario(null)
    process.env.ADMIN_INICIAL_EMAIL = 'outra.pessoa@go.gov.br'
    const r = await chamar(rota, 'PUT', undefined, pessoa.token)
    expect(r).toMatchObject({ status: 403, corpo: { erro: expect.stringMatching(/administrador inicial/) } })
    expect(await claimsDe(pessoa.uid)).toEqual({})
    expect(await ler(`usuarios/${pessoa.uid}`)).toBeUndefined()
  })
})

describe('PUT /api/perfis (primeiro admin) — primeiro administrador', () => {
  it('sem nenhum admin e e-mail igual (sem diferenciar maiúsculas): define o claim, espelha em usuarios/{uid} e audita', async () => {
    const pessoa = await criarUsuario(null, { outroClaim: 'preservado' })
    process.env.ADMIN_INICIAL_EMAIL = `  ${pessoa.email.toUpperCase()} `
    const r = await chamar(rota, 'PUT', undefined, pessoa.token)

    expect(r).toMatchObject({ status: 200, corpo: { uid: pessoa.uid, perfil: 'admin' } })
    expect(await claimsDe(pessoa.uid)).toEqual({ outroClaim: 'preservado', perfil: 'admin' })
    expect(await ler(`usuarios/${pessoa.uid}`)).toMatchObject({ email: pessoa.email, perfil: 'admin' })
    const [registro] = await auditoriaDe(`usuarios/${pessoa.uid}`)
    expect(registro).toMatchObject({ acao: 'criar', antes: null, depois: { perfil: 'admin' }, uid: pessoa.uid, perfil: 'admin' })
  })

  it('usuário com outro perfil também pode virar o primeiro admin', async () => {
    const pessoa = await criarUsuario('membro')
    process.env.ADMIN_INICIAL_EMAIL = pessoa.email
    expect((await chamar(rota, 'PUT', undefined, pessoa.token)).status).toBe(200)
    expect(await claimsDe(pessoa.uid)).toMatchObject({ perfil: 'admin' })
  })

  it('já existe um admin: 409, mesmo com o e-mail certo, e nada muda', async () => {
    await criarUsuario('admin')
    const pessoa = await criarUsuario(null)
    process.env.ADMIN_INICIAL_EMAIL = pessoa.email
    const r = await chamar(rota, 'PUT', undefined, pessoa.token)
    expect(r).toMatchObject({ status: 409, corpo: { erro: expect.stringMatching(/Já existe um administrador/) } })
    expect(await claimsDe(pessoa.uid)).toEqual({})
    expect(await ler(`usuarios/${pessoa.uid}`)).toBeUndefined()
  })

  it('depois do primeiro admin, novas chamadas respondem 409', async () => {
    const pessoa = await criarUsuario(null)
    process.env.ADMIN_INICIAL_EMAIL = pessoa.email
    expect((await chamar(rota, 'PUT', undefined, pessoa.token)).status).toBe(200)
    expect((await chamar(rota, 'PUT', undefined, pessoa.token)).status).toBe(409)
    expect(await auditoriaDe(`usuarios/${pessoa.uid}`)).toHaveLength(1)
  })
})
