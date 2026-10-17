import { Timestamp } from 'firebase-admin/firestore'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { obterAdmin } from '../../api/_lib/admin'
import * as rota from '../../api/sessao'
import {
  CH,
  PRESENTES,
  PROP,
  auditoriaDe,
  chamar,
  criarUsuario,
  ler,
  limparAuth,
  limparFirestore,
  semearProposta,
  semearSessao,
  totalAuditoria,
  type Usuario,
} from './apoio'

let presidente: Usuario
let admin: Usuario
let antigo: Usuario

beforeAll(async () => {
  await limparAuth()
  ;[presidente, admin, antigo] = await Promise.all([criarUsuario('presidente'), criarUsuario('admin'), criarUsuario('antigo')])
})

beforeEach(async () => {
  await limparFirestore()
  await semearProposta({ sessao: null })
  // Lote L2 com uma proposta, fora da pauta das sessões abertas com ['L1'].
  const { db } = obterAdmin()
  await db.doc(`chamamentos/${CH}`).update({ lotes: [{ codigo: 'L1', descricao: 'Lote 1' }, { codigo: 'L2', descricao: 'Lote 2' }] })
  await db.doc(`chamamentos/${CH}/propostas/p2`).set({ loteCodigo: 'L2', oscCnpj: '11222333000181', bloqueada: false })
})

const abertura = (dados: Record<string, unknown> = {}) => ({ chamamentoId: CH, data: '2026-11-10', lotes: ['L1'], presentes: PRESENTES, ...dados })

async function abrir(dados: Record<string, unknown> = {}, quem = presidente): Promise<string> {
  const r = await chamar(rota, 'POST', abertura(dados), quem.token)
  expect(r.status).toBe(201)
  return r.corpo?.id as string
}

const caminhoSessao = (id: string) => `chamamentos/${CH}/sessoes/${id}`
const alterar = (sessaoId: string, dados: Record<string, unknown>) => ({ chamamentoId: CH, sessaoId, ...dados })

describe('/api/sessao — acesso (admin e presidente fazem tudo)', () => {
  it('405 com Allow, 401 sem token, 403 para cadastro antigo', async () => {
    const r = await chamar(rota, 'PUT', undefined, presidente.token)
    expect(r.status).toBe(405)
    expect(r.headers.get('Allow')).toBe('GET, POST, PATCH')
    expect((await chamar(rota, 'POST', abertura(), null)).status).toBe(401)
    expect((await chamar(rota, 'POST', abertura(), antigo.token)).status).toBe(403)
    expect(await totalAuditoria()).toBe(0)
  })

  it('presidente e admin abrem, conduzem e encerram', async () => {
    const id = await abrir({}, admin)
    expect((await chamar(rota, 'PATCH', alterar(id, { acao: 'foco', foco: null }), presidente.token)).status).toBe(200)
    expect((await chamar(rota, 'PATCH', alterar(id, { acao: 'foco', foco: null }), antigo.token)).status).toBe(403)
    expect((await chamar(rota, 'PATCH', alterar(id, { acao: 'encerrar' }), presidente.token)).status).toBe(200)
    await abrir({}, presidente)
  })
})

