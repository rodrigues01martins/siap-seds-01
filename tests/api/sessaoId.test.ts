// Toda gravação feita pela Comissão em sessão guarda o sessaoId (base do reset da sessão):
// admissibilidade, níveis da D1, experiências da D2 e desempate exigem sessão aberta do chamamento e
// gravam o sessaoId no documento e em CADA registro de auditoria da operação (inclusive totais e foco).
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { obterAdmin } from '../../api/_lib/admin'
import * as admissibilidade from '../../api/admissibilidade'
import * as avaliacao from '../../api/avaliacao'
import * as desempate from '../../api/desempate'
import * as experiencia from '../../api/experiencia'
import {
  CAMINHO_PROPOSTA,
  CH,
  PROP,
  SESSAO,
  chamar,
  criarUsuario,
  ler,
  limparAuth,
  limparFirestore,
  semearProposta,
  semearPropostaComTotais,
  semearSessao,
  totalAuditoria,
  type RegistroAuditoria,
  type Usuario,
} from './apoio'

const SEM_SESSAO = 'Avaliação só pode ser registrada em sessão aberta da Comissão.'
const FORA_DA_PAUTA = 'Proposta fora da pauta da sessão.'

const ADMISSIBILIDADE = {
  chamamentoId: CH,
  propostaId: PROP,
  requisitos: Object.fromEntries(['I', 'II', 'III', 'IV', 'V', 'VI', 'VIII', 'IX', 'X'].map((n) => [`28.1.${n}`, true])),
  irregularidadesFormais: [],
  planos: [12, 12, 8, 12, 10, 8].map((limite, i, todos) => {
    const inicio = 3 + todos.slice(0, i).reduce((a, b) => a + b, 0)
    return { codigo: `PA${i + 1}`, ausente: false, paginaInicial: inicio, paginaFinal: inicio + limite - 1 }
  }),
  resultado: 'admitida',
}
const EXPERIENCIA = { chamamentoId: CH, propostaId: PROP, descricao: 'Projeto esportivo', categorias: ['C'], modalidade: 'outra', inicio: '2020-01-01' }
const NIVEL = { chamamentoId: CH, propostaId: PROP, codigo: '1.1', nivel: 3, justificativa: 'Justificativa suficiente para o teste.', paginas: [], decisao: 'unanimidade' }
const DESEMPATE = { chamamentoId: CH, loteCodigo: 'L1', ordem: ['c', 'b'], justificativa: 'Critério aplicado pela Comissão em sessão: maior pontuação no PA1.' }

let presidente: Usuario

beforeAll(async () => {
  await limparAuth()
  presidente = await criarUsuario('presidente')
})

beforeEach(async () => {
  await limparFirestore()
  await semearProposta()
})

async function auditoriaDaOperacao(): Promise<RegistroAuditoria[]> {
  return (await obterAdmin().db.collection('auditoria').get()).docs.map((d) => d.data() as RegistroAuditoria & { sessaoId?: string })
}

describe('sessaoId obrigatório e de sessão aberta', () => {
  it.each([
    ['admissibilidade', admissibilidade, 'PUT', ADMISSIBILIDADE],
    ['experiência (criar)', experiencia, 'POST', EXPERIENCIA],
    ['desempate', desempate, 'PUT', DESEMPATE],
  ] as const)('%s: sem sessaoId → 400; sessão encerrada ou inexistente → 409; nada gravado', async (_caso, rota, metodo, corpo) => {
    const sem = await chamar(rota, metodo, corpo, presidente.token)
    expect(sem.status).toBe(400)
    expect(sem.corpo?.campos).toHaveProperty('sessaoId')

    expect(await chamar(rota, metodo, { ...corpo, sessaoId: 'nao-existe' }, presidente.token)).toMatchObject({ status: 409, corpo: { erro: SEM_SESSAO } })
    await semearSessao(SESSAO, { status: 'encerrada' })
    expect(await chamar(rota, metodo, { ...corpo, sessaoId: SESSAO }, presidente.token)).toMatchObject({ status: 409, corpo: { erro: SEM_SESSAO } })
    expect(await totalAuditoria()).toBe(0)
  })

  it.each([
    ['admissibilidade', admissibilidade, 'PUT', ADMISSIBILIDADE],
    ['experiência (criar)', experiencia, 'POST', EXPERIENCIA],
  ] as const)('%s: proposta fora da pauta da sessão → 409', async (_caso, rota, metodo, corpo) => {
    await semearSessao(SESSAO, { lotes: ['L2'] })
    expect(await chamar(rota, metodo, { ...corpo, sessaoId: SESSAO }, presidente.token)).toMatchObject({ status: 409, corpo: { erro: FORA_DA_PAUTA } })
  })
})

