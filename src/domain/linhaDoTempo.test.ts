import { describe, expect, it } from 'vitest'
import { linhaDoTempo } from './linhaDoTempo'

const DATA_LIMITE = '2026-10-31'

describe('linhaDoTempo — experiências A/B e sobreposições (tela da D2)', () => {
  it('só A e B entram; em execução vai até a data limite; posição relativa de 0 a 1', () => {
    const r = linhaDoTempo(
      [
        { id: 'a', categorias: ['A'], inicio: '2020-01-01', fim: '2021-12-31' },
        { id: 'b', categorias: ['B'], inicio: '2021-01-01', fim: null },
        { id: 'c', categorias: ['C'], inicio: '2019-01-01', fim: '2019-12-31' },
      ],
      DATA_LIMITE,
    )
    expect(r.inicio).toBe('2020-01-01')
    expect(r.fim).toBe(DATA_LIMITE)
    expect(r.barras.map((b) => b.id)).toEqual(['a', 'b'])
    expect(r.barras[0]).toMatchObject({ x0: 0, emExecucao: false })
    expect(r.barras[1]).toMatchObject({ fim: DATA_LIMITE, x1: 1, emExecucao: true })
    expect(r.barras[0]!.x1).toBeGreaterThan(r.barras[1]!.x0)
  })

  it('sobreposição entre duas experiências: trecho comum e ids', () => {
    const r = linhaDoTempo(
      [
        { id: 'a', categorias: ['A'], inicio: '2020-01-01', fim: '2021-12-31' },
        { id: 'b', categorias: ['B'], inicio: '2021-01-01', fim: '2022-06-30' },
        { id: 'd', categorias: ['A'], inicio: '2023-01-01', fim: '2023-12-31' },
      ],
      DATA_LIMITE,
    )
    expect(r.sobreposicoes).toEqual([
      expect.objectContaining({ inicio: '2021-01-01', fim: '2021-12-31', ids: ['a', 'b'] }),
    ])
  })

  it('início após a data limite fica de fora; sem experiências → vazio', () => {
    expect(linhaDoTempo([{ id: 'x', categorias: ['A'], inicio: '2027-01-01', fim: null }], DATA_LIMITE).barras).toEqual([])
    expect(linhaDoTempo([], DATA_LIMITE)).toEqual({ inicio: null, fim: null, barras: [], sobreposicoes: [] })
  })
})