describe('/api/sessao — abrir (data, lote(s) em pauta e presentes por nome)', () => {
  it('grava a sessão aberta com lotes e presentes (nome e papel), sem login nem declarações, auditada', async () => {
    const id = await abrir({ presentes: [{ nome: '  Ana Presidente ', papel: 'presidente' }, ...PRESENTES.slice(1)] })
    const sessao = await ler(caminhoSessao(id))
    expect(sessao).toMatchObject({
      data: '2026-11-10',
      status: 'aberta',
      lotes: ['L1'],
      presentes: PRESENTES,
      foco: null,
      abertaPor: { uid: presidente.uid, email: presidente.email },
    })
    expect(sessao).not.toHaveProperty('pauta')
    expect(sessao).not.toHaveProperty('declaracoes')
    expect(sessao?.abertaEm).toBeInstanceOf(Timestamp)
    const [registro] = await auditoriaDe(caminhoSessao(id))
    expect(registro).toMatchObject({ acao: 'criar', antes: null, uid: presidente.uid, perfil: 'presidente' })
  })

  it.each([
    ['data inexistente', { data: '2026-02-30' }, 'data', 'Data inválida (use AAAA-MM-DD).'],
    ['sem lote', { lotes: [] }, 'lotes', 'Informe ao menos um lote.'],
    ['lote repetido', { lotes: ['L1', 'L1'] }, 'lotes', 'Há lotes repetidos.'],
    ['lote inexistente no chamamento', { lotes: ['L1', 'L9'] }, 'lotes', 'Lote não encontrado neste chamamento: L9.'],
    ['sem presidente', { presentes: PRESENTES.slice(1) }, 'presentes', 'Informe exatamente um presidente.'],
    ['dois presidentes', { presentes: [...PRESENTES, { nome: 'Davi', papel: 'presidente' }] }, 'presentes', 'Informe exatamente um presidente.'],
    ['nomes repetidos (maiúsculas e espaços não contam)', { presentes: [...PRESENTES, { nome: ' bruno  membro', papel: 'membro' }] }, 'presentes', 'Há nomes repetidos.'],
    ['nome vazio', { presentes: [{ nome: ' ', papel: 'presidente' }] }, 'presentes.0.nome', 'Informe o nome.'],
    ['papel antigo (relator)', { presentes: [...PRESENTES, { nome: 'Edu', papel: 'relator' }] }, 'presentes.3.papel', 'Papel inválido: use presidente ou membro.'],
  ])('%s → 400', async (_caso, ajuste, campo, mensagem) => {
    const r = await chamar(rota, 'POST', abertura(ajuste), presidente.token)
    expect(r).toMatchObject({ status: 400, corpo: { campos: { [campo]: mensagem } } })
    expect(await totalAuditoria()).toBe(0)
  })

  it('campos do modelo anterior (pauta de propostas, declarações, presentes por uid) → 400', async () => {
    const r = await chamar(rota, 'POST', abertura({ pauta: [PROP], declaracoes: [] }), presidente.token)
    expect(r).toMatchObject({ status: 400, corpo: { campos: { pauta: 'Campo não permitido.', declaracoes: 'Campo não permitido.' } } })
    const uids = await chamar(rota, 'POST', abertura({ presentes: [presidente.uid] }), presidente.token)
    expect(uids.status).toBe(400)
  })

  it('chamamento inexistente → 404', async () => {
    const r = await chamar(rota, 'POST', abertura({ chamamentoId: 'nao-existe' }), presidente.token)
    expect(r).toMatchObject({ status: 404, corpo: { erro: 'Chamamento não encontrado.' } })
  })

  it('já existe sessão aberta no chamamento → 409', async () => {
    await abrir()
    const r = await chamar(rota, 'POST', abertura(), presidente.token)
    expect(r).toMatchObject({ status: 409, corpo: { erro: 'Já existe sessão aberta neste chamamento: encerre-a antes de abrir outra.' } })
  })
})

