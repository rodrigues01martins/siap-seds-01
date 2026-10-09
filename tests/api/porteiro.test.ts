import { beforeAll, describe, expect, it } from 'vitest'
import { obterAdmin } from '../../api/_lib/admin'
import { ErroApi } from '../../api/_lib/erros'
import { autenticar } from '../../api/_lib/porteiro'
import { criarUsuario, entrar, limparAuth, type Usuario } from './apoio'

const requisicao = (autorizacao?: string) =>
  new Request('http://localhost/api/x', {
    method: 'POST',
    headers: autorizacao ? { Authorization: autorizacao } : {},
  })

async function falha(promessa: Promise<unknown>): Promise<ErroApi> {
  const erro = await promessa.catch((e: unknown) => e)
  expect(erro).toBeInstanceOf(ErroApi)
  return erro as ErroApi
}

let admin: Usuario
let relator: Usuario
let semPerfil: Usuario
let perfilInvalido: Usuario

beforeAll(async () => {
  await limparAuth()
  admin = await criarUsuario('admin')
  relator = await criarUsuario('relator')
  semPerfil = await criarUsuario(null)
  perfilInvalido = await criarUsuario(null, { perfil: 'superusuario' })
})

describe('porteiro (B2)', () => {
  it('sem Authorization → 401', async () => {
    expect(await falha(autenticar(requisicao(), ['admin']))).toMatchObject({
      status: 401,
      message: 'Faça login para continuar.',
    })
  })

  it('Authorization sem "Bearer" → 401', async () => {
    expect((await falha(autenticar(requisicao(`Basic ${admin.token}`), ['admin']))).status).toBe(401)
  })

  it('token inválido → 401', async () => {
    expect(await falha(autenticar(requisicao('Bearer token-falso'), ['admin']))).toMatchObject({
      status: 401,
      message: 'Sessão inválida ou expirada. Entre novamente.',
    })
  })

  it('perfil fora da lista permitida → 403', async () => {
    expect(await falha(autenticar(requisicao(`Bearer ${relator.token}`), ['admin']))).toMatchObject({
      status: 403,
      message: 'Seu perfil não tem permissão para esta operação.',
    })
  })

  it('usuário sem perfil ou com perfil desconhecido → 403', async () => {
    expect((await falha(autenticar(requisicao(`Bearer ${semPerfil.token}`), ['admin']))).status).toBe(403)
    expect((await falha(autenticar(requisicao(`Bearer ${perfilInvalido.token}`), ['admin']))).status).toBe(403)
  })

  it('perfil permitido → devolve uid, e-mail e perfil', async () => {
    await expect(autenticar(requisicao(`Bearer ${relator.token}`), ['admin', 'relator'])).resolves.toEqual({
      uid: relator.uid,
      email: relator.email,
      perfil: 'relator',
    })
  })

  it('sessão revogada (ex.: perfil removido) → 401', async () => {
    const usuario = await criarUsuario('membro')
    const token = await entrar(usuario.email)
    await new Promise((r) => setTimeout(r, 1100)) // a revogação tem resolução de segundos
    await obterAdmin().auth.revokeRefreshTokens(usuario.uid)
    expect((await falha(autenticar(requisicao(`Bearer ${token}`), ['membro']))).status).toBe(401)
  })
})
