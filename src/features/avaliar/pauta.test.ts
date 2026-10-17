import { describe, expect, it } from 'vitest'
import { MATRIZ_2026 } from '../../domain/matriz'
import { rotaAvaliar, rotaSessao } from '../../lib/rotas'
import { ordenarPauta, progressoD1, textoProgresso, vizinhas } from './pauta'

const CODIGOS = MATRIZ_2026.dimensao1.planos.flatMap((p) => p.subcriterios.map((s) => s.codigo))

describe('rotas da jornada de avaliação', () => {
  it('o chamamento vai na consulta (o Firestore precisa do caminho completo); aba opcional', () => {
    expect(rotaAvaliar('ch 1', 'p1')).toBe('/avaliar/p1?ch=ch+1')
    expect(rotaAvaliar('ch1', 'p1', 'd2')).toBe('/avaliar/p1?ch=ch1&aba=d2')
    expect(rotaSessao('ch1', 's1')).toBe('/sessao/s1?ch=ch1')
  })
})

describe('pauta da sessão', () => {
  const propostas = [
    { id: 'p3', loteCodigo: 'L2', oscCnpj: 'c' },
    { id: 'p1', loteCodigo: 'L1', oscCnpj: 'b' },
    { id: 'p2', loteCodigo: 'L1', oscCnpj: 'a' },
    { id: 'p4', loteCodigo: 'L3', oscCnpj: 'a' },
  ]
  const nomes = new Map([
    ['a', 'Associação Alfa'],
    ['b', 'Instituto Beta'],
    ['c', 'Centro Gama'],
  ])

  it('propostas dos lotes em pauta, por lote e nome da OSC', () => {
    expect(ordenarPauta(propostas, ['L1', 'L2'], nomes)).toEqual(['p2', 'p1', 'p3'])
  })

  it('proposta anterior e próxima (nas pontas, null)', () => {
    expect(vizinhas(['p2', 'p1', 'p3'], 'p1')).toEqual({ anterior: 'p2', proxima: 'p3' })
    expect(vizinhas(['p2', 'p1', 'p3'], 'p2')).toEqual({ anterior: null, proxima: 'p1' })
    expect(vizinhas(['p2', 'p1', 'p3'], 'p9')).toEqual({ anterior: null, proxima: null })
  })
})

describe('progresso da proposta', () => {
  it('D1: subcritérios completos (nível e justificativa com o mínimo) de 28', () => {
    const avaliacoes = [
      { id: '1.1', nivel: 3, justificativa: 'Fundamentação suficiente da Comissão.' },
      { id: '1.2', nivel: 2, justificativa: 'curta' },
      { id: '2.1', nivel: null, justificativa: 'Fundamentação suficiente da Comissão.' },
    ]
    expect(progressoD1(avaliacoes)).toEqual({ completos: 1, total: CODIGOS.length })
    expect(progressoD1(avaliacoes, 50)).toEqual({ completos: 0, total: CODIGOS.length })
  })

  it('texto da linha da pauta: "D1 18/28 · D2 ok"', () => {
    expect(textoProgresso({ completos: 18, total: 28 }, 2)).toBe('D1 18/28 · D2 ok')
    expect(textoProgresso({ completos: 0, total: 28 }, 0)).toBe('D1 0/28 · D2 —')
  })
})
