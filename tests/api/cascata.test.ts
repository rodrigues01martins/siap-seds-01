// Exclusão livre (Simplificação 2/4): admin e presidente apagam chamamento, lote, OSC, proposta, sessão,
// experiência, documento e nível de subcritério, sem justificativa, sem identificador digitado e sem status
// "excluindo". Cascata com recursiveDelete; os totais das propostas afetadas são recalculados.
// Prévia GET ?simular=true com a contagem do que será apagado ("Serão apagados: 1 proposta, 28 avaliações…").
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { obterAdmin } from '../../api/_lib/admin'
import * as rotaAvaliacao from '../../api/avaliacao'
import * as rotaChamamentos from '../../api/chamamentos'
import * as rotaExperiencia from '../../api/experiencia'
import * as rotaOscs from '../../api/oscs'
import * as rotaPropostas from '../../api/propostas'
import * as rotaSessao from '../../api/sessao'
import { calcularD1 } from '../../src/domain/d1'
import { calcularD2 } from '../../src/domain/d2'
import { paraExperiencia } from '../../src/esquemas/experiencia'
import { chamar, consultar, criarUsuario, ler, limparAuth, limparFirestore, type Rota, type Usuario } from './apoio'

const CNPJ = '11222333000181'
const OUTRA_OSC = '11444777000161'
const CH = 'ch1'
const CH2 = 'ch2'
const P1 = `chamamentos/${CH}/propostas/p1`
const P2 = `chamamentos/${CH}/propostas/p2`
const P3 = `chamamentos/${CH2}/propostas/p3`
const DATA_LIMITE = '2026-10-31'

let admin: Usuario
let presidente: Usuario
let antigo: Usuario

beforeAll(async () => {
  await limparAuth()
  ;[admin, presidente, antigo] = await Promise.all([criarUsuario('admin'), criarUsuario('presidente'), criarUsuario('antigo')])
})

beforeEach(limparFirestore)

const documento = (n: number) => ({ tipo: `Atestado ${n}`, numeroSEI: `9557${n}`, comprovaExecucaoSatisfatoria: true, aceito: true })
const experiencia = (descricao: string, sessaoId: string, documentos: unknown[]) => ({
  descricao,
  categorias: ['C'],
  modalidade: 'outra',
  mrosc: false,
  inicio: '2019-01-01',
  fim: null,
  vagas: null,
  unidades: null,
  trabalhadores: null,
  valorAnualCentavos: null,
  documentos,
  desconsideracoes: [],
  sessaoId,
})

/**
 * ch1 (lotes L1 e L2), sessões s1 (aberta, L1) e s2 (encerrada); p1 (L1, OSC CNPJ) com admissibilidade (s1),
 * níveis 1.1 (s1) e 1.2 (s2), experiências e1 (s1, 2 documentos) e e2 (s2, 1 documento), resultado da D2 e
 * concluida; p2 (L2, outra OSC); desempates de L1 (s1) e L2 (s2). ch2 com p3 da mesma OSC de p1.
 */
