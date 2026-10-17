import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { obterAdmin } from '../../api/_lib/admin'
import * as rota from '../../api/experiencia'
import { calcularD2, type Experiencia, type ResultadoD2 } from '../../src/domain/d2'
import {
  CAMINHO_PROPOSTA,
  CH,
  DATA_LIMITE,
  PROP,
  SESSAO,
  autoria,
  chamar,
  criarUsuario,
  ler,
  limparAuth,
  limparFirestore,
  semCarimbos,
  semearProposta,
  type Usuario,
} from './apoio'

const EXPERIENCIA = {
  descricao: 'Gestão do CASE Goiânia',
  categorias: ['A', 'D'],
  modalidade: 'internacao',
  orgaoParceiro: 'SEDS/GO',
  instrumento: 'Termo de Colaboração nº 01/2019',
  mrosc: true,
  inicio: '2019-01-01',
  fim: null,
  vagas: 90,
  unidades: 2,
  trabalhadores: 70,
  valorAnualCentavos: 1_200_000_000,
  documentos: [
    { tipo: 'Termo de Colaboração', numeroSEI: '000012345', comprovaExecucaoSatisfatoria: false, aceito: true },
    { tipo: 'Atestado de capacidade técnica', numeroSEI: '000067890', comprovaExecucaoSatisfatoria: true, aceito: true },
  ],
}

const corpo = (dados: Record<string, unknown> = {}) => ({ chamamentoId: CH, propostaId: PROP, sessaoId: SESSAO, ...EXPERIENCIA, ...dados })

let presidente: Usuario
let antigo: Usuario

beforeAll(async () => {
  await limparAuth()
  ;[presidente, antigo] = await Promise.all([criarUsuario('presidente'), criarUsuario('antigo')])
})

beforeEach(async () => {
  await limparFirestore()
  await semearProposta()
})

async function criar(dados: Record<string, unknown> = {}): Promise<string> {
  const r = await chamar(rota, 'POST', corpo(dados), presidente.token)
  expect(r.status).toBe(201)
  return r.corpo?.id as string
}

describe('/api/experiencia — acesso', () => {
  it('405, 401 e 403 (cadastro antigo não edita experiências)', async () => {
    const r405 = await chamar(rota, 'PUT', undefined, presidente.token)
    expect(r405).toMatchObject({ status: 405 })
    expect(r405.headers.get('Allow')).toBe('GET, POST, PATCH, DELETE')
    expect((await chamar(rota, 'POST', corpo(), null)).status).toBe(401)
    expect((await chamar(rota, 'POST', corpo(), antigo.token)).status).toBe(403)
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
    const r = await chamar(rota, 'POST', corpo(ajuste), presidente.token)
    expect(r.status).toBe(400)
    expect(r.corpo?.campos).toHaveProperty(campo)
    expect((await obterAdmin().db.collection(`${CAMINHO_PROPOSTA}/experiencias`).get()).empty).toBe(true)
  })

  it('mensagem da regra A+B cita o Anexo IV', async () => {
    const r = await chamar(rota, 'POST', corpo({ categorias: ['A', 'B'] }), presidente.token)
    expect(r.corpo?.campos?.categorias).toBe(
      'Não pode ser enquadrada simultaneamente nas categorias A e B (Anexo IV, 3.2.1, III).',
    )
  })

  it('PATCH valida o resultado da junção com o que já existe (fim antes do início gravado)', async () => {
    const id = await criar({ inicio: '2020-06-01', fim: '2021-06-01' })
    const r = await chamar(rota, 'PATCH', { chamamentoId: CH, propostaId: PROP, sessaoId: SESSAO, id, fim: '2020-01-01' }, presidente.token)
    expect(r).toMatchObject({ status: 400, corpo: { campos: { fim: 'O fim não pode ser anterior ao início.' } } })
  })

  it('proposta inexistente → 404; experiência inexistente → 404', async () => {
    expect((await chamar(rota, 'POST', corpo({ propostaId: 'nao-existe' }), presidente.token)).status).toBe(404)
    const r = await chamar(rota, 'PATCH', { chamamentoId: CH, propostaId: PROP, sessaoId: SESSAO, id: 'nao-existe', vagas: 1 }, presidente.token)
    expect(r.status).toBe(404)
  })
})

