import { Timestamp } from 'firebase-admin/firestore'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import * as rota from '../../api/sessao'
import {
  CH,
  PROP,
  auditoriaDe,
  chamar,
  criarUsuario,
  ler,
  limparAuth,
  limparFirestore,
  registrarUsuario,
  semearProposta,
  semearSessao,
  totalAuditoria,
  type Usuario,
} from './apoio'

let presidente: Usuario
let relator: Usuario
let membro: Usuario
let admin: Usuario

beforeAll(async () => {
  await limparAuth()
  ;[presidente, relator, membro, admin] = await Promise.all([
    criarUsuario('presidente'),
    criarUsuario('relator'),
    criarUsuario('membro'),
    criarUsuario('admin'),
  ])
})

beforeEach(async () => {
  await limparFirestore()
  await semearProposta({ sessao: null })
  await Promise.all([
    registrarUsuario(presidente, 'presidente'),
    registrarUsuario(relator, 'relator'),
    registrarUsuario(membro, 'membro'),
    registrarUsuario(admin, 'admin'),
  ])
})

const abertura = (dados: Record<string, unknown> = {}) => ({
  chamamentoId: CH,
  data: '2026-11-10',
  pauta: [PROP],
  presentes: [presidente.uid, relator.uid, membro.uid],
  declaracoes: [
    { uid: presidente.uid, semImpedimento: true },
    { uid: relator.uid, semImpedimento: true },
    { uid: membro.uid, semImpedimento: true },
  ],
  ...dados,
})

async function abrir(dados: Record<string, unknown> = {}): Promise<string> {
  const r = await chamar(rota, 'POST', abertura(dados), presidente.token)
  expect(r.status).toBe(201)
  return r.corpo?.id as string
}

const caminhoSessao = (id: string) => `chamamentos/${CH}/sessoes/${id}`
const alterar = (sessaoId: string, dados: Record<string, unknown>) => ({ chamamentoId: CH, sessaoId, ...dados })

describe('/api/sessao — acesso', () => {
  it('405 com Allow, 401 sem token', async () => {
    const r = await chamar(rota, 'GET', undefined, presidente.token)
    expect(r.status).toBe(405)
    expect(r.headers.get('Allow')).toBe('POST, PATCH')
    expect((await chamar(rota, 'POST', abertura(), null)).status).toBe(401)
  })

  it('abrir: só o presidente (relator, membro e admin → 403)', async () => {
    for (const usuario of [relator, membro, admin]) {
      expect((await chamar(rota, 'POST', abertura(), usuario.token)).status).toBe(403)
    }
    expect(await totalAuditoria()).toBe(0)
  })

  it('alterar: presidente e relator; membro e admin → 403', async () => {
    const id = await abrir()
    const corpo = alterar(id, { acao: 'foco', foco: null })
    expect((await chamar(rota, 'PATCH', corpo, membro.token)).status).toBe(403)
    expect((await chamar(rota, 'PATCH', corpo, admin.token)).status).toBe(403)
    expect((await chamar(rota, 'PATCH', corpo, relator.token)).status).toBe(200)
  })

  it('encerrar: só o presidente (relator → 403)', async () => {
    const id = await abrir()
    const r = await chamar(rota, 'PATCH', alterar(id, { acao: 'encerrar' }), relator.token)
    expect(r).toMatchObject({ status: 403, corpo: { erro: 'Seu perfil não tem permissão para esta operação.' } })
  })
})