async function semear(): Promise<void> {
  const { db } = obterAdmin()
  const lotes = [
    { codigo: 'L1', descricao: 'Lote 1' },
    { codigo: 'L2', descricao: 'Lote 2' },
  ]
  await db.doc(`chamamentos/${CH}`).set({ numero: '001/2026', titulo: 'Chamamento', dataLimitePropostas: DATA_LIMITE, lotes })
  await db.doc(`chamamentos/${CH2}`).set({ numero: '002/2026', titulo: 'Outro', dataLimitePropostas: DATA_LIMITE, lotes: [lotes[0]] })
  await db.doc(`oscs/${CNPJ}`).set({ cnpj: CNPJ, razaoSocial: 'Instituto Esperança' })
  await db.doc(`oscs/${OUTRA_OSC}`).set({ cnpj: OUTRA_OSC, razaoSocial: 'Associação Vida' })
  await db.doc(`chamamentos/${CH}/sessoes/s1`).set({ data: '2026-11-10', lotes: ['L1', 'L2'], status: 'aberta', presentes: [], foco: null })
  await db.doc(`chamamentos/${CH}/sessoes/s2`).set({ data: '2026-11-03', lotes: ['L1'], status: 'encerrada', presentes: [], foco: null })
  await db.doc(P1).set({
    loteCodigo: 'L1',
    oscCnpj: CNPJ,
    protocolo: 'PROT-0001',
    concluida: true,
    admissibilidade: { admitida: true, situacao: 'admitida', planos: [], sessaoId: 's1' },
    totais: { d1: 7, d2: 0, nf: 7, status: 'pendente' },
  })
  await db.doc(`${P1}/avaliacoes/1.1`).set({ nivel: 3, justificativa: 'Atende ao subcritério.', paginas: [], sessaoId: 's1' })
  await db.doc(`${P1}/avaliacoes/1.2`).set({ nivel: 4, justificativa: 'Atende plenamente.', paginas: [], sessaoId: 's2' })
  await db.doc(`${P1}/experiencias/e1`).set(experiencia('Experiência 1', 's1', [documento(1), documento(2)]))
  await db.doc(`${P1}/experiencias/e2`).set(experiencia('Experiência 2', 's2', [documento(3)]))
  await db.doc(`${P1}/resultadoD2/atual`).set({ total: 0 })
  await db.doc(P2).set({ loteCodigo: 'L2', oscCnpj: OUTRA_OSC, protocolo: 'PROT-0002' })
  await db.doc(`${P2}/avaliacoes/1.1`).set({ nivel: 2, justificativa: 'Atende parcialmente.', paginas: [], sessaoId: 's2' })
  await db.doc(`chamamentos/${CH}/desempates/L1--p1-px`).set({ loteCodigo: 'L1', ordem: ['p1', 'px'], sessaoId: 's1' })
  await db.doc(`chamamentos/${CH}/desempates/L2--p2-py`).set({ loteCodigo: 'L2', ordem: ['p2', 'py'], sessaoId: 's2' })
  await db.doc(P3).set({ loteCodigo: 'L1', oscCnpj: CNPJ, protocolo: 'PROT-0003' })
  await db.doc(`${P3}/avaliacoes/1.1`).set({ nivel: 1, justificativa: 'Atende pouco.', paginas: [], sessaoId: 'sx' })
}

async function existe(caminho: string): Promise<boolean> {
  return (await obterAdmin().db.doc(caminho).get()).exists
}

async function subcolecoesDe(caminho: string): Promise<string[]> {
  return (await obterAdmin().db.doc(caminho).listCollections()).map((c) => c.id)
}

/** Totais esperados de p1 pelo domínio, a partir do que restou gravado. */
async function totaisEsperadosP1(): Promise<{ d1: number; d2: number }> {
  const { db } = obterAdmin()
  const [avaliacoes, experiencias] = await Promise.all([db.collection(`${P1}/avaliacoes`).get(), db.collection(`${P1}/experiencias`).get()])
  const d1 = calcularD1(Object.fromEntries(avaliacoes.docs.map((d) => [d.id, d.get('nivel') as number]))).d1
  const d2 = calcularD2({ experiencias: experiencias.docs.map((d) => paraExperiencia(d.id, d.data())), dataLimite: DATA_LIMITE }).total
  return { d1, d2 }
}

type Caso = readonly [string, Rota, Record<string, string | number>]
const CASOS: Caso[] = [
  ['chamamento', rotaChamamentos, { id: CH }],
  ['lote', rotaChamamentos, { id: CH, lote: 'L1' }],
  ['OSC', rotaOscs, { cnpj: CNPJ }],
  ['proposta', rotaPropostas, { chamamentoId: CH, propostaId: 'p1' }],
  ['sessão', rotaSessao, { chamamentoId: CH, sessaoId: 's1' }],
  ['experiência', rotaExperiencia, { chamamentoId: CH, propostaId: 'p1', id: 'e1' }],
  ['documento', rotaExperiencia, { chamamentoId: CH, propostaId: 'p1', id: 'e1', documento: 0 }],
  ['nível', rotaAvaliacao, { chamamentoId: CH, propostaId: 'p1', codigo: '1.1' }],
]
const parametros = (ids: Record<string, string | number>) =>
  Object.fromEntries([...Object.entries(ids).map(([k, v]) => [k, String(v)]), ['simular', 'true']])

