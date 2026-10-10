import { beforeEach, describe, expect, it } from 'vitest'
import { obterAdmin } from '../../api/_lib/admin'
import { ADMINS_INICIAIS } from '../../api/_lib/adminsIniciais'
import * as oscs from '../../api/oscs'
import * as rota from '../../api/usuarios'
import { auditoriaDe, chamar, criarConta, criarUsuario, ler, limparAuth, limparFirestore, totalAuditoria, type Usuario } from './apoio'

const auth = () => obterAdmin().auth

beforeEach(async () => {
  await limparAuth()
  await limparFirestore()
})

describe('PUT /api/usuarios — primeiro administrador (e-mail em api/_lib/adminsIniciais.ts)', () => {
  it('401 sem login; 405 em GET e DELETE', async () => {
    expect((await chamar(rota, 'PUT', undefined, null)).status).toBe(401)
    const conta = await criarConta(ADMINS_INICIAIS[0]!)
    expect((await chamar(rota, 'GET', undefined, conta.token)).status).toBe(405)
    expect((await chamar(rota, 'DELETE', undefined, conta.token)).status).toBe(405)
  })

  it('e-mail da lista e nenhum administrador: vira administrador, com cadastro e histórico', async () => {
    const conta = await criarConta(ADMINS_INICIAIS[0]!.toUpperCase())
    const r = await chamar(rota, 'PUT', undefined, conta.token)
    expect(r).toMatchObject({ status: 200, corpo: { uid: conta.uid, admin: true } })
    expect(await ler(`usuarios/${conta.uid}`)).toMatchObject({
      email: ADMINS_INICIAIS[0],
      admin: true,
      ativo: true,
      permissoes: [],
    })
    const [registro] = await auditoriaDe(`usuarios/${conta.uid}`)
    expect(registro).toMatchObject({ acao: 'criar', antes: null, uid: conta.uid, perfil: 'admin' })
  })

  it('e-mail fora da lista: 403 com orientação, nada gravado', async () => {
    const conta = await criarUsuario(null)
    const r = await chamar(rota, 'PUT', undefined, conta.token)
    expect(r).toMatchObject({ status: 403, corpo: { erro: expect.stringMatching(/Peça ao administrador/) } })
    expect(await ler(`usuarios/${conta.uid}`)).toBeUndefined()
    expect(await totalAuditoria()).toBe(0)
  })

  it('e-mail da lista, mas já existe administrador: 403, nada gravado', async () => {
    await criarUsuario('admin')
    const conta = await criarConta(ADMINS_INICIAIS[0]!)
    expect((await chamar(rota, 'PUT', undefined, conta.token)).status).toBe(403)
    expect(await ler(`usuarios/${conta.uid}`)).toBeUndefined()
  })

  it('cadastro antigo sem acesso (modelo de perfis) e e-mail da lista: vira administrador', async () => {
    const conta = await criarConta(ADMINS_INICIAIS[0]!)
    await obterAdmin().db.doc(`usuarios/${conta.uid}`).set({ email: ADMINS_INICIAIS[0], perfil: null })
    const r = await chamar(rota, 'PUT', undefined, conta.token)
    expect(r).toMatchObject({ status: 200, corpo: { admin: true } })
    expect(await ler(`usuarios/${conta.uid}`)).toMatchObject({ admin: true, ativo: true, permissoes: [] })
    const [registro] = await auditoriaDe(`usuarios/${conta.uid}`)
    expect(registro).toMatchObject({ acao: 'editar', antes: { perfil: null } })
  })

  it('quem já tem acesso: 200 sem alterar nada', async () => {
    const membro = await criarUsuario('membro')
    const r = await chamar(rota, 'PUT', undefined, membro.token)
    expect(r).toMatchObject({ status: 200, corpo: { uid: membro.uid, admin: false } })
    expect(await totalAuditoria()).toBe(0)
  })
})