describe('/api/sessao — presentes e foco', () => {
  it('atualiza presentes (mesmas regras: um presidente, nomes únicos); auditado com antes e depois', async () => {
    const id = await abrir()
    const novos = [{ nome: 'Ana Presidente', papel: 'presidente' }, { nome: 'Fábio Membro', papel: 'membro' }]
    expect((await chamar(rota, 'PATCH', alterar(id, { acao: 'presentes', presentes: novos }), presidente.token)).status).toBe(200)
    expect((await ler(caminhoSessao(id)))?.presentes).toEqual(novos)
    const registro = (await auditoriaDe(caminhoSessao(id))).at(-1)
    expect((registro?.antes?.presentes as unknown[]).length).toBe(3)
    expect((registro?.depois?.presentes as unknown[]).length).toBe(2)

    const semPresidente = await chamar(rota, 'PATCH', alterar(id, { acao: 'presentes', presentes: novos.slice(1) }), presidente.token)
    expect(semPresidente).toMatchObject({ status: 400, corpo: { campos: { presentes: 'Informe exatamente um presidente.' } } })
  })

  it('declarações de impedimento não existem mais → 400 (ação inválida)', async () => {
    const id = await abrir()
    const r = await chamar(rota, 'PATCH', alterar(id, { acao: 'declaracoes', declaracoes: [] }), presidente.token)
    expect(r.status).toBe(400)
    expect(r.corpo?.campos).toHaveProperty('acao')
  })

  it.each([
    ['admissibilidade', { tipo: 'admissibilidade', propostaId: PROP }],
    ['subcritério', { tipo: 'subcriterio', propostaId: PROP, subcriterio: '2.1' }],
    ['D2', { tipo: 'd2', propostaId: PROP }],
    ['resumo', { tipo: 'resumo', propostaId: PROP }],
  ])('foco do tipo %s em proposta de lote da pauta; null limpa; auditado', async (_tipo, foco) => {
    const id = await abrir()
    expect((await chamar(rota, 'PATCH', alterar(id, { acao: 'foco', foco }), presidente.token)).status).toBe(200)
    expect((await ler(caminhoSessao(id)))?.foco).toEqual(foco)
    expect((await auditoriaDe(caminhoSessao(id))).at(-1)).toMatchObject({ acao: 'editar', depois: { foco } })
    expect((await chamar(rota, 'PATCH', alterar(id, { acao: 'foco', foco: null }), admin.token)).status).toBe(200)
    expect((await ler(caminhoSessao(id)))?.foco).toBeNull()
  })

  it.each([
    ['proposta de lote fora da pauta', { tipo: 'resumo', propostaId: 'p2' }, 'foco.propostaId', 'Proposta fora da pauta da sessão.'],
    ['proposta inexistente', { tipo: 'resumo', propostaId: 'p9' }, 'foco.propostaId', 'Proposta fora da pauta da sessão.'],
    ['subcritério inexistente', { tipo: 'subcriterio', propostaId: PROP, subcriterio: '9.9' }, 'foco.subcriterio', 'Subcritério inexistente na matriz.'],
    ['subcritério ausente no tipo subcritério', { tipo: 'subcriterio', propostaId: PROP }, 'foco.subcriterio', 'Informe o subcritério.'],
    ['tipo desconhecido', { tipo: 'classificacao', propostaId: PROP }, 'foco.tipo', 'Tipo de foco inválido. Use admissibilidade, subcriterio, d2 ou resumo.'],
  ])('foco com %s → 400', async (_caso, foco, campo, mensagem) => {
    const id = await abrir()
    const r = await chamar(rota, 'PATCH', alterar(id, { acao: 'foco', foco }), presidente.token)
    expect(r).toMatchObject({ status: 400, corpo: { campos: { [campo]: mensagem } } })
  })

  it('ação desconhecida → 400; sessão inexistente → 404', async () => {
    const id = await abrir()
    const r = await chamar(rota, 'PATCH', alterar(id, { acao: 'suspender' }), presidente.token)
    expect(r.status).toBe(400)
    expect(r.corpo?.campos).toHaveProperty('acao')
    const r404 = await chamar(rota, 'PATCH', alterar('nao-existe', { acao: 'foco', foco: null }), presidente.token)
    expect(r404).toMatchObject({ status: 404, corpo: { erro: 'Sessão não encontrada.' } })
  })
})

describe('/api/sessao — encerrar', () => {
  it('encerra: status, encerradaPor/Em e foco limpo, auditado', async () => {
    const id = await abrir()
    await chamar(rota, 'PATCH', alterar(id, { acao: 'foco', foco: { tipo: 'subcriterio', propostaId: PROP, subcriterio: '1.1' } }), presidente.token)
    expect((await chamar(rota, 'PATCH', alterar(id, { acao: 'encerrar' }), presidente.token)).status).toBe(200)
    const sessao = await ler(caminhoSessao(id))
    expect(sessao).toMatchObject({ status: 'encerrada', foco: null, encerradaPor: { uid: presidente.uid } })
    expect(sessao?.encerradaEm).toBeInstanceOf(Timestamp)
    expect((await auditoriaDe(caminhoSessao(id))).at(-1)).toMatchObject({ acao: 'editar', antes: { status: 'aberta' }, depois: { status: 'encerrada' } })
  })

  it('sessão encerrada não aceita alterações → 409; nova sessão pode ser aberta', async () => {
    const id = await abrir()
    await chamar(rota, 'PATCH', alterar(id, { acao: 'encerrar' }), presidente.token)
    for (const corpo of [{ acao: 'encerrar' }, { acao: 'foco', foco: null }, { acao: 'presentes', presentes: PRESENTES }]) {
      const r = await chamar(rota, 'PATCH', alterar(id, corpo), presidente.token)
      expect(r).toMatchObject({ status: 409, corpo: { erro: 'Sessão encerrada: alteração não permitida.' } })
    }
    await abrir()
  })

  it('sessão encerrada semeada também bloqueia', async () => {
    await semearSessao('antiga', { status: 'encerrada' })
    expect((await chamar(rota, 'PATCH', alterar('antiga', { acao: 'foco', foco: null }), presidente.token)).status).toBe(409)
  })
})
