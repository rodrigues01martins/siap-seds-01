import { Timestamp } from 'firebase-admin/firestore'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import * as rota from '../../api/diligencias'
import * as homologar from '../../api/homologar'
import { CAMINHO_PROPOSTA, CH, PROP, auditoriaDe, chamar, criarUsuario, ler, limparAuth, limparFirestore, semearProposta, totalAuditoria, type Usuario } from './apoio'
import { obterAdmin } from '../../api/_lib/admin'

let presidente: Usuario
let relator: Usuario
let membro: Usuario

beforeAll(async () => {
  await limparAuth()
  ;[presidente, relator, membro] = await Promise.all([criarUsuario('presidente'), criarUsuario('relator'), criarUsuario('membro')])
})

beforeEach(async () => {
  await limparFirestore()
  await semearProposta()
})

const PRAZO = '2099-12-31'
const nova = (dados: Record<string, unknown> = {}) => ({
  chamamentoId: CH,
  propostaId: PROP,
  objeto: 'Esclarecer a assinatura do representante legal no Caderno.',
  prazo: PRAZO,
  ...dados,
})
const alterar = (id: string, dados: Record<string, unknown>) => ({ chamamentoId: CH, propostaId: PROP, id, ...dados })

async function criar(): Promise<string> {
  const r = await chamar(rota, 'POST', nova(), relator.token)
  expect(r.status).toBe(201)
  return r.corpo?.id as string
}

const caminho = (id: string) => `${CAMINHO_PROPOSTA}/diligencias/${id}`

describe('/api/diligencias — acesso', () => {
  it('405 com Allow POST, PATCH; 401; 403 (membro)', async () => {
    const r = await chamar(rota, 'GET', undefined, relator.token)
    expect(r.status).toBe(405)
    expect(r.headers.get('Allow')).toBe('POST, PATCH')
    expect((await chamar(rota, 'POST', nova(), null)).status).toBe(401)
    expect((await chamar(rota, 'POST', nova(), membro.token)).status).toBe(403)
  })
})

describe('/api/diligencias — criar', () => {
  it('cria aberta com objeto, prazo e autoria; auditado', async () => {
    const id = await criar()
    const doc = await ler(caminho(id))
    expect(doc).toMatchObject({ objeto: nova().objeto, prazo: PRAZO, status: 'aberta', criadaPor: { uid: relator.uid } })
    expect(doc?.criadaEm).toBeInstanceOf(Timestamp)
    expect((await auditoriaDe(caminho(id)))[0]).toMatchObject({ acao: 'criar', perfil: 'relator' })
  })

  it.each([
    ['objeto curto', { objeto: 'Ver PA' }, 'objeto', 'Descreva o objeto da diligência (ao menos 10 caracteres).'],
    ['prazo inexistente', { prazo: '2026-02-30' }, 'prazo', 'Data inválida (use AAAA-MM-DD).'],
    ['prazo no passado', { prazo: '2020-01-01' }, 'prazo', 'O prazo não pode ser anterior a hoje.'],
  ])('%s → 400', async (_caso, ajuste, campo, mensagem) => {
    const r = await chamar(rota, 'POST', nova(ajuste), relator.token)
    expect(r).toMatchObject({ status: 400, corpo: { campos: { [campo]: mensagem } } })
    expect(await totalAuditoria()).toBe(0)
  })

  it('proposta inexistente → 404; homologada → 409', async () => {
    expect((await chamar(rota, 'POST', nova({ propostaId: 'nao-existe' }), relator.token)).status).toBe(404)
    await semearProposta({ bloqueada: true })
    const r = await chamar(rota, 'POST', nova(), relator.token)
    expect(r).toMatchObject({ status: 409, corpo: { erro: 'Proposta homologada: alteração não permitida.' } })
  })
})

