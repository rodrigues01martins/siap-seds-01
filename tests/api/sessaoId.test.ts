// Toda gravação feita pela Comissão em sessão guarda o sessaoId (base da exclusão da sessão em cascata):
// admissibilidade, níveis da D1, experiências da D2 e desempate exigem sessão aberta do chamamento e
// gravam o sessaoId no documento.
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
  type Usuario,
} from './apoio'

const SEM_SESSAO = 'Avaliação só pode ser registrada em sessão aberta da Comissão.'
const FORA_DA_PAUTA = 'Proposta fora da pauta da sessão.'

const ADMISSIBILIDADE = {
  chamamentoId: CH,
  propostaId: PROP,
  admitida: true,
  planos: [12, 12, 8, 12, 10, 8].map((limite, i, todos) => {
    const inicio = 3 + todos.slice(0, i).reduce((a, b) => a + b, 0)
    return { codigo: `PA${i + 1}`, paginaInicial: inicio, paginaFinal: inicio + limite - 1 }
  }),
}
const EXPERIENCIA = { chamamentoId: CH, propostaId: PROP, descricao: 'Projeto esportivo', categorias: ['C'], modalidade: 'outra', inicio: '2020-01-01' }
const NIVEL = { chamamentoId: CH, propostaId: PROP, codigo: '1.1', nivel: 3, justificativa: 'Justificativa suficiente para o teste.', paginas: [] }
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
    expect((await ler(CAMINHO_PROPOSTA))?.admissibilidade).toBeUndefined()
  })

  it.each([
    ['admissibilidade', admissibilidade, 'PUT', ADMISSIBILIDADE],
    ['experiência (criar)', experiencia, 'POST', EXPERIENCIA],
  ] as const)('%s: proposta fora da pauta da sessão → 409', async (_caso, rota, metodo, corpo) => {
    await semearSessao(SESSAO, { lotes: ['L2'] })
    expect(await chamar(rota, metodo, { ...corpo, sessaoId: SESSAO }, presidente.token)).toMatchObject({ status: 409, corpo: { erro: FORA_DA_PAUTA } })
  })
})

describe('sessaoId gravado no documento (base da exclusão da sessão em cascata)', () => {
  it('admissibilidade', async () => {
    expect((await chamar(admissibilidade, 'PUT', { ...ADMISSIBILIDADE, sessaoId: SESSAO }, presidente.token)).status).toBe(200)
    expect(await ler(CAMINHO_PROPOSTA)).toMatchObject({ admissibilidade: { situacao: 'admitida', sessaoId: SESSAO } })
  })

  it('nível da D1', async () => {
    expect((await chamar(avaliacao, 'PUT', { ...NIVEL, sessaoId: SESSAO }, presidente.token)).status).toBe(200)
    expect(await ler(`${CAMINHO_PROPOSTA}/avaliacoes/1.1`)).toMatchObject({ sessaoId: SESSAO })
  })

  it('experiência: criar e editar (a edição leva o sessaoId da sessão em que foi feita)', async () => {
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
  })

  it('desempate', async () => {
    await semearPropostaComTotais('a', 90)
    await semearPropostaComTotais('b', 84)
    await semearPropostaComTotais('c', 84)
    const r = await chamar(desempate, 'PUT', { ...DESEMPATE, sessaoId: SESSAO }, presidente.token)
    expect(r.status).toBe(200)
    expect(await ler(`chamamentos/${CH}/desempates/${r.corpo?.id as string}`)).toMatchObject({ ordem: ['c', 'b'], sessaoId: SESSAO })
  })
})
