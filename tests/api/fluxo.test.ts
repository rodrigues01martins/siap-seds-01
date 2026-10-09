// Fluxo completo contra os emuladores: uma proposta fictícia do cadastro à homologação,
// passando só pela /api (como as telas fazem) e conferindo totais, memória da D2 e auditoria.

import { beforeAll, describe, expect, it } from 'vitest'
import * as avaliacao from '../../api/avaliacao'
import * as chamamentos from '../../api/chamamentos'
import * as experiencia from '../../api/experiencia'
import * as homologar from '../../api/homologar'
import * as oscs from '../../api/oscs'
import * as propostas from '../../api/propostas'
import * as sessao from '../../api/sessao'
import { calcularD1 } from '../../src/domain/d1'
import { calcularD2, type Experiencia } from '../../src/domain/d2'
import { MATRIZ_2026 } from '../../src/domain/matriz'
import {
  chamar,
  criarUsuario,
  ler,
  limparAuth,
  limparFirestore,
  registrarUsuario,
  semCarimbos,
  totalAuditoria,
  type Usuario,
} from './apoio'

const CODIGOS = MATRIZ_2026.dimensao1.planos.flatMap((p) => p.subcriterios.map((s) => s.codigo))
const DATA_LIMITE = '2026-10-31'

let admin: Usuario
let presidente: Usuario
let relator: Usuario
let membro: Usuario

beforeAll(async () => {
  await limparAuth()
  await limparFirestore()
  ;[admin, presidente, relator, membro] = await Promise.all([
    criarUsuario('admin'),
    criarUsuario('presidente'),
    criarUsuario('relator'),
    criarUsuario('membro'),
  ])
  await Promise.all([
    registrarUsuario(presidente, 'presidente'),
    registrarUsuario(relator, 'relator'),
    registrarUsuario(membro, 'membro'),
  ])
})

/** Chama a rota e exige o status esperado, mostrando o corpo se falhar. */
async function exigir<T = Record<string, unknown>>(
  rota: Parameters<typeof chamar>[0],
  metodo: Parameters<typeof chamar>[1],
  corpo: unknown,
  usuario: Usuario,
  status = 200,
): Promise<T> {
  const r = await chamar(rota, metodo, corpo, usuario.token)
  expect(r.status, JSON.stringify(r.corpo)).toBe(status)
  return r.corpo as T
}

