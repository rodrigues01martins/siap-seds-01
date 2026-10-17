import { beforeAll, describe, expect, it } from 'vitest'
import { obterAdmin } from '../../api/_lib/admin'
import { ErroApi } from '../../api/_lib/erros'
import { autenticar } from '../../api/_lib/porteiro'
import { criarUsuario, entrar, limparAuth, limparFirestore, type Usuario } from './apoio'

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

const SEM_PERMISSAO = 'Você não tem permissão para esta operação. Peça ao administrador.'
const ACESSO_DESATUALIZADO = 'Seu acesso precisa ser atualizado pelo administrador.'

let admin: Usuario
let presidente: Usuario
let antigo: Usuario
let adminLegado: Usuario
let semCadastro: Usuario
let desativado: Usuario

beforeAll(async () => {
  await limparAuth()
  await limparFirestore()
  admin = await criarUsuario('admin')
  presidente = await criarUsuario('presidente')
  antigo = await criarUsuario('antigo')
  // Administrador do modelo anterior (admin: true, sem o campo perfil): continua administrador.
  adminLegado = await criarUsuario('antigo', { admin: true, permissoes: [], comissao: null })
  semCadastro = await criarUsuario(null)
  desativado = await criarUsuario('presidente', { ativo: false })
})

describe('porteiro: login (ID token) e perfil (usuarios/{uid}: admin ou presidente)', () => {
  it('sem Authorization → 401', async () => {
    expect(await falha(autenticar(requisicao()))).toMatchObject({ status: 401, message: 'Faça login para continuar.' })
  })

  it('Authorization sem "Bearer" → 401', async () => {
    expect((await falha(autenticar(requisicao(`Basic ${admin.token}`)))).status).toBe(401)
  })

  it('token inválido → 401', async () => {
    expect(await falha(autenticar(requisicao('Bearer token-falso')))).toMatchObject({
      status: 401,
      message: 'Sessão inválida ou expirada. Entre novamente.',
    })
  })

  it('presidente faz tudo no sistema → devolve uid, e-mail, perfil e acesso', async () => {
    await expect(autenticar(requisicao(`Bearer ${presidente.token}`))).resolves.toEqual({
      uid: presidente.uid,
      email: presidente.email,
      perfil: 'presidente',
      acesso: { perfil: 'presidente', ativo: true },
    })
  })

  it('só o administrador gerencia usuários: presidente → 403 na exigência "admin"', async () => {
    expect(await falha(autenticar(requisicao(`Bearer ${presidente.token}`), 'admin'))).toMatchObject({ status: 403, message: SEM_PERMISSAO })
    await expect(autenticar(requisicao(`Bearer ${admin.token}`), 'admin')).resolves.toMatchObject({ perfil: 'admin' })
    await expect(autenticar(requisicao(`Bearer ${admin.token}`))).resolves.toMatchObject({ perfil: 'admin' })
  })

  it('administrador do modelo anterior (admin: true, sem perfil) continua administrador', async () => {
    await expect(autenticar(requisicao(`Bearer ${adminLegado.token}`), 'admin')).resolves.toMatchObject({ perfil: 'admin' })
  })

  it('cadastro antigo (relator, membro, controle) sem perfil novo → 403 "acesso precisa ser atualizado"', async () => {
    expect(await falha(autenticar(requisicao(`Bearer ${antigo.token}`)))).toMatchObject({ status: 403, message: ACESSO_DESATUALIZADO })
  })

  it('perfil desconhecido (ex.: "relator") também não entra', async () => {
    const outro = await criarUsuario('antigo', { perfil: 'relator' })
    expect(await falha(autenticar(requisicao(`Bearer ${outro.token}`)))).toMatchObject({ status: 403, message: ACESSO_DESATUALIZADO })
  })

  it('conta sem cadastro ou desativada → 403', async () => {
    expect((await falha(autenticar(requisicao(`Bearer ${semCadastro.token}`)))).status).toBe(403)
    expect((await falha(autenticar(requisicao(`Bearer ${desativado.token}`)))).status).toBe(403)
  })

  it('sessão revogada (ex.: conta desativada) → 401', async () => {
    const usuario = await criarUsuario('presidente')
    const token = await entrar(usuario.email)
    await new Promise((r) => setTimeout(r, 1100)) // a revogação tem resolução de segundos
    await obterAdmin().auth.revokeRefreshTokens(usuario.uid)
    expect((await falha(autenticar(requisicao(`Bearer ${token}`)))).status).toBe(401)
  })
})
