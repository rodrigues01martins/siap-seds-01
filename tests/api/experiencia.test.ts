import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import * as rota from '../../api/experiencia'
import { calcularD2, type Experiencia } from '../../src/domain/d2'
import {
  CAMINHO_PROPOSTA,
  CH,
  DATA_LIMITE,
  PROP,
  auditoriaDe,
  chamar,
  criarUsuario,
  ler,
  limparAuth,
  limparFirestore,
  semCarimbos,
  semearProposta,
  totalAuditoria,
  type Usuario,
} from './apoio'

const EXPERIENCIA = {
  descricao: 'Gestão do CASE Goiânia',
  categorias: ['A', 'D'],
  internacao: true,
  inicio: '2019-01-01',
  fim: null,
  vagas: 90,
  unidades: 2,
  trabalhadores: 70,
  valorAnualCentavos: 1_200_000_000,
  execucaoSatisfatoria: true,
  documentos: [{ tipo: 'Termo de Colaboração', descricao: 'TC 01/2019', referencia: 'SEI 123456' }],
}

const corpo = (dados: Record<string, unknown> = {}) => ({ chamamentoId: CH, propostaId: PROP, ...EXPERIENCIA, ...dados })

let relator: Usuario
let presidente: Usuario
let membro: Usuario

beforeAll(async () => {
  await limparAuth()
  ;[relator, presidente, membro] = await Promise.all([
    criarUsuario('relator'),
    criarUsuario('presidente'),
    criarUsuario('membro'),
  ])
})

beforeEach(async () => {
  await limparFirestore()
  await semearProposta()
})

async function criar(dados: Record<string, unknown> = {}): Promise<string> {
  const r = await chamar(rota, 'POST', corpo(dados), relator.token)
  expect(r.status).toBe(201)
  return r.corpo?.id as string
}

describe('/api/experiencia — acesso', () => {
  it('405, 401 e 403 (membro não edita experiências)', async () => {
    const r405 = await chamar(rota, 'GET', undefined, relator.token)
    expect(r405).toMatchObject({ status: 405 })
    expect(r405.headers.get('Allow')).toBe('POST, PATCH, DELETE')
    expect((await chamar(rota, 'POST', corpo(), null)).status).toBe(401)
    expect((await chamar(rota, 'POST', corpo(), membro.token)).status).toBe(403)
  })

  it('presidente também pode', async () => {
    expect((await chamar(rota, 'POST', corpo(), presidente.token)).status).toBe(201)
  })
})

describe('/api/experiencia — validação (400)', () => {
  it.each([
    ['categoria fora de A–D', { categorias: ['E'] }, 'categorias'],
    ['A e B na mesma experiência (Anexo IV, 3.2.1, III)', { categorias: ['A', 'B'] }, 'categorias'],
    ['fim anterior ao início', { inicio: '2021-01-01', fim: '2020-12-31' }, 'fim'],
    ['data inexistente', { inicio: '2021-02-30' }, 'inicio'],
    ['porte negativo', { vagas: -1 }, 'vagas'],
    ['porte não inteiro', { valorAnualCentavos: 10.5 }, 'valorAnualCentavos'],
    ['sem categorias', { categorias: [] }, 'categorias'],
  ])('%s', async (_caso, ajuste, campo) => {
    const r = await chamar(rota, 'POST', corpo(ajuste), relator.token)
    expect(r.status).toBe(400)
    expect(r.corpo?.campos).toHaveProperty(campo)
    expect(await totalAuditoria()).toBe(0)
  })

  it('mensagem da regra A+B cita o Anexo IV', async () => {
    const r = await chamar(rota, 'POST', corpo({ categorias: ['A', 'B'] }), relator.token)
    expect(r.corpo?.campos?.categorias).toBe(
      'Não pode ser enquadrada simultaneamente nas categorias A e B (Anexo IV, 3.2.1, III).',
    )
  })

  it('PATCH valida o resultado da junção com o que já existe (fim antes do início gravado)', async () => {
    const id = await criar({ inicio: '2020-06-01', fim: '2021-06-01' })
    const r = await chamar(rota, 'PATCH', { chamamentoId: CH, propostaId: PROP, id, fim: '2020-01-01' }, relator.token)
    expect(r).toMatchObject({ status: 400, corpo: { campos: { fim: 'O fim não pode ser anterior ao início.' } } })
  })

  it('proposta inexistente → 404; experiência inexistente → 404', async () => {
    expect((await chamar(rota, 'POST', corpo({ propostaId: 'nao-existe' }), relator.token)).status).toBe(404)
    const r = await chamar(rota, 'PATCH', { chamamentoId: CH, propostaId: PROP, id: 'nao-existe', vagas: 1 }, relator.token)
    expect(r.status).toBe(404)
  })
})