describe('exclusão livre — acesso e validação', () => {
  it.each(CASOS)('%s: 401 sem login, 403 para cadastro antigo; nada é apagado', async (_c, rota, ids) => {
    await semear()
    expect((await chamar(rota, 'DELETE', ids, null)).status).toBe(401)
    expect((await chamar(rota, 'DELETE', ids, antigo.token)).status).toBe(403)
    expect((await consultar(rota, parametros(ids), null)).status).toBe(401)
    expect((await consultar(rota, parametros(ids), antigo.token)).status).toBe(403)
    expect(await existe(`${P1}/avaliacoes/1.1`)).toBe(true)
  })

  it.each(CASOS)('%s: sem justificativa e sem identificador digitado (campos extras → 400)', async (_c, rota, ids) => {
    await semear()
    const r = await chamar(rota, 'DELETE', { ...ids, justificativa: 'Cadastro feito por engano no ensaio.' }, presidente.token)
    expect(r).toMatchObject({ status: 400, corpo: { campos: { justificativa: 'Campo não permitido.' } } })
  })

  it.each(CASOS)('%s: prévia sem simular=true → 400', async (_c, rota, ids) => {
    await semear()
    const semSimular = Object.fromEntries(Object.entries(ids).map(([k, v]) => [k, String(v)]))
    expect((await consultar(rota, semSimular, presidente.token)).status).toBe(400)
  })

  it('registro inexistente → 404 (exclusão e prévia)', async () => {
    await semear()
    const inexistentes: Caso[] = [
      ['chamamento', rotaChamamentos, { id: 'nao-existe' }],
      ['lote', rotaChamamentos, { id: CH, lote: 'L9' }],
      ['OSC', rotaOscs, { cnpj: OUTRA_OSC }],
      ['proposta', rotaPropostas, { chamamentoId: CH, propostaId: 'nao-existe' }],
      ['sessão', rotaSessao, { chamamentoId: CH, sessaoId: 'nao-existe' }],
      ['experiência', rotaExperiencia, { chamamentoId: CH, propostaId: 'p1', id: 'nao-existe' }],
      ['documento', rotaExperiencia, { chamamentoId: CH, propostaId: 'p1', id: 'e1', documento: 5 }],
      ['nível', rotaAvaliacao, { chamamentoId: CH, propostaId: 'p1', codigo: '2.1' }],
    ]
    await obterAdmin().db.doc(`oscs/${OUTRA_OSC}`).delete()
    for (const [caso, rota, ids] of inexistentes) {
      expect((await chamar(rota, 'DELETE', ids, admin.token)).status, caso).toBe(404)
      expect((await consultar(rota, parametros(ids), admin.token)).status, caso).toBe(404)
    }
  })
})

describe('prévia (GET ?simular=true): contagem do que será apagado, sem apagar nada', () => {
  it.each([
    ['proposta', rotaPropostas, { chamamentoId: CH, propostaId: 'p1' }, { proposta: 1, admissibilidade: 1, avaliacao: 2, experiencia: 2, documento: 3, resultadoD2: 1 }, 10, '1 proposta, 1 admissibilidade, 2 avaliações, 2 experiências, 3 documentos, 1 resultado da D2'],
    ['chamamento', rotaChamamentos, { id: CH }, { chamamento: 1, lote: 2, sessao: 2, proposta: 2, admissibilidade: 1, avaliacao: 3, experiencia: 2, documento: 3, resultadoD2: 1, desempate: 2 }, 19, '1 chamamento, 2 lotes, 2 sessões, 2 propostas, 1 admissibilidade, 3 avaliações, 2 experiências, 3 documentos, 1 resultado da D2, 2 decisões de desempate'],
    ['lote', rotaChamamentos, { id: CH, lote: 'L1' }, { lote: 1, proposta: 1, admissibilidade: 1, avaliacao: 2, experiencia: 2, documento: 3, resultadoD2: 1, desempate: 1 }, 12, '1 lote, 1 proposta, 1 admissibilidade, 2 avaliações, 2 experiências, 3 documentos, 1 resultado da D2, 1 decisão de desempate'],
    ['OSC', rotaOscs, { cnpj: CNPJ }, { osc: 1, proposta: 2, admissibilidade: 1, avaliacao: 3, experiencia: 2, documento: 3, resultadoD2: 1 }, 13, '1 OSC, 2 propostas, 1 admissibilidade, 3 avaliações, 2 experiências, 3 documentos, 1 resultado da D2'],
    ['sessão', rotaSessao, { chamamentoId: CH, sessaoId: 's1' }, { sessao: 1, admissibilidade: 1, avaliacao: 1, experiencia: 1, documento: 2, desempate: 1 }, 7, '1 sessão, 1 admissibilidade, 1 avaliação, 1 experiência, 2 documentos, 1 decisão de desempate'],
    ['experiência', rotaExperiencia, { chamamentoId: CH, propostaId: 'p1', id: 'e1' }, { experiencia: 1, documento: 2 }, 3, '1 experiência, 2 documentos'],
    ['documento', rotaExperiencia, { chamamentoId: CH, propostaId: 'p1', id: 'e1', documento: 1 }, { documento: 1 }, 1, '1 documento'],
    ['nível', rotaAvaliacao, { chamamentoId: CH, propostaId: 'p1', codigo: '1.2' }, { avaliacao: 1 }, 1, '1 avaliação'],
  ] as const)('%s', async (_c, rota, ids, itens, total, resumo) => {
    await semear()
    const r = await consultar(rota, parametros(ids), presidente.token)
    expect(r).toMatchObject({ status: 200, corpo: { itens, total, resumo } })
    expect(Object.keys(r.corpo?.itens as object)).toEqual(Object.keys(itens))
    expect(await existe(P1)).toBe(true)
    expect(await existe(`${P1}/avaliacoes/1.2`)).toBe(true)
    expect(((await ler(`${P1}/experiencias/e1`))?.documentos as unknown[]).length).toBe(2)
  })
})

