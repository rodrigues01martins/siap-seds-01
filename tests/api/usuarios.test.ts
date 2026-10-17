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

  it('e-mail da lista e nenhum administrador: vira administrador (perfil admin), com cadastro e histórico', async () => {
    const conta = await criarConta(ADMINS_INICIAIS[0]!.toUpperCase())
    const r = await chamar(rota, 'PUT', undefined, conta.token)
    expect(r).toMatchObject({ status: 200, corpo: { uid: conta.uid, perfil: 'admin' } })
    const cadastro = await ler(`usuarios/${conta.uid}`)
    expect(cadastro).toMatchObject({ email: ADMINS_INICIAIS[0], perfil: 'admin', ativo: true })
    expect(cadastro).not.toHaveProperty('permissoes')
    const [registro] = await auditoriaDe(`usuarios/${conta.uid}`)
    expect(registro).toMatchObject({ acao: 'criar', antes: null, uid: conta.uid, perfil: 'admin' })
  })

  it('e-mail fora da lista: 403 com orientação, nada gravado', async () => {
    const conta = await criarUsuario(null)
    const r = await chamar(rota, 'PUT', undefined, conta.token)
    expect(r).toMatchObject({ status: 403, corpo: { erro: expect.stringMatching(/administrador/) } })
    expect(await ler(`usuarios/${conta.uid}`)).toBeUndefined()
    expect(await totalAuditoria()).toBe(0)
  })

  it.each([
    ['perfil admin', {}],
    ['administrador do modelo anterior (admin: true)', { legado: true }],
  ])('e-mail da lista, mas já existe administrador (%s): 403, nada gravado', async (_caso, { legado }: { legado?: boolean }) => {
    if (legado) await criarUsuario('antigo', { admin: true })
    else await criarUsuario('admin')
    const conta = await criarConta(ADMINS_INICIAIS[0]!)
    expect((await chamar(rota, 'PUT', undefined, conta.token)).status).toBe(403)
    expect(await ler(`usuarios/${conta.uid}`)).toBeUndefined()
  })

  it('cadastro antigo (relator, membro, controle) e e-mail da lista: vira administrador; campos antigos saem', async () => {
    const conta = await criarConta(ADMINS_INICIAIS[0]!)
    await obterAdmin().db.doc(`usuarios/${conta.uid}`).set({ email: ADMINS_INICIAIS[0], admin: false, permissoes: ['nivelD1'], comissao: 'relator' })
    const r = await chamar(rota, 'PUT', undefined, conta.token)
    expect(r).toMatchObject({ status: 200, corpo: { perfil: 'admin' } })
    const cadastro = await ler(`usuarios/${conta.uid}`)
    expect(cadastro).toMatchObject({ perfil: 'admin', ativo: true })
    for (const antigo of ['admin', 'permissoes', 'comissao']) expect(cadastro).not.toHaveProperty(antigo)
    const [registro] = await auditoriaDe(`usuarios/${conta.uid}`)
    expect(registro).toMatchObject({ acao: 'editar', antes: { comissao: 'relator' } })
  })

  it('quem já tem perfil: 200 sem alterar nada', async () => {
    const presidente = await criarUsuario('presidente')
    const r = await chamar(rota, 'PUT', undefined, presidente.token)
    expect(r).toMatchObject({ status: 200, corpo: { uid: presidente.uid, perfil: 'presidente' } })
    expect(await totalAuditoria()).toBe(0)
  })

  it('cadastro antigo fora da lista: 403 "Seu acesso precisa ser atualizado pelo administrador."', async () => {
    const antigo = await criarUsuario('antigo')
    const r = await chamar(rota, 'PUT', undefined, antigo.token)
    expect(r).toMatchObject({ status: 403, corpo: { erro: 'Seu acesso precisa ser atualizado pelo administrador.' } })
  })
})