describe('/api/experiencia — criar, editar, excluir e recálculo (C4)', () => {
  it('criar grava a experiência com documentos e atualizadoPor', async () => {
    const id = await criar()
    const caminho = `${CAMINHO_PROPOSTA}/experiencias/${id}`
    expect(await ler(caminho)).toMatchObject({ categorias: ['A', 'D'], documentos: EXPERIENCIA.documentos, vagas: 90, atualizadoPor: autoria(presidente) })
  })

  it('totais.d2 e resultadoD2/atual idênticos ao calcularD2 de src/domain', async () => {
    const id = await criar()
    const segunda = await criar({
      descricao: 'Projeto esportivo',
      categorias: ['C'],
      modalidade: 'outra',
      mrosc: false,
      inicio: '2020-01-01',
      fim: '2021-12-31',
      vagas: null,
      unidades: null,
      trabalhadores: null,
      valorAnualCentavos: null,
      documentos: [],
    })

    // Derivações do servidor: internação vem da modalidade; execução satisfatória, de documento aceito que a comprova.
    const experiencias: Experiencia[] = [
      {
        id,
        descricao: EXPERIENCIA.descricao,
        categorias: ['A', 'D'],
        internacao: true,
        mrosc: true,
        inicio: '2019-01-01',
        fim: null,
        vagas: 90,
        unidades: 2,
        trabalhadores: 70,
        valorAnualCentavos: 1_200_000_000,
        execucaoSatisfatoria: true,
        desconsideracoes: [],
      },
      {
        id: segunda,
        descricao: 'Projeto esportivo',
        categorias: ['C'],
        internacao: false,
        mrosc: false,
        inicio: '2020-01-01',
        fim: '2021-12-31',
        vagas: null,
        unidades: null,
        trabalhadores: null,
        valorAnualCentavos: null,
        execucaoSatisfatoria: false,
        desconsideracoes: [],
      },
    ]
    const esperado = calcularD2({ experiencias, dataLimite: DATA_LIMITE })

    expect(semCarimbos(await ler(`${CAMINHO_PROPOSTA}/resultadoD2/atual`))).toEqual(JSON.parse(JSON.stringify(esperado)))
    expect((await ler(CAMINHO_PROPOSTA))?.totais).toMatchObject({ d2: esperado.total, nf: esperado.total, d1: 0 })
  })

  it('editar → campos mesclados e D2 recalculada', async () => {
    const id = await criar()
    const antes = (await ler(CAMINHO_PROPOSTA))?.totais as { d2: number }
    const r = await chamar(rota, 'PATCH', { chamamentoId: CH, propostaId: PROP, sessaoId: SESSAO, id, vagas: 130 }, presidente.token)
    expect(r.status).toBe(200)
    expect(await ler(`${CAMINHO_PROPOSTA}/experiencias/${id}`)).toMatchObject({ vagas: 130, descricao: EXPERIENCIA.descricao })
    // 90 vagas → 0,75; 130 vagas → 1,00 no 2.3.1 A
    expect(((await ler(CAMINHO_PROPOSTA))?.totais as { d2: number }).d2).toBe(antes.d2 + 0.25)
  })

  it('excluir (sem sessaoId: exclusão livre) → experiência removida e D2 zerada', async () => {
    const id = await criar()
    const r = await chamar(rota, 'DELETE', { chamamentoId: CH, propostaId: PROP, id }, presidente.token)
    expect(r.status).toBe(200)
    expect(await ler(`${CAMINHO_PROPOSTA}/experiencias/${id}`)).toBeUndefined()
    expect((await ler(CAMINHO_PROPOSTA))?.totais).toMatchObject({ d2: 0 })
  })
})