describe('/api/sessao — abrir', () => {
  it('grava a sessão aberta com presentes, declarações e pauta, auditada', async () => {
    const id = await abrir()
    const sessao = await ler(caminhoSessao(id))
    expect(sessao).toMatchObject({
      data: '2026-11-10',
      status: 'aberta',
      pauta: [PROP],
      presentes: [
        { uid: presidente.uid, email: presidente.email, perfil: 'presidente' },
        { uid: relator.uid, email: relator.email, perfil: 'relator' },
        { uid: membro.uid, email: membro.email, perfil: 'membro' },
      ],
      declaracoes: [
        { uid: presidente.uid, semImpedimento: true },
        { uid: relator.uid, semImpedimento: true },
        { uid: membro.uid, semImpedimento: true },
      ],
      foco: null,
      abertaPor: { uid: presidente.uid, email: presidente.email },
    })
    expect(sessao?.abertaEm).toBeInstanceOf(Timestamp)
    const [registro] = await auditoriaDe(caminhoSessao(id))
    expect(registro).toMatchObject({ acao: 'criar', antes: null, uid: presidente.uid, perfil: 'presidente' })
  })

  it('presentes e declarações são opcionais na abertura', async () => {
    const id = await abrir({ presentes: undefined, declaracoes: undefined })
    expect(await ler(caminhoSessao(id))).toMatchObject({ presentes: [], declaracoes: [] })
  })

  it.each([
    ['data inexistente', { data: '2026-02-30' }, 'data', 'Data inválida (use AAAA-MM-DD).'],
    ['pauta vazia', { pauta: [] }, 'pauta', 'Informe ao menos uma proposta na pauta.'],
    ['proposta da pauta inexistente', { pauta: [PROP, 'p9'] }, 'pauta', 'Proposta não encontrada: p9.'],
  ])('%s → 400', async (_caso, ajuste, campo, mensagem) => {
    const r = await chamar(rota, 'POST', abertura(ajuste), presidente.token)
    expect(r).toMatchObject({ status: 400, corpo: { campos: { [campo]: mensagem } } })
    expect(await totalAuditoria()).toBe(0)
  })

  it('presente que não é da Comissão (admin) → 400', async () => {
    const r = await chamar(rota, 'POST', abertura({ presentes: [presidente.uid, admin.uid], declaracoes: [] }), presidente.token)
    expect(r).toMatchObject({ status: 400, corpo: { campos: { presentes: `Não é membro da Comissão: ${admin.email}.` } } })
  })

  it('declaração de quem não está presente → 400', async () => {
    const r = await chamar(
      rota,
      'POST',
      abertura({ presentes: [presidente.uid], declaracoes: [{ uid: membro.uid, semImpedimento: true }] }),
      presidente.token,
    )
    expect(r).toMatchObject({ status: 400, corpo: { campos: { declaracoes: `Declaração de quem não está presente: ${membro.email}.` } } })
  })

  it('impedimento declarado exige motivo → 400', async () => {
    const r = await chamar(
      rota,
      'POST',
      abertura({ declaracoes: [{ uid: membro.uid, semImpedimento: false }] }),
      presidente.token,
    )
    expect(r).toMatchObject({ status: 400, corpo: { campos: { 'declaracoes.0.motivo': 'Informe o motivo do impedimento.' } } })
  })

  it('chamamento inexistente → 404', async () => {
    const r = await chamar(rota, 'POST', abertura({ chamamentoId: 'nao-existe' }), presidente.token)
    expect(r).toMatchObject({ status: 404, corpo: { erro: 'Chamamento não encontrado.' } })
  })

  it('já existe sessão aberta no chamamento → 409', async () => {
    await abrir()
    const r = await chamar(rota, 'POST', abertura(), presidente.token)
    expect(r).toMatchObject({
      status: 409,
      corpo: { erro: 'Já existe sessão aberta neste chamamento: encerre-a antes de abrir outra.' },
    })
  })
})