describe('POST /api/usuarios — novo usuário (convite) com perfil admin ou presidente', () => {
  let admin: Usuario
  beforeEach(async () => {
    admin = await criarUsuario('admin')
  })

  const NOVO = { nome: 'Maria Souza', email: ' Maria.Souza@Goias.gov.br ', perfil: 'presidente' }

  it('401 sem login e 403 para quem não é administrador (presidente)', async () => {
    expect((await chamar(rota, 'POST', NOVO, null)).status).toBe(401)
    const presidente = await criarUsuario('presidente')
    expect((await chamar(rota, 'POST', NOVO, presidente.token)).status).toBe(403)
  })

  it('dados inválidos → 400 por campo; perfis antigos não existem mais', async () => {
    const r = await chamar(rota, 'POST', { nome: '', email: 'x', perfil: 'relator' }, admin.token)
    expect(r.status).toBe(400)
    expect(r.corpo?.campos).toMatchObject({ perfil: 'Perfil inválido: use admin ou presidente.' })
    expect(Object.keys(r.corpo?.campos ?? {}).sort()).toEqual(['email', 'nome', 'perfil'])
    const antigo = await chamar(rota, 'POST', { ...NOVO, admin: false, permissoes: ['nivelD1'], comissao: 'membro' }, admin.token)
    expect(antigo).toMatchObject({
      status: 400,
      corpo: { campos: { admin: 'Campo não permitido.', permissoes: 'Campo não permitido.', comissao: 'Campo não permitido.' } },
    })
  })

  it('cria a conta no Authentication e o cadastro com o perfil, com histórico; a senha é definida pela pessoa', async () => {
    const r = await chamar(rota, 'POST', NOVO, admin.token)
    expect(r).toMatchObject({ status: 201, corpo: { email: 'maria.souza@goias.gov.br' } })
    const uid = r.corpo?.uid as string
    expect(await auth().getUser(uid)).toMatchObject({ email: 'maria.souza@goias.gov.br', displayName: 'Maria Souza', disabled: false })
    expect(await ler(`usuarios/${uid}`)).toEqual(
      expect.objectContaining({ email: 'maria.souza@goias.gov.br', nome: 'Maria Souza', perfil: 'presidente', ativo: true }),
    )
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

  it('administrador novo: perfil admin', async () => {
    const r = await chamar(rota, 'POST', { nome: 'Outra Admin', email: 'outra@goias.gov.br', perfil: 'admin' }, admin.token)
    expect(r.status).toBe(201)
    expect(await ler(`usuarios/${r.corpo?.uid as string}`)).toMatchObject({ perfil: 'admin' })
  })
})

describe('PATCH /api/usuarios — perfil, nome e desativação', () => {
  let admin: Usuario
  let presidente: Usuario
  let antigo: Usuario
  beforeEach(async () => {
    admin = await criarUsuario('admin')
    presidente = await criarUsuario('presidente')
    antigo = await criarUsuario('antigo')
  })

  const OSC = { cnpj: '11222333000181', razaoSocial: 'Instituto Esperança' }

  it('403 para quem não é administrador; 404 para uid sem cadastro; 400 sem nada a alterar ou perfil antigo', async () => {
    expect((await chamar(rota, 'PATCH', { uid: presidente.uid, perfil: 'admin' }, presidente.token)).status).toBe(403)
    expect((await chamar(rota, 'PATCH', { uid: 'nao-existe', perfil: 'admin' }, admin.token)).status).toBe(404)
    expect((await chamar(rota, 'PATCH', { uid: presidente.uid }, admin.token)).status).toBe(400)
    expect((await chamar(rota, 'PATCH', { uid: presidente.uid, perfil: 'membro' }, admin.token)).status).toBe(400)
    expect((await chamar(rota, 'PATCH', { uid: presidente.uid, permissoes: ['oscs'] }, admin.token)).status).toBe(400)
  })

  it('cadastro antigo recebe perfil novo: acesso vale na hora e os campos antigos saem (histórico)', async () => {
    expect((await chamar(oscs, 'POST', OSC, antigo.token)).status).toBe(403)
    const r = await chamar(rota, 'PATCH', { uid: antigo.uid, perfil: 'presidente' }, admin.token)
    expect(r.status).toBe(200)
    expect((await chamar(oscs, 'POST', OSC, antigo.token)).status).toBe(201)
    const cadastro = await ler(`usuarios/${antigo.uid}`)
    expect(cadastro).toMatchObject({ perfil: 'presidente' })
    for (const campo of ['admin', 'permissoes', 'comissao']) expect(cadastro).not.toHaveProperty(campo)
    const [registro] = await auditoriaDe(`usuarios/${antigo.uid}`)
    expect(registro).toMatchObject({ acao: 'editar', antes: { comissao: 'relator' }, depois: { perfil: 'presidente' } })
    expect(registro?.depois).not.toHaveProperty('comissao')
  })

  it('trocar perfil (presidente ↔ admin) e nome', async () => {
    await chamar(rota, 'PATCH', { uid: presidente.uid, perfil: 'admin', nome: 'Novo Nome' }, admin.token)
    expect(await ler(`usuarios/${presidente.uid}`)).toMatchObject({ perfil: 'admin', nome: 'Novo Nome' })
    await chamar(rota, 'PATCH', { uid: presidente.uid, perfil: 'presidente' }, admin.token)
    expect(await ler(`usuarios/${presidente.uid}`)).toMatchObject({ perfil: 'presidente' })
  })

  it('desativar: bloqueia a conta e encerra as sessões; reativar libera', async () => {
    expect((await chamar(rota, 'PATCH', { uid: presidente.uid, ativo: false }, admin.token)).status).toBe(200)
    expect((await auth().getUser(presidente.uid)).disabled).toBe(true)
    expect((await chamar(oscs, 'POST', OSC, presidente.token)).status).toBe(401)
    await chamar(rota, 'PATCH', { uid: presidente.uid, ativo: true }, admin.token)
    expect((await auth().getUser(presidente.uid)).disabled).toBe(false)
    expect(await ler(`usuarios/${presidente.uid}`)).toMatchObject({ ativo: true })
  })

  it('o administrador não tira o próprio perfil de administrador nem desativa a própria conta (409)', async () => {
    const r1 = await chamar(rota, 'PATCH', { uid: admin.uid, perfil: 'presidente' }, admin.token)
    expect(r1).toMatchObject({ status: 409, corpo: { erro: 'Você não pode tirar o seu próprio acesso de administrador.' } })
    const r2 = await chamar(rota, 'PATCH', { uid: admin.uid, ativo: false }, admin.token)
    expect(r2).toMatchObject({ status: 409, corpo: { erro: 'Você não pode desativar a sua própria conta.' } })
    expect(await ler(`usuarios/${admin.uid}`)).toMatchObject({ perfil: 'admin', ativo: true })
  })
})
