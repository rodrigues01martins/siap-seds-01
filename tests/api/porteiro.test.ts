import { beforeAll, describe, expect, it } from 'vitest'
import { obterAdmin } from '../../api/_lib/admin'
import { ErroApi } from '../../api/_lib/erros'
import { autenticar } from '../../api/_lib/porteiro'
import { ACESSO_TESTE, criarUsuario, entrar, limparAuth, limparFirestore, type Usuario } from './apoio'

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

let admin: Usuario
let relator: Usuario
let semCadastro: Usuario
let desativado: Usuario

beforeAll(async () => {
  await limparAuth()
  await limparFirestore()
  admin = await criarUsuario('admin')
  relator = await criarUsuario('relator')
  semCadastro = await criarUsuario(null)
  desativado = await criarUsuario('relator', { ativo: false })
})

describe('porteiro: login (ID token) e acesso (usuarios/{uid})', () => {
  it('sem Authorization → 401', async () => {
    expect(await falha(autenticar(requisicao(), 'admin'))).toMatchObject({
      status: 401,
      message: 'Faça login para continuar.',
    })
  })

  it('Authorization sem "Bearer" → 401', async () => {
    expect((await falha(autenticar(requisicao(`Basic ${admin.token}`), 'admin'))).status).toBe(401)
  })

  it('token inválido → 401', async () => {
    expect(await falha(autenticar(requisicao('Bearer token-falso'), 'admin'))).toMatchObject({
      status: 401,
      message: 'Sessão inválida ou expirada. Entre novamente.',
    })
  })

  it('permissão não liberada → 403', async () => {
    expect(await falha(autenticar(requisicao(`Bearer ${relator.token}`), 'homologar'))).toMatchObject({
      status: 403,
      message: SEM_PERMISSAO,
    })
    expect((await falha(autenticar(requisicao(`Bearer ${relator.token}`), 'admin'))).status).toBe(403)
  })

  it('conta sem cadastro ou desativada → 403', async () => {
    expect((await falha(autenticar(requisicao(`Bearer ${semCadastro.token}`), 'consultar'))).status).toBe(403)
    expect((await falha(autenticar(requisicao(`Bearer ${desativado.token}`), 'nivelD1'))).status).toBe(403)
  })

  it('permissão liberada → devolve uid, e-mail, perfil e acesso', async () => {
    await expect(autenticar(requisicao(`Bearer ${relator.token}`), 'nivelD1')).resolves.toEqual({
      uid: relator.uid,
      email: relator.email,
      perfil: 'usuario',
      acesso: { admin: false, ativo: true, permissoes: ACESSO_TESTE.relator.permissoes },
    })
  })

  it('administrador passa em qualquer exigência', async () => {
    await expect(autenticar(requisicao(`Bearer ${admin.token}`), 'homologar')).resolves.toMatchObject({ perfil: 'admin' })
    await expect(autenticar(requisicao(`Bearer ${admin.token}`), 'admin')).resolves.toMatchObject({ perfil: 'admin' })
  })

  it('sessão revogada (ex.: conta desativada) → 401', async () => {
    const usuario = await criarUsuario('membro')
    const token = await entrar(usuario.email)
    await new Promise((r) => setTimeout(r, 1100)) // a revogação tem resolução de segundos
    await obterAdmin().auth.revokeRefreshTokens(usuario.uid)
    expect((await falha(autenticar(requisicao(`Bearer ${token}`), 'nivelD1'))).status).toBe(401)
  })
})