describe('exclusão em cascata', () => {
  it('proposta → admissibilidade, avaliações, experiências (com documentos) e resultado; outras propostas ficam', async () => {
    await semear()
    const r = await chamar(rotaPropostas, 'DELETE', { chamamentoId: CH, propostaId: 'p1' }, presidente.token)
    expect(r).toMatchObject({ status: 200, corpo: { total: 10, resumo: '1 proposta, 1 admissibilidade, 2 avaliações, 2 experiências, 3 documentos, 1 resultado da D2' } })
    expect(await existe(P1)).toBe(false)
    expect(await subcolecoesDe(P1)).toEqual([])
    expect(await existe(P2)).toBe(true)
    expect(await existe(`oscs/${CNPJ}`)).toBe(true)
  })

  it('proposta com bloqueada=true (homologação antiga) é apagada: não há mais 409', async () => {
    await semear()
    await obterAdmin().db.doc(P1).update({ bloqueada: true })
    expect((await chamar(rotaPropostas, 'DELETE', { chamamentoId: CH, propostaId: 'p1' }, admin.token)).status).toBe(200)
    expect(await existe(P1)).toBe(false)
  })

  it('chamamento → lotes, sessões, propostas e tudo dentro delas, desempates; OSCs e outros chamamentos ficam', async () => {
    await semear()
    const r = await chamar(rotaChamamentos, 'DELETE', { id: CH }, admin.token)
    expect(r).toMatchObject({ status: 200, corpo: { total: 19 } })
    expect(await existe(`chamamentos/${CH}`)).toBe(false)
    expect(await subcolecoesDe(`chamamentos/${CH}`)).toEqual([])
    expect(await existe(`oscs/${CNPJ}`)).toBe(true)
    expect(await existe(P3)).toBe(true)
  })

  it('lote → propostas do lote (com tudo dentro) e desempates do lote; sai do chamamento e da pauta das sessões', async () => {
    await semear()
    const r = await chamar(rotaChamamentos, 'DELETE', { id: CH, lote: 'L1' }, presidente.token)
    expect(r).toMatchObject({ status: 200, corpo: { total: 12 } })
    expect(await existe(P1)).toBe(false)
    expect(await subcolecoesDe(P1)).toEqual([])
    expect(await existe(P2)).toBe(true)
    expect(await existe(`chamamentos/${CH}/desempates/L1--p1-px`)).toBe(false)
    expect(await existe(`chamamentos/${CH}/desempates/L2--p2-py`)).toBe(true)
    expect((await ler(`chamamentos/${CH}`))?.lotes).toEqual([{ codigo: 'L2', descricao: 'Lote 2' }])
    expect((await ler(`chamamentos/${CH}/sessoes/s1`))?.lotes).toEqual(['L2'])
    expect((await ler(`chamamentos/${CH}/sessoes/s2`))?.lotes).toEqual([])
    expect(await existe(P3)).toBe(true)
  })

  it('OSC → suas propostas em todos os chamamentos; propostas de outras OSCs ficam', async () => {
    await semear()
    const r = await chamar(rotaOscs, 'DELETE', { cnpj: CNPJ }, presidente.token)
    expect(r).toMatchObject({ status: 200, corpo: { total: 13 } })
    expect(await existe(`oscs/${CNPJ}`)).toBe(false)
    expect(await existe(P1)).toBe(false)
    expect(await existe(P3)).toBe(false)
    expect(await subcolecoesDe(P3)).toEqual([])
    expect(await existe(P2)).toBe(true)
    expect(await existe(`oscs/${OUTRA_OSC}`)).toBe(true)
  })

  it('sessão → a sessão e tudo que foi registrado com o sessaoId dela; os totais das propostas afetadas são recalculados', async () => {
    await semear()
    const r = await chamar(rotaSessao, 'DELETE', { chamamentoId: CH, sessaoId: 's1' }, presidente.token)
    expect(r).toMatchObject({ status: 200, corpo: { total: 7 } })

    expect(await existe(`chamamentos/${CH}/sessoes/s1`)).toBe(false)
    expect(await existe(`chamamentos/${CH}/sessoes/s2`)).toBe(true)
    // Registrado com s1: apagado. Com s2: fica.
    expect(await existe(`${P1}/avaliacoes/1.1`)).toBe(false)
    expect(await existe(`${P1}/avaliacoes/1.2`)).toBe(true)
    expect(await existe(`${P1}/experiencias/e1`)).toBe(false)
    expect(await existe(`${P1}/experiencias/e2`)).toBe(true)
    expect(await existe(`chamamentos/${CH}/desempates/L1--p1-px`)).toBe(false)
    expect(await existe(`chamamentos/${CH}/desempates/L2--p2-py`)).toBe(true)
    expect(await existe(`${P2}/avaliacoes/1.1`)).toBe(true)

    const proposta = await ler(P1)
    expect(proposta).not.toHaveProperty('admissibilidade')
    // Recalculado com o que restou (1.2 e e2) e a conclusão desfeita.
    const esperado = await totaisEsperadosP1()
    expect(proposta?.totais).toMatchObject({ d1: esperado.d1, d2: esperado.d2, status: 'pendente' })
    expect(esperado.d1).toBe(calcularD1({ '1.2': 4 }).d1)
    expect(proposta?.concluida).toBe(false)
    expect(await existe(`${P1}/resultadoD2/atual`)).toBe(true)
  })

  it('sessão encerrada também pode ser apagada', async () => {
    await semear()
    expect((await chamar(rotaSessao, 'DELETE', { chamamentoId: CH, sessaoId: 's2' }, admin.token)).status).toBe(200)
    expect(await existe(`${P1}/avaliacoes/1.2`)).toBe(false)
    expect(await existe(`${P2}/avaliacoes/1.1`)).toBe(false)
    expect(await existe(`${P1}/avaliacoes/1.1`)).toBe(true)
  })
})