describe('/api/experiencia — criar, editar, excluir, auditoria e recálculo (C4)', () => {
  it('criar grava a experiência com documentos e audita', async () => {
    const id = await criar()
    const caminho = `${CAMINHO_PROPOSTA}/experiencias/${id}`
    expect(await ler(caminho)).toMatchObject({ categorias: ['A', 'D'], documentos: EXPERIENCIA.documentos })
    const [registro] = await auditoriaDe(caminho)
    expect(registro).toMatchObject({ acao: 'criar', antes: null, depois: { vagas: 90 }, uid: relator.uid })
  })

  it('totais.d2 e resultadoD2/atual idênticos ao calcularD2 de src/domain', async () => {
    const id = await criar()
    const segunda = await criar({ descricao: 'Projeto esportivo', categorias: ['C'], internacao: false, inicio: '2020-01-01', fim: '2021-12-31', vagas: null, unidades: null, trabalhadores: null, valorAnualCentavos: null, documentos: [] })

    const { documentos: _d, descricao, ...resto } = EXPERIENCIA
    const experiencias: Experiencia[] = [
      { id, descricao, ...resto } as Experiencia,
      { id: segunda, descricao: 'Projeto esportivo', categorias: ['C'], internacao: false, inicio: '2020-01-01', fim: '2021-12-31', vagas: null, unidades: null, trabalhadores: null, valorAnualCentavos: null, execucaoSatisfatoria: true },
    ]
    const esperado = calcularD2({ experiencias, dataLimite: DATA_LIMITE })

    expect(semCarimbos(await ler(`${CAMINHO_PROPOSTA}/resultadoD2/atual`))).toEqual(JSON.parse(JSON.stringify(esperado)))
    expect((await ler(CAMINHO_PROPOSTA))?.totais).toMatchObject({ d2: esperado.total, nf: esperado.total, d1: 0 })
  })

  it('editar → auditoria antes/depois e D2 recalculada', async () => {
    const id = await criar()
    const antes = (await ler(CAMINHO_PROPOSTA))?.totais as { d2: number }
    const r = await chamar(rota, 'PATCH', { chamamentoId: CH, propostaId: PROP, id, vagas: 130 }, relator.token)
    expect(r.status).toBe(200)
    const registros = await auditoriaDe(`${CAMINHO_PROPOSTA}/experiencias/${id}`)
    expect(registros[1]).toMatchObject({ acao: 'editar', antes: { vagas: 90 }, depois: { vagas: 130 } })
    // 90 vagas → 0,75; 130 vagas → 1,00 no 2.3.1 A
    expect(((await ler(CAMINHO_PROPOSTA))?.totais as { d2: number }).d2).toBe(antes.d2 + 0.25)
  })

  it('excluir → documento removido, auditoria com depois = null e D2 zerada', async () => {
    const id = await criar()
    const r = await chamar(rota, 'DELETE', { chamamentoId: CH, propostaId: PROP, id }, relator.token)
    expect(r.status).toBe(200)
    expect(await ler(`${CAMINHO_PROPOSTA}/experiencias/${id}`)).toBeUndefined()
    expect((await auditoriaDe(`${CAMINHO_PROPOSTA}/experiencias/${id}`)).at(-1)).toMatchObject({ acao: 'excluir', depois: null })
    expect((await ler(CAMINHO_PROPOSTA))?.totais).toMatchObject({ d2: 0 })
  })
})

describe('/api/experiencia — proposta homologada', () => {
  it('criar, editar e excluir → 409', async () => {
    const id = await criar()
    const { db } = await import('../../api/_lib/admin').then((m) => m.obterAdmin())
    await db.doc(CAMINHO_PROPOSTA).update({ bloqueada: true })
    const base = { chamamentoId: CH, propostaId: PROP }
    expect((await chamar(rota, 'POST', corpo(), relator.token)).status).toBe(409)
    expect((await chamar(rota, 'PATCH', { ...base, id, vagas: 1 }, relator.token)).status).toBe(409)
    expect((await chamar(rota, 'DELETE', { ...base, id }, relator.token)).status).toBe(409)
  })
})