describe('sessaoId gravado no documento e em cada registro de auditoria', () => {
  it('admissibilidade', async () => {
    expect((await chamar(admissibilidade, 'PUT', { ...ADMISSIBILIDADE, sessaoId: SESSAO }, presidente.token)).status).toBe(200)
    expect(await ler(CAMINHO_PROPOSTA)).toMatchObject({ admissibilidade: { situacao: 'admitida', sessaoId: SESSAO } })
    const registros = await auditoriaDaOperacao()
    expect(registros.length).toBeGreaterThan(0)
    for (const r of registros) expect(r).toMatchObject({ sessaoId: SESSAO })
  })

  it('nível da D1 (avaliação, totais, resultado da D2 e foco da sessão)', async () => {
    expect((await chamar(avaliacao, 'PUT', { ...NIVEL, sessaoId: SESSAO }, presidente.token)).status).toBe(200)
    expect(await ler(`${CAMINHO_PROPOSTA}/avaliacoes/1.1`)).toMatchObject({ sessaoId: SESSAO })
    const registros = await auditoriaDaOperacao()
    expect(registros.map((r) => r.caminho).sort()).toEqual(
      [`${CAMINHO_PROPOSTA}/avaliacoes/1.1`, CAMINHO_PROPOSTA, `${CAMINHO_PROPOSTA}/resultadoD2/atual`, `chamamentos/${CH}/sessoes/${SESSAO}`].sort(),
    )
    for (const r of registros) expect(r).toMatchObject({ sessaoId: SESSAO })
  })

  it('experiência: criar, editar e excluir', async () => {
    const criada = await chamar(experiencia, 'POST', { ...EXPERIENCIA, sessaoId: SESSAO }, presidente.token)
    expect(criada.status).toBe(201)
    const id = criada.corpo?.id as string
    const caminho = `${CAMINHO_PROPOSTA}/experiencias/${id}`
    expect(await ler(caminho)).toMatchObject({ descricao: 'Projeto esportivo', sessaoId: SESSAO })

    await semearSessao('sessao-2', { status: 'aberta' })
    await obterAdmin().db.doc(`chamamentos/${CH}/sessoes/${SESSAO}`).update({ status: 'encerrada' })
    const editada = await chamar(experiencia, 'PATCH', { chamamentoId: CH, propostaId: PROP, id, sessaoId: 'sessao-2', vagas: 10 }, presidente.token)
    expect(editada.status).toBe(200)
    expect(await ler(caminho)).toMatchObject({ vagas: 10, sessaoId: 'sessao-2' })

    expect((await chamar(experiencia, 'DELETE', { chamamentoId: CH, propostaId: PROP, id, sessaoId: 'sessao-2' }, presidente.token)).status).toBe(200)
    const registros = (await auditoriaDaOperacao()) as (RegistroAuditoria & { sessaoId?: string })[]
    const daExperiencia = registros.filter((r) => r.caminho === caminho).sort((a, b) => a.dataHora.toMillis() - b.dataHora.toMillis())
    expect(daExperiencia.map((r) => [r.acao, r.sessaoId])).toEqual([
      ['criar', SESSAO],
      ['editar', 'sessao-2'],
      ['excluir', 'sessao-2'],
    ])
    for (const r of registros) expect(r.sessaoId).toBeDefined()
  })

  it('desempate', async () => {
    await semearPropostaComTotais('a', 90)
    await semearPropostaComTotais('b', 84)
    await semearPropostaComTotais('c', 84)
    const r = await chamar(desempate, 'PUT', { ...DESEMPATE, sessaoId: SESSAO }, presidente.token)
    expect(r.status).toBe(200)
    expect(await ler(`chamamentos/${CH}/desempates/${r.corpo?.id as string}`)).toMatchObject({ ordem: ['c', 'b'], sessaoId: SESSAO })
    for (const registro of await auditoriaDaOperacao()) expect(registro).toMatchObject({ sessaoId: SESSAO })
  })
})
