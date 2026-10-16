import { describe, expect, it } from 'vitest'
import { CAMPOS_CORRECAO, planejarRemocao } from './correcao'

describe('remoção dos campos de correção monetária dos chamamentos (Manutenção 1)', () => {
  it('só os chamamentos que têm índice ou data-base, com os valores antigos para a auditoria', () => {
    const plano = planejarRemocao([
      { id: 'a', dados: { numero: '1', indiceCorrecao: 'IPCA', dataBaseCorrecao: '2026-01-01' } },
      { id: 'b', dados: { numero: '2' } },
      { id: 'c', dados: { numero: '3', dataBaseCorrecao: '2025-12-01' } },
    ])
    expect(plano).toEqual([
      { id: 'a', campos: ['indiceCorrecao', 'dataBaseCorrecao'], antes: { indiceCorrecao: 'IPCA', dataBaseCorrecao: '2026-01-01' } },
      { id: 'c', campos: ['dataBaseCorrecao'], antes: { dataBaseCorrecao: '2025-12-01' } },
    ])
  })

  it('campos removidos: índice de correção e data-base (nenhum outro)', () => {
    expect(CAMPOS_CORRECAO).toEqual(['indiceCorrecao', 'dataBaseCorrecao'])
    expect(planejarRemocao([{ id: 'x', dados: { numero: '1', titulo: 'T', dataLimitePropostas: '2026-10-31' } }])).toEqual([])
  })
})
