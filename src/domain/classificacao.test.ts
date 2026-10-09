import { describe, expect, it } from 'vitest'
import { classificar, type PropostaAvaliada } from './classificacao'
import { calcularD1, type NiveisD1, type ResultadoD1 } from './d1'
import { calcularD2, type ResultadoD2 } from './d2'
import { MATRIZ_2026 } from './matriz'

const CODIGOS = MATRIZ_2026.dimensao1.planos.flatMap((p) => p.subcriterios.map((s) => s.codigo))
const D2_ZERO: ResultadoD2 = calcularD2({ dataLimite: '2026-10-31', experiencias: [] })

function niveis(padrao: number, sobrescritas: NiveisD1 = {}): NiveisD1 {
  return { ...Object.fromEntries(CODIGOS.map((c) => [c, padrao])), ...sobrescritas }
}

function proposta(id: string, n: NiveisD1, d2: ResultadoD2 = D2_ZERO): PropostaAvaliada {
  return { id, d1: calcularD1(n), d2 }
}

/** D1 = 108 em 27 subcritérios, com 6.4 ainda sem nível → pendente. */
function pendenteComNotaAlta(id: string): PropostaAvaliada {
  const n = niveis(4)
  delete n['6.4']
  return proposta(id, n)
}

describe('classificar — status "pendente" nunca entra no ranking', () => {
  it('proposta pendente não recebe posição, mesmo com nota parcial maior que as aptas', () => {
    const pendente = pendenteComNotaAlta('osc-pendente')
    expect(pendente.d1.status).toBe('pendente')
    expect(pendente.d1.d1).toBe(108)

    const r = classificar([proposta('osc-apta', niveis(3)), pendente])

    expect(r.ranking.map((p) => p.id)).toEqual(['osc-apta'])
    expect(r.ranking[0]!.posicao).toBe(1)
    expect(r.pendentes).toEqual(['osc-pendente'])
  })

  it('a presença de pendentes não altera posições nem notas das aptas', () => {
    const aptas = [proposta('a', niveis(3)), proposta('b', niveis(4)), proposta('c', niveis(3, { '1.1': 4 }))]
    const sem = classificar(aptas)
    const com = classificar([pendenteComNotaAlta('p1'), ...aptas, pendenteComNotaAlta('p2')])
    expect(com.ranking).toEqual(sem.ranking)
  })

  it('com pendentes a classificação não é definitiva; sem pendentes é', () => {
    expect(classificar([proposta('a', niveis(3)), pendenteComNotaAlta('p')]).definitiva).toBe(false)
    expect(classificar([proposta('a', niveis(3))]).definitiva).toBe(true)
  })

  it('resultado incompleto rotulado como "apta" é tratado como pendente (defesa contra dado adulterado)', () => {
    const real = pendenteComNotaAlta('forjada')
    const forjado: ResultadoD1 = { ...real.d1, status: 'apta' }
    const r = classificar([{ ...real, d1: forjado }])
    expect(r.ranking).toEqual([])
    expect(r.pendentes).toEqual(['forjada'])
    expect(r.definitiva).toBe(false)
  })

  it('pendente já desclassificada (nível 0 em 1.1) fica entre as desclassificadas', () => {
    const r = classificar([proposta('x', { '1.1': 0 })])
    expect(r.desclassificadas).toEqual(['x'])
    expect(r.pendentes).toEqual([])
    expect(r.ranking).toEqual([])
  })
})

describe('classificar — ordem e exclusões', () => {
  it('ordena aptas por NF = D1 + D2 decrescente', () => {
    const d2Alta = calcularD2({
      dataLimite: '2026-10-31',
      experiencias: [{ id: 'e1', categorias: ['A', 'D'], inicio: '2018-01-01', fim: null }],
    })
    const r = classificar([proposta('a', niveis(3)), proposta('b', niveis(4)), proposta('c', niveis(3), d2Alta)])
    expect(r.ranking.map((p) => [p.posicao, p.id, p.nf])).toEqual([
      [1, 'b', 112],
      [2, 'c', 84 + d2Alta.total],
      [3, 'a', 84],
    ])
  })

  it('inaptas e desclassificadas ficam fora do ranking', () => {
    const r = classificar([
      proposta('apta', niveis(3)),
      proposta('inapta', niveis(2)),
      proposta('descl', niveis(4, { '1.2': 0 })),
    ])
    expect(r.ranking.map((p) => p.id)).toEqual(['apta'])
    expect(r.inaptas).toEqual(['inapta'])
    expect(r.desclassificadas).toEqual(['descl'])
  })

  it('empates em NF são sinalizados (desempate conforme o Edital, Anexo IV item 1.4)', () => {
    const r = classificar([proposta('a', niveis(3)), proposta('b', niveis(3)), proposta('c', niveis(4))])
    expect(r.ranking.map((p) => [p.id, p.empatada])).toEqual([
      ['c', false],
      ['a', true],
      ['b', true],
    ])
  })
})