describe('exclusão de itens da avaliação, com recálculo (não exige sessão aberta)', () => {
  it('experiência → apagada com seus documentos; D2 e totais recalculados; conclusão desfeita', async () => {
    await semear()
    await obterAdmin().db.doc(`chamamentos/${CH}/sessoes/s1`).update({ status: 'encerrada' })
    const r = await chamar(rotaExperiencia, 'DELETE', { chamamentoId: CH, propostaId: 'p1', id: 'e1' }, presidente.token)
    expect(r).toMatchObject({ status: 200, corpo: { total: 3, resumo: '1 experiência, 2 documentos' } })
    expect(await existe(`${P1}/experiencias/e1`)).toBe(false)
    const esperado = await totaisEsperadosP1()
    expect((await ler(P1))?.totais).toMatchObject({ d2: esperado.d2 })
    expect((await ler(P1))?.concluida).toBe(false)
  })

  it('documento → sai da lista da experiência; D2 recalculada', async () => {
    await semear()
    const r = await chamar(rotaExperiencia, 'DELETE', { chamamentoId: CH, propostaId: 'p1', id: 'e2', documento: 0 }, presidente.token)
    expect(r).toMatchObject({ status: 200, corpo: { total: 1, resumo: '1 documento' } })
    const e2 = await ler(`${P1}/experiencias/e2`)
    expect(e2?.documentos).toEqual([])
    expect(e2).toMatchObject({ descricao: 'Experiência 2' })
    const esperado = await totaisEsperadosP1()
    expect((await ler(P1))?.totais).toMatchObject({ d2: esperado.d2 })
    expect((await ler(`${P1}/resultadoD2/atual`))?.total).toBe(esperado.d2)
  })

  it('documento do meio: os demais ficam na ordem', async () => {
    await semear()
    await chamar(rotaExperiencia, 'DELETE', { chamamentoId: CH, propostaId: 'p1', id: 'e1', documento: 0 }, admin.token)
    expect((await ler(`${P1}/experiencias/e1`))?.documentos).toEqual([documento(2)])
  })

  it('nível de subcritério → apagado; D1 e totais recalculados; conclusão desfeita', async () => {
    await semear()
    const r = await chamar(rotaAvaliacao, 'DELETE', { chamamentoId: CH, propostaId: 'p1', codigo: '1.1' }, presidente.token)
    expect(r).toMatchObject({ status: 200, corpo: { total: 1, resumo: '1 avaliação' } })
    expect(await existe(`${P1}/avaliacoes/1.1`)).toBe(false)
    expect((await ler(P1))?.totais).toMatchObject({ d1: calcularD1({ '1.2': 4 }).d1, status: 'pendente' })
    expect((await ler(P1))?.concluida).toBe(false)
  })
})
