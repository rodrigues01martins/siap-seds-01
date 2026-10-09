import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { obterAdmin } from '../../api/_lib/admin'
import * as rota from '../../api/perfis'
import { auditoriaDe, chamar, criarUsuario, ler, limparAuth, limparFirestore, type Usuario } from './apoio'

let admin: Usuario
let presidente: Usuario
let alvo: Usuario

const claimsDe = async (uid: string) => (await obterAdmin().auth.getUser(uid)).customClaims ?? {}

beforeAll(async () => {
  await limparAuth()
  admin = await criarUsuario('admin')
  presidente = await criarUsuario('presidente')
})

beforeEach(async () => {
  await limparFirestore()
  alvo = await criarUsuario(null, { outroClaim: 'preservado' })
})

describe('/api/perfis — acesso e validação', () => {
  it('405, 401 e 403', async () => {
    expect((await chamar(rota, 'GET', undefined, admin.token)).status).toBe(405)
    expect((await chamar(rota, 'POST', { email: alvo.email, perfil: 'membro' }, null)).status).toBe(401)
    expect((await chamar(rota, 'POST', { email: alvo.email, perfil: 'membro' }, presidente.token)).status).toBe(403)
  })

  it('perfil fora da lista e e-mail inválido → 400', async () => {
    const r = await chamar(rota, 'POST', { email: 'nao-e-email', perfil: 'superusuario' }, admin.token)
    expect(r.status).toBe(400)
    expect(Object.keys(r.corpo?.campos ?? {}).sort()).toEqual(['email', 'perfil'])
  })

  it('e-mail sem usuário no Authentication → 404', async () => {
    const r = await chamar(rota, 'POST', { email: 'ninguem@go.gov.br', perfil: 'membro' }, admin.token)
    expect(r).toMatchObject({ status: 404, corpo: { erro: 'Usuário não encontrado no Firebase Authentication.' } })
  })
})

describe('/api/perfis — dar, trocar e remover', () => {
  it('dar perfil: claim, espelho em usuarios/{uid} e auditoria', async () => {
    const r = await chamar(rota, 'POST', { email: alvo.email, perfil: 'membro' }, admin.token)
    expect(r).toMatchObject({ status: 200, corpo: { uid: alvo.uid, perfil: 'membro' } })
    expect(await claimsDe(alvo.uid)).toEqual({ outroClaim: 'preservado', perfil: 'membro' })
    expect(await ler(`usuarios/${alvo.uid}`)).toMatchObject({ email: alvo.email, perfil: 'membro' })

    const [registro] = await auditoriaDe(`usuarios/${alvo.uid}`)
    expect(registro).toMatchObject({ acao: 'criar', antes: null, depois: { perfil: 'membro' }, uid: admin.uid, perfil: 'admin' })
  })

  it('trocar perfil: auditoria com antes e depois', async () => {
    await chamar(rota, 'POST', { email: alvo.email, perfil: 'membro' }, admin.token)
    await chamar(rota, 'POST', { email: alvo.email, perfil: 'relator' }, admin.token)
    const registros = await auditoriaDe(`usuarios/${alvo.uid}`)
    expect(registros[1]).toMatchObject({ acao: 'editar', antes: { perfil: 'membro' }, depois: { perfil: 'relator' } })
  })

  it('remover perfil (DELETE): tira o claim, preserva os demais e audita', async () => {
    await chamar(rota, 'POST', { email: alvo.email, perfil: 'membro' }, admin.token)
    const r = await chamar(rota, 'DELETE', { email: alvo.email }, admin.token)
    expect(r).toMatchObject({ status: 200, corpo: { perfil: null } })
    expect(await claimsDe(alvo.uid)).toEqual({ outroClaim: 'preservado' })
    expect(await ler(`usuarios/${alvo.uid}`)).toMatchObject({ perfil: null })
    const registros = await auditoriaDe(`usuarios/${alvo.uid}`)
    expect(registros[1]).toMatchObject({ acao: 'editar', antes: { perfil: 'membro' }, depois: { perfil: null } })
  })
})

describe('/api/perfis — admin não remove o próprio perfil admin', () => {
  const MENSAGEM = 'Você não pode remover o seu próprio perfil de administrador.'

  it('remover o próprio perfil → 409', async () => {
    const r = await chamar(rota, 'DELETE', { email: admin.email }, admin.token)
    expect(r).toMatchObject({ status: 409, corpo: { erro: MENSAGEM } })
    expect(await claimsDe(admin.uid)).toMatchObject({ perfil: 'admin' })
  })

  it('trocar o próprio perfil admin por outro → 409', async () => {
    const r = await chamar(rota, 'POST', { email: admin.email, perfil: 'membro' }, admin.token)
    expect(r).toMatchObject({ status: 409, corpo: { erro: MENSAGEM } })
    expect(await claimsDe(admin.uid)).toMatchObject({ perfil: 'admin' })
  })
})