describe('/api/diligencias — resposta e encerramento', () => {
  it('registrar resposta → respondida; encerrar → encerrada; auditados', async () => {
    const id = await criar()
    const resposta = 'OSC apresentou procuração válida (SEI 95579999).'
    expect((await chamar(rota, 'PATCH', alterar(id, { acao: 'responder', resposta }), relator.token)).status).toBe(200)
    expect(await ler(caminho(id))).toMatchObject({ status: 'respondida', resposta: { texto: resposta, registradaPor: { uid: relator.uid } } })

    const conclusao = 'Esclarecimento aceito; sem inclusão de conteúdo técnico novo.'
    expect((await chamar(rota, 'PATCH', alterar(id, { acao: 'encerrar', conclusao }), presidente.token)).status).toBe(200)
    const doc = await ler(caminho(id))
    expect(doc).toMatchObject({ status: 'encerrada', conclusao, encerradaPor: { uid: presidente.uid } })
    expect(doc?.encerradaEm).toBeInstanceOf(Timestamp)
    expect((await auditoriaDe(caminho(id))).map((a) => a.acao)).toEqual(['criar', 'editar', 'editar'])
  })

  it('400: resposta e conclusão curtas; ação desconhecida', async () => {
    const id = await criar()
    expect(await chamar(rota, 'PATCH', alterar(id, { acao: 'responder', resposta: 'ok' }), relator.token)).toMatchObject({
      status: 400,
      corpo: { campos: { resposta: 'Registre a resposta (ao menos 5 caracteres).' } },
    })
    expect(await chamar(rota, 'PATCH', alterar(id, { acao: 'encerrar', conclusao: 'ok' }), relator.token)).toMatchObject({
      status: 400,
      corpo: { campos: { conclusao: 'Registre a conclusão (ao menos 10 caracteres).' } },
    })
    const r = await chamar(rota, 'PATCH', alterar(id, { acao: 'reabrir' }), relator.token)
    expect(r.status).toBe(400)
    expect(r.corpo?.campos).toHaveProperty('acao')
  })

  it('diligência inexistente → 404; encerrada não muda → 409', async () => {
    const r404 = await chamar(rota, 'PATCH', alterar('nao-existe', { acao: 'responder', resposta: 'Resposta qualquer.' }), relator.token)
    expect(r404).toMatchObject({ status: 404, corpo: { erro: 'Diligência não encontrada.' } })
    const id = await criar()
    await chamar(rota, 'PATCH', alterar(id, { acao: 'encerrar', conclusao: 'Encerrada por decurso de prazo.' }), relator.token)
    const r = await chamar(rota, 'PATCH', alterar(id, { acao: 'responder', resposta: 'Resposta tardia.' }), relator.token)
    expect(r).toMatchObject({ status: 409, corpo: { erro: 'Diligência encerrada: alteração não permitida.' } })
  })
})

describe('homologação bloqueada por diligência em aberto (RF-28)', () => {
  it('aberta ou respondida → 409; encerrada → homologa', async () => {
    await obterAdmin().db.doc(CAMINHO_PROPOSTA).update({ totais: { status: 'apta', completa: true, pendentes: [] } })
    const id = await criar()
    const alvo = { chamamentoId: CH, propostaId: PROP }
    const mensagem = 'Proposta com diligência em aberto: encerre-a antes de homologar.'
    expect(await chamar(homologar, 'POST', alvo, presidente.token)).toMatchObject({ status: 409, corpo: { erro: mensagem } })
    await chamar(rota, 'PATCH', alterar(id, { acao: 'responder', resposta: 'Documento juntado.' }), relator.token)
    expect((await chamar(homologar, 'POST', alvo, presidente.token)).status).toBe(409)
    await chamar(rota, 'PATCH', alterar(id, { acao: 'encerrar', conclusao: 'Diligência atendida e encerrada.' }), presidente.token)
    expect((await chamar(homologar, 'POST', alvo, presidente.token)).status).toBe(200)
  })
})