describe('/api/sessao — presentes, declarações e foco', () => {
  it('relator atualiza presentes; quem sai perde a declaração; auditado com antes e depois', async () => {
    const id = await abrir()
    const r = await chamar(rota, 'PATCH', alterar(id, { acao: 'presentes', presentes: [presidente.uid, relator.uid] }), relator.token)
    expect(r.status).toBe(200)
    const sessao = await ler(caminhoSessao(id))
    expect((sessao?.presentes as { uid: string }[]).map((p) => p.uid)).toEqual([presidente.uid, relator.uid])
    expect((sessao?.declaracoes as { uid: string }[]).map((d) => d.uid)).toEqual([presidente.uid, relator.uid])
    const registro = (await auditoriaDe(caminhoSessao(id))).at(-1)
    expect(registro).toMatchObject({ acao: 'editar', uid: relator.uid, perfil: 'relator' })
    expect((registro?.antes?.presentes as unknown[]).length).toBe(3)
    expect((registro?.depois?.presentes as unknown[]).length).toBe(2)
  })

  it('declarações: impedimento com motivo é registrado', async () => {
    const id = await abrir({ declaracoes: [] })
    const declaracoes = [{ uid: membro.uid, semImpedimento: false, motivo: 'Parente de dirigente da OSC da proposta p1.' }]
    expect((await chamar(rota, 'PATCH', alterar(id, { acao: 'declaracoes', declaracoes }), presidente.token)).status).toBe(200)
    expect((await ler(caminhoSessao(id)))?.declaracoes).toEqual(declaracoes)
  })

  it('foco: proposta da pauta e subcritério da matriz; null limpa', async () => {
    const id = await abrir()
    const foco = { propostaId: PROP, subcriterio: '2.1' }
    expect((await chamar(rota, 'PATCH', alterar(id, { acao: 'foco', foco }), relator.token)).status).toBe(200)
    expect((await ler(caminhoSessao(id)))?.foco).toEqual(foco)
    expect((await chamar(rota, 'PATCH', alterar(id, { acao: 'foco', foco: null }), relator.token)).status).toBe(200)
    expect((await ler(caminhoSessao(id)))?.foco).toBeNull()
  })

  it.each([
    ['proposta fora da pauta', { propostaId: 'p9', subcriterio: '2.1' }, 'foco.propostaId', 'Proposta fora da pauta da sessão.'],
    ['subcritério inexistente', { propostaId: PROP, subcriterio: '9.9' }, 'foco.subcriterio', 'Subcritério inexistente na matriz.'],
  ])('foco com %s → 400', async (_caso, foco, campo, mensagem) => {
    const id = await abrir()
    const r = await chamar(rota, 'PATCH', alterar(id, { acao: 'foco', foco }), relator.token)
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
  it('presidente encerra: status, encerradaPor/Em e foco limpo, auditado', async () => {
    const id = await abrir()
    await chamar(rota, 'PATCH', alterar(id, { acao: 'foco', foco: { propostaId: PROP, subcriterio: '1.1' } }), relator.token)
    const r = await chamar(rota, 'PATCH', alterar(id, { acao: 'encerrar' }), presidente.token)
    expect(r.status).toBe(200)
    const sessao = await ler(caminhoSessao(id))
    expect(sessao).toMatchObject({ status: 'encerrada', foco: null, encerradaPor: { uid: presidente.uid } })
    expect(sessao?.encerradaEm).toBeInstanceOf(Timestamp)
    expect((await auditoriaDe(caminhoSessao(id))).at(-1)).toMatchObject({
      acao: 'editar',
      antes: { status: 'aberta' },
      depois: { status: 'encerrada' },
    })
  })

  it('sessão encerrada não aceita alterações → 409; nova sessão pode ser aberta', async () => {
    const id = await abrir()
    await chamar(rota, 'PATCH', alterar(id, { acao: 'encerrar' }), presidente.token)
    for (const corpo of [{ acao: 'encerrar' }, { acao: 'foco', foco: null }, { acao: 'presentes', presentes: [] }]) {
      const r = await chamar(rota, 'PATCH', alterar(id, corpo), presidente.token)
      expect(r).toMatchObject({ status: 409, corpo: { erro: 'Sessão encerrada: alteração não permitida.' } })
    }
    await abrir()
  })

  it('sessão encerrada semeada também bloqueia', async () => {
    await semearSessao('antiga', { status: 'encerrada' })
    const r = await chamar(rota, 'PATCH', alterar('antiga', { acao: 'foco', foco: null }), relator.token)
    expect(r.status).toBe(409)
  })
})
