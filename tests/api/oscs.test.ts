import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import * as rota from '../../api/oscs'
import { auditoriaDe, chamar, criarUsuario, ler, limparAuth, limparFirestore, type Usuario } from './apoio'

const VALIDA = { cnpj: '11.222.333/0001-81', razaoSocial: 'Instituto Esperança', nomeFantasia: 'Esperança' }

let admin: Usuario
let presidente: Usuario

beforeAll(async () => {
  await limparAuth()
  admin = await criarUsuario('admin')
  presidente = await criarUsuario('presidente')
})
beforeEach(limparFirestore)

describe('/api/oscs — acesso', () => {
  it('405, 401 e 403', async () => {
    expect((await chamar(rota, 'DELETE', VALIDA, admin.token)).status).toBe(405)
    expect((await chamar(rota, 'POST', VALIDA, null)).status).toBe(401)
    expect((await chamar(rota, 'POST', VALIDA, presidente.token)).status).toBe(403)
  })
})

describe('/api/oscs — CNPJ', () => {
  it('CNPJ com dígito verificador errado → 400', async () => {
    const r = await chamar(rota, 'POST', { ...VALIDA, cnpj: '11.222.333/0001-82' }, admin.token)
    expect(r).toMatchObject({ status: 400, corpo: { campos: { cnpj: 'CNPJ inválido.' } } })
  })

  it('grava em oscs/{cnpj normalizado}', async () => {
    const r = await chamar(rota, 'POST', VALIDA, admin.token)
    expect(r).toMatchObject({ status: 201, corpo: { cnpj: '11222333000181' } })
    expect(await ler('oscs/11222333000181')).toMatchObject({ cnpj: '11222333000181', razaoSocial: 'Instituto Esperança' })
  })

  it('aceita CNPJ alfanumérico', async () => {
    const r = await chamar(rota, 'POST', { ...VALIDA, cnpj: '12.ABC.345/01DE-35' }, admin.token)
    expect(r).toMatchObject({ status: 201, corpo: { cnpj: '12ABC34501DE35' } })
  })

  it('CNPJ já cadastrado → 409', async () => {
    await chamar(rota, 'POST', VALIDA, admin.token)
    const r = await chamar(rota, 'POST', { ...VALIDA, cnpj: '11222333000181' }, admin.token)
    expect(r).toMatchObject({ status: 409, corpo: { erro: 'Já existe uma OSC cadastrada com este CNPJ.' } })
  })
})

describe('/api/oscs — criar e editar', () => {
  it('criação auditada', async () => {
    await chamar(rota, 'POST', VALIDA, admin.token)
    const [registro] = await auditoriaDe('oscs/11222333000181')
    expect(registro).toMatchObject({ acao: 'criar', antes: null, uid: admin.uid, perfil: 'admin' })
    expect(registro!.depois).toMatchObject({ razaoSocial: 'Instituto Esperança' })
  })

  it('edição → 200 com antes e depois', async () => {
    await chamar(rota, 'POST', VALIDA, admin.token)
    const r = await chamar(rota, 'PATCH', { cnpj: '11222333000181', razaoSocial: 'Instituto Nova Esperança' }, admin.token)
    expect(r.status).toBe(200)
    const registros = await auditoriaDe('oscs/11222333000181')
    expect(registros[1]).toMatchObject({
      acao: 'editar',
      antes: { razaoSocial: 'Instituto Esperança' },
      depois: { razaoSocial: 'Instituto Nova Esperança', nomeFantasia: 'Esperança' },
    })
  })

  it('editar OSC inexistente → 404', async () => {
    expect((await chamar(rota, 'PATCH', { cnpj: '11.444.777/0001-61', razaoSocial: 'Outra OSC' }, admin.token)).status).toBe(404)
  })
})