describe('/api/experiencia — campos da Etapa 4b', () => {
  const d2 = async () => (await ler(`${CAMINHO_PROPOSTA}/resultadoD2/atual`)) as unknown as ResultadoD2

  it('grava modalidade, órgão parceiro, instrumento, MROSC e documentos com nº SEI', async () => {
    const id = await criar()
    expect(await ler(`${CAMINHO_PROPOSTA}/experiencias/${id}`)).toMatchObject({
      modalidade: 'internacao',
      orgaoParceiro: 'SEDS/GO',
      instrumento: 'Termo de Colaboração nº 01/2019',
      mrosc: true,
      documentos: EXPERIENCIA.documentos,
      desconsideracoes: [],
    })
  })

  it('internação (2.3.1) vem da modalidade: semiliberdade não pontua em 2.3.1', async () => {
    await criar({ modalidade: 'semiliberdade' })
    expect((await d2()).criterios['C2.3'].subcriterios['2.3.1'].pontos).toBe(0)
  })

  it('execução satisfatória (C2.4) só com documento ACEITO que a comprova', async () => {
    const id = await criar({
      documentos: [{ tipo: 'Atestado', numeroSEI: '1', comprovaExecucaoSatisfatoria: true, aceito: false }],
    })
    expect((await d2()).criterios['C2.4'].usadas).toEqual([])
    await chamar(
      rota,
      'PATCH',
      { chamamentoId: CH, propostaId: PROP, sessaoId: SESSAO, id, documentos: [{ tipo: 'Atestado', numeroSEI: '1', comprovaExecucaoSatisfatoria: true, aceito: true }] },
      presidente.token,
    )
    expect((await d2()).criterios['C2.4'].usadas).toEqual([id])
  })

  it('categoria D sem MROSC → 400', async () => {
    const r = await chamar(rota, 'POST', corpo({ mrosc: false }), presidente.token)
    expect(r).toMatchObject({
      status: 400,
      corpo: { campos: { categorias: 'A categoria D exige parceria regida pelo MROSC (Lei Federal nº 13.019/2014).' } },
    })
  })

  it('internação e execução satisfatória não são informadas diretamente (derivadas) → 400', async () => {
    const r = await chamar(rota, 'POST', corpo({ internacao: true, execucaoSatisfatoria: true }), presidente.token)
    expect(r.corpo?.campos).toMatchObject({ internacao: 'Campo não permitido.', execucaoSatisfatoria: 'Campo não permitido.' })
  })

  it('desconsiderar em um critério (Anexo IV, 3.8.5): justificativa obrigatória; recalcula', async () => {
    const id = await criar()
    const base = { chamamentoId: CH, propostaId: PROP, sessaoId: SESSAO, id }
    const vazia = await chamar(rota, 'PATCH', { ...base, desconsideracoes: [{ criterio: 'C2.3', justificativa: '' }] }, presidente.token)
    expect(vazia).toMatchObject({
      status: 400,
      corpo: { campos: { 'desconsideracoes.0.justificativa': 'Informe a justificativa da desconsideração (Anexo IV, 3.8.5).' } },
    })

    const antes = (await d2()).criterios['C2.3'].pontos
    const desconsideracoes = [{ criterio: 'C2.3', justificativa: 'Documento não identifica vagas nem unidades.' }]
    expect((await chamar(rota, 'PATCH', { ...base, desconsideracoes }, presidente.token)).status).toBe(200)
    expect(antes).toBeGreaterThan(0)
    expect((await d2()).criterios['C2.3'].pontos).toBe(0)
    expect(await ler(`${CAMINHO_PROPOSTA}/experiencias/${id}`)).toMatchObject({ desconsideracoes })
  })

  it('modalidade fora da lista → 400', async () => {
    const r = await chamar(rota, 'POST', corpo({ modalidade: 'hospitalar' }), presidente.token)
    expect(r.status).toBe(400)
    expect(r.corpo?.campos).toHaveProperty('modalidade')
  })
})

describe('/api/experiencia — sem trava de homologação', () => {
  it('proposta com bloqueada=true (homologação antiga): criar e editar → aceitos', async () => {
    const id = await criar()
    const { db } = await import('../../api/_lib/admin').then((m) => m.obterAdmin())
    await db.doc(CAMINHO_PROPOSTA).update({ bloqueada: true })
    expect((await chamar(rota, 'POST', corpo(), presidente.token)).status).toBe(201)
    expect((await chamar(rota, 'PATCH', { chamamentoId: CH, propostaId: PROP, sessaoId: SESSAO, id, vagas: 1 }, presidente.token)).status).toBe(200)
  })
})