describe('POST /api/usuarios — novo usuário (convite)', () => {
  let admin: Usuario
  beforeEach(async () => {
    admin = await criarUsuario('admin')
  })

  const NOVO = { nome: 'Maria Souza', email: ' Maria.Souza@Goias.gov.br ', admin: false, permissoes: ['consultar', 'nivelD1'], comissao: 'membro' }

  it('401 sem login e 403 para quem não é administrador', async () => {
    expect((await chamar(rota, 'POST', NOVO, null)).status).toBe(401)
    const presidente = await criarUsuario('presidente')
    expect((await chamar(rota, 'POST', NOVO, presidente.token)).status).toBe(403)
  })

  it('dados inválidos → 400 por campo', async () => {
    const r = await chamar(rota, 'POST', { nome: '', email: 'x', admin: 'sim', permissoes: ['superpoder'], comissao: 'chefe' }, admin.token)
    expect(r.status).toBe(400)
    expect(Object.keys(r.corpo?.campos ?? {}).sort()).toEqual(['admin', 'comissao', 'email', 'nome', 'permissoes.0'])
  })

  it('cria a conta no Authentication e o cadastro, com histórico; a senha é definida pela própria pessoa', async () => {
    const r = await chamar(rota, 'POST', NOVO, admin.token)
    expect(r).toMatchObject({ status: 201, corpo: { email: 'maria.souza@goias.gov.br' } })
    const uid = r.corpo?.uid as string
    const conta = await auth().getUser(uid)
    expect(conta).toMatchObject({ email: 'maria.souza@goias.gov.br', displayName: 'Maria Souza', disabled: false })
    expect(await ler(`usuarios/${uid}`)).toMatchObject({
      email: 'maria.souza@goias.gov.br',
      nome: 'Maria Souza',
      admin: false,
      ativo: true,
      permissoes: ['consultar', 'nivelD1'],
      comissao: 'membro',
    })
    const [registro] = await auditoriaDe(`usuarios/${uid}`)
    expect(registro).toMatchObject({ acao: 'criar', antes: null, uid: admin.uid, perfil: 'admin' })
  })

  it('conta que já existe no Authentication, sem cadastro: aproveita a conta', async () => {
    const conta = await criarConta('maria.souza@goias.gov.br')
    const r = await chamar(rota, 'POST', NOVO, admin.token)
    expect(r).toMatchObject({ status: 201, corpo: { uid: conta.uid } })
  })

  it('e-mail já cadastrado → 409', async () => {
    await chamar(rota, 'POST', NOVO, admin.token)
    const r = await chamar(rota, 'POST', NOVO, admin.token)
    expect(r).toMatchObject({ status: 409, corpo: { erro: 'Este e-mail já está cadastrado.' } })
  })

  it('administrador novo: admin=true, sem precisar de permissões', async () => {
    const r = await chamar(rota, 'POST', { nome: 'Outra Admin', email: 'outra@goias.gov.br', admin: true, permissoes: [], comissao: null }, admin.token)
    expect(r.status).toBe(201)
    expect(await ler(`usuarios/${r.corpo?.uid as string}`)).toMatchObject({ admin: true, comissao: null })
  })
})

describe('PATCH /api/usuarios — permissões, administrador, papel e desativação', () => {
  let admin: Usuario
  let membro: Usuario
  beforeEach(async () => {
    admin = await criarUsuario('admin')
    membro = await criarUsuario('membro')
  })

  const OSC = { cnpj: '11222333000181', razaoSocial: 'Instituto Esperança' }

  it('403 para quem não é administrador; 404 para uid sem cadastro; 400 sem nada a alterar', async () => {
    expect((await chamar(rota, 'PATCH', { uid: membro.uid, admin: true }, membro.token)).status).toBe(403)
    expect((await chamar(rota, 'PATCH', { uid: 'nao-existe', admin: true }, admin.token)).status).toBe(404)
    expect((await chamar(rota, 'PATCH', { uid: membro.uid }, admin.token)).status).toBe(400)
  })

  it('liberar uma permissão vale na hora, sem sair e entrar (e fica no histórico)', async () => {
    expect((await chamar(oscs, 'POST', OSC, membro.token)).status).toBe(403)
    const r = await chamar(rota, 'PATCH', { uid: membro.uid, permissoes: ['consultar', 'nivelD1', 'oscs'] }, admin.token)
    expect(r.status).toBe(200)
    expect((await chamar(oscs, 'POST', OSC, membro.token)).status).toBe(201)
    const [registro] = await auditoriaDe(`usuarios/${membro.uid}`)
    expect(registro).toMatchObject({ acao: 'editar', antes: { permissoes: ['consultar', 'nivelD1'] }, depois: { permissoes: ['consultar', 'nivelD1', 'oscs'] } })
  })

  it('tornar e deixar de ser administrador; trocar nome e papel na Comissão', async () => {
    await chamar(rota, 'PATCH', { uid: membro.uid, admin: true, nome: 'Novo Nome', comissao: 'relator' }, admin.token)
    expect(await ler(`usuarios/${membro.uid}`)).toMatchObject({ admin: true, nome: 'Novo Nome', comissao: 'relator' })
    await chamar(rota, 'PATCH', { uid: membro.uid, admin: false, comissao: null }, admin.token)
    expect(await ler(`usuarios/${membro.uid}`)).toMatchObject({ admin: false, comissao: null })
  })

  it('desativar: bloqueia a conta e encerra as sessões; reativar libera', async () => {
    expect((await chamar(rota, 'PATCH', { uid: membro.uid, ativo: false }, admin.token)).status).toBe(200)
    expect((await auth().getUser(membro.uid)).disabled).toBe(true)
    expect((await chamar(oscs, 'POST', OSC, membro.token)).status).toBe(401)
    await chamar(rota, 'PATCH', { uid: membro.uid, ativo: true }, admin.token)
    expect((await auth().getUser(membro.uid)).disabled).toBe(false)
    expect(await ler(`usuarios/${membro.uid}`)).toMatchObject({ ativo: true })
  })

  it('o administrador não tira o próprio acesso de administrador nem desativa a própria conta (409)', async () => {
    const r1 = await chamar(rota, 'PATCH', { uid: admin.uid, admin: false }, admin.token)
    expect(r1).toMatchObject({ status: 409, corpo: { erro: 'Você não pode tirar o seu próprio acesso de administrador.' } })
    const r2 = await chamar(rota, 'PATCH', { uid: admin.uid, ativo: false }, admin.token)
    expect(r2).toMatchObject({ status: 409, corpo: { erro: 'Você não pode desativar a sua própria conta.' } })
    expect(await ler(`usuarios/${admin.uid}`)).toMatchObject({ admin: true, ativo: true })
  })
})
