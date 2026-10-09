import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { obterAdmin } from '../../api/_lib/admin'
import * as rota from '../../api/propostas'
import { auditoriaDe, chamar, criarUsuario, ler, limparAuth, limparFirestore, totalAuditoria, type Usuario } from './apoio'

const CNPJ = '11222333000181'
const VALIDA = {
  chamamentoId: 'ch1',
  loteCodigo: 'L1',
  oscCnpj: '11.222.333/0001-81',
  protocolo: 'PROT-2026-0001',
  numeroSei: '95574999',
  observacao: 'Entregue em mídia física',
}

let admin: Usuario
let membro: Usuario

beforeAll(async () => {
  await limparAuth()
  admin = await criarUsuario('admin')
  membro = await criarUsuario('membro')
})

beforeEach(async () => {
  await limparFirestore()
  const { db } = obterAdmin()
  await db.doc('chamamentos/ch1').set({ numero: '001/2026', titulo: 'Chamamento', lotes: [{ codigo: 'L1', descricao: 'Lote 1' }, { codigo: 'L2', descricao: 'Lote 2' }] })
  await db.doc(`oscs/${CNPJ}`).set({ cnpj: CNPJ, razaoSocial: 'Instituto Esperança' })
})

async function criar(dados = VALIDA): Promise<string> {
  const r = await chamar(rota, 'POST', dados, admin.token)
  expect(r.status).toBe(201)
  return r.corpo?.id as string
}

describe('/api/propostas — acesso', () => {
  it('405, 401 e 403', async () => {
    expect((await chamar(rota, 'GET', undefined, admin.token)).status).toBe(405)
    expect((await chamar(rota, 'POST', VALIDA, null)).status).toBe(401)
    expect((await chamar(rota, 'POST', VALIDA, membro.token)).status).toBe(403)
  })
})

describe('/api/propostas — referências', () => {
  it.each([
    ['chamamento inexistente', { chamamentoId: 'nao-existe' }, 'chamamentoId', 'Chamamento não encontrado.'],
    ['lote inexistente no chamamento', { loteCodigo: 'L9' }, 'loteCodigo', 'Lote não encontrado neste chamamento.'],
    ['OSC não cadastrada', { oscCnpj: '11.444.777/0001-61' }, 'oscCnpj', 'OSC não cadastrada.'],
    ['CNPJ inválido', { oscCnpj: '11.444.777/0001-62' }, 'oscCnpj', 'CNPJ inválido.'],
  ])('%s → 400', async (_caso, ajuste, campo, mensagem) => {
    const r = await chamar(rota, 'POST', { ...VALIDA, ...ajuste }, admin.token)
    expect(r).toMatchObject({ status: 400, corpo: { campos: { [campo]: mensagem } } })
  })

  it('protocolo e nº SEI obrigatórios na criação (Etapa 4a) → 400', async () => {
    const { protocolo: _p, numeroSei: _n, ...semEles } = VALIDA
    const r = await chamar(rota, 'POST', semEles, admin.token)
    expect(r).toMatchObject({
      status: 400,
      corpo: { campos: { protocolo: 'Informe o protocolo.', numeroSei: 'Informe o nº do documento SEI.' } },
    })
  })

  it('não aceita definir "bloqueada" por este endpoint → 400', async () => {
    const r = await chamar(rota, 'POST', { ...VALIDA, bloqueada: true }, admin.token)
    expect(r).toMatchObject({ status: 400, corpo: { campos: { bloqueada: 'Campo não permitido.' } } })
  })
})

describe('/api/propostas — criar e editar', () => {
  it('criar → 201, nasce desbloqueada e auditada', async () => {
    const id = await criar()
    const caminho = `chamamentos/ch1/propostas/${id}`
    expect(await ler(caminho)).toMatchObject({
      loteCodigo: 'L1',
      oscCnpj: CNPJ,
      protocolo: 'PROT-2026-0001',
      numeroSei: '95574999',
      bloqueada: false,
    })
    const [registro] = await auditoriaDe(caminho)
    expect(registro).toMatchObject({ acao: 'criar', antes: null, depois: { oscCnpj: CNPJ }, uid: admin.uid })
  })

  it('mesma OSC no mesmo lote → 409; em outro lote → permitido', async () => {
    await criar()
    const r = await chamar(rota, 'POST', VALIDA, admin.token)
    expect(r).toMatchObject({ status: 409, corpo: { erro: 'Esta OSC já tem proposta neste lote.' } })
    await criar({ ...VALIDA, loteCodigo: 'L2' })
  })

  it('editar → 200 com antes e depois', async () => {
    const id = await criar()
    const r = await chamar(rota, 'PATCH', { chamamentoId: 'ch1', propostaId: id, observacao: 'Protocolo 456' }, admin.token)
    expect(r.status).toBe(200)
    const registros = await auditoriaDe(`chamamentos/ch1/propostas/${id}`)
    expect(registros[1]).toMatchObject({
      acao: 'editar',
      antes: { observacao: 'Entregue em mídia física' },
      depois: { observacao: 'Protocolo 456', loteCodigo: 'L1' },
    })
  })

  it('editar proposta inexistente → 404', async () => {
    const r = await chamar(rota, 'PATCH', { chamamentoId: 'ch1', propostaId: 'nao-existe', observacao: 'x' }, admin.token)
    expect(r.status).toBe(404)
  })
})

describe('/api/propostas — proposta homologada (B5)', () => {
  it('editar proposta bloqueada → 409 e nada muda', async () => {
    const id = await criar()
    await obterAdmin().db.doc(`chamamentos/ch1/propostas/${id}`).update({ bloqueada: true })
    const antes = await totalAuditoria()

    const r = await chamar(rota, 'PATCH', { chamamentoId: 'ch1', propostaId: id, observacao: 'alterada' }, admin.token)
    expect(r).toMatchObject({ status: 409, corpo: { erro: 'Proposta homologada: alteração não permitida.' } })
    expect(await ler(`chamamentos/ch1/propostas/${id}`)).toMatchObject({ observacao: 'Entregue em mídia física' })
    expect(await totalAuditoria()).toBe(antes)
  })
})