describe('fluxo completo: cadastro → sessão → D2 → D1 → homologação', () => {
  it('avalia uma proposta fictícia do início ao fim', async () => {
    // 1. Cadastros (admin)
    await exigir(oscs, 'POST', { cnpj: '11.222.333/0001-81', razaoSocial: 'Instituto Esperança' }, admin, 201)
    const { id: ch } = await exigir<{ id: string }>(
      chamamentos,
      'POST',
      {
        numero: '001/2026',
        titulo: 'Chamamento Público SEDS/GO 2026',
        processoSei: '202610319003258',
        dataLimitePropostas: DATA_LIMITE,
        lotes: [{ codigo: 'L1', descricao: 'CASE Goiânia' }],
      },
      admin,
      201,
    )
    const { id: p } = await exigir<{ id: string }>(
      propostas,
      'POST',
      { chamamentoId: ch, loteCodigo: 'L1', oscCnpj: '11222333000181', protocolo: 'PROT-1', numeroSEI: '95570001' },
      admin,
      201,
    )
    const alvo = { chamamentoId: ch, propostaId: p }

    // 2. Sessão (presidente)
    const { id: s } = await exigir<{ id: string }>(
      sessao,
      'POST',
      {
        chamamentoId: ch,
        data: '2026-11-10',
        pauta: [p],
        presentes: [presidente.uid, relator.uid, membro.uid],
        declaracoes: [presidente, relator, membro].map((u) => ({ uid: u.uid, semImpedimento: true })),
      },
      presidente,
      201,
    )

    // 3. Experiências da D2 (relator)
    const atestado = { tipo: 'Atestado de capacidade técnica', numeroSEI: '1001', comprovaExecucaoSatisfatoria: true, aceito: true }
    const internacao = await exigir<{ id: string }>(
      experiencia,
      'POST',
      {
        ...alvo,
        descricao: 'Gestão do CASE Goiânia',
        categorias: ['A', 'D'],
        modalidade: 'internacao',
        orgaoParceiro: 'SEDS/GO',
        instrumento: 'TC 01/2018',
        mrosc: true,
        inicio: '2018-01-01',
        fim: null,
        vagas: 90,
        unidades: 2,
        trabalhadores: 70,
        valorAnualCentavos: 1_200_000_000,
        documentos: [atestado],
      },
      relator,
      201,
    )
    const esporte = await exigir<{ id: string }>(
      experiencia,
      'POST',
      {
        ...alvo,
        descricao: 'Projeto esportivo',
        categorias: ['C'],
        modalidade: 'outra',
        mrosc: false,
        inicio: '2020-01-01',
        fim: '2021-12-31',
        documentos: [atestado],
      },
      relator,
      201,
    )

    // 4. Os 28 subcritérios da D1, cada um pela /api (membro, relator e presidente)
    const niveis = Object.fromEntries(CODIGOS.map((c, i) => [c, i % 3 === 0 ? 4 : 3]))
    const avaliadores = [membro, relator, presidente]
    for (const [i, codigo] of CODIGOS.entries()) {
      await exigir(
        avaliacao,
        'PUT',
        {
          ...alvo,
          codigo,
          nivel: niveis[codigo],
          justificativa: `Fundamentação da Comissão para o subcritério ${codigo}.`,
          paginas: [1],
          decisao: 'unanimidade',
          sessaoId: s,
        },
        avaliadores[i % 3]!,
      )
    }

    // 5. Totais gravados = src/domain para os mesmos dados
    const d1 = calcularD1(niveis)
    const experiencias: Experiencia[] = [
      { id: internacao.id, descricao: 'Gestão do CASE Goiânia', categorias: ['A', 'D'], internacao: true, mrosc: true, inicio: '2018-01-01', fim: null, vagas: 90, unidades: 2, trabalhadores: 70, valorAnualCentavos: 1_200_000_000, execucaoSatisfatoria: true, desconsideracoes: [] },
      { id: esporte.id, descricao: 'Projeto esportivo', categorias: ['C'], internacao: false, mrosc: false, inicio: '2020-01-01', fim: '2021-12-31', vagas: null, unidades: null, trabalhadores: null, valorAnualCentavos: null, execucaoSatisfatoria: true, desconsideracoes: [] },
    ]
    const d2 = calcularD2({ experiencias, dataLimite: DATA_LIMITE })
    const caminho = `chamamentos/${ch}/propostas/${p}`
    expect((await ler(caminho))?.totais).toMatchObject({
      d1: d1.d1,
      d2: d2.total,
      nf: d1.d1 + d2.total,
      status: 'apta',
      completa: true,
      pendentes: [],
    })
    expect(semCarimbos(await ler(`${caminho}/resultadoD2/atual`))).toEqual(JSON.parse(JSON.stringify(d2)))
    expect((await ler(`chamamentos/${ch}/sessoes/${s}`))?.foco).toEqual({ tipo: 'subcriterio', propostaId: p, subcriterio: CODIGOS.at(-1) })

    // 6. Homologação (presidente) e trava
    await exigir(homologar, 'POST', alvo, presidente)
    expect(await ler(caminho)).toMatchObject({ bloqueada: true })
    const depois = await chamar(
      avaliacao,
      'PUT',
      { ...alvo, codigo: '1.1', nivel: 0, justificativa: 'Tentativa após homologação.', paginas: [], decisao: 'unanimidade', sessaoId: s },
      relator.token,
    )
    expect(depois.status).toBe(409)

    // 7. Cada escrita foi auditada: cadastros (3) + sessão (1) + experiências (2 × 3 documentos)
    //    + níveis (28 × 4: avaliação, totais, resultadoD2, foco da sessão) + homologação (1)
    expect(await totalAuditoria()).toBe(3 + 1 + 2 * 3 + 28 * 4 + 1)
  })
})
