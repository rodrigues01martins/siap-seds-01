import { describe, expect, it } from 'vitest'
import { mesclarIntervalos, mesesCompletos, picoSimultaneo } from './intervalos'

describe('mesclarIntervalos', () => {
  it('lista vazia → lista vazia', () => {
    expect(mesclarIntervalos([])).toEqual([])
  })

  it('mantém intervalos disjuntos, ordenados por início', () => {
    expect(
      mesclarIntervalos([
        { inicio: '2021-01-01', fim: '2021-06-30' },
        { inicio: '2020-01-01', fim: '2020-06-30' },
      ]),
    ).toEqual([
      { inicio: '2020-01-01', fim: '2020-06-30' },
      { inicio: '2021-01-01', fim: '2021-06-30' },
    ])
  })

  it('funde sobreposições (períodos concomitantes contam uma vez)', () => {
    expect(
      mesclarIntervalos([
        { inicio: '2020-01-01', fim: '2020-12-31' },
        { inicio: '2020-07-01', fim: '2021-06-30' },
      ]),
    ).toEqual([{ inicio: '2020-01-01', fim: '2021-06-30' }])
  })

  it('funde intervalo contido em outro', () => {
    expect(
      mesclarIntervalos([
        { inicio: '2020-01-01', fim: '2022-12-31' },
        { inicio: '2021-03-01', fim: '2021-04-30' },
      ]),
    ).toEqual([{ inicio: '2020-01-01', fim: '2022-12-31' }])
  })

  it('funde intervalos contíguos (fim + 1 dia = início do próximo)', () => {
    expect(
      mesclarIntervalos([
        { inicio: '2020-01-15', fim: '2020-06-30' },
        { inicio: '2020-07-01', fim: '2021-01-14' },
      ]),
    ).toEqual([{ inicio: '2020-01-15', fim: '2021-01-14' }])
  })

  it('não funde quando há ao menos 1 dia de intervalo entre eles', () => {
    expect(
      mesclarIntervalos([
        { inicio: '2020-01-01', fim: '2020-06-29' },
        { inicio: '2020-07-01', fim: '2020-12-31' },
      ]),
    ).toHaveLength(2)
  })

  it('rejeita data inválida e início posterior ao fim', () => {
    expect(() => mesclarIntervalos([{ inicio: '2020-02-30', fim: '2020-03-01' }])).toThrow()
    expect(() => mesclarIntervalos([{ inicio: '01/01/2020', fim: '2020-03-01' }])).toThrow()
    expect(() => mesclarIntervalos([{ inicio: '2020-03-02', fim: '2020-03-01' }])).toThrow()
  })
})

describe('mesesCompletos (fim inclusivo)', () => {
  it('ano civil completo = 12 meses', () => {
    expect(mesesCompletos({ inicio: '2020-01-01', fim: '2020-12-31' })).toBe(12)
  })

  it('fronteira 11/12: um dia a menos não completa o 12º mês', () => {
    expect(mesesCompletos({ inicio: '2020-01-15', fim: '2021-01-13' })).toBe(11)
    expect(mesesCompletos({ inicio: '2020-01-15', fim: '2021-01-14' })).toBe(12)
  })

  it('fronteira 47/48', () => {
    expect(mesesCompletos({ inicio: '2020-01-01', fim: '2023-11-30' })).toBe(47)
    expect(mesesCompletos({ inicio: '2020-01-01', fim: '2023-12-30' })).toBe(47)
    expect(mesesCompletos({ inicio: '2020-01-01', fim: '2023-12-31' })).toBe(48)
  })

  it('um único dia = 0 meses', () => {
    expect(mesesCompletos({ inicio: '2020-05-10', fim: '2020-05-10' })).toBe(0)
  })

  it('fevereiro em ano bissexto', () => {
    expect(mesesCompletos({ inicio: '2020-02-01', fim: '2020-02-29' })).toBe(1)
    expect(mesesCompletos({ inicio: '2020-02-01', fim: '2020-02-28' })).toBe(0)
  })
})

describe('picoSimultaneo (sweep line)', () => {
  it('lista vazia → pico 0', () => {
    expect(picoSimultaneo([])).toEqual({ valor: 0, inicio: null, fim: null, ids: [] })
  })

  it('experiências sucessivas NÃO somam: pico é o maior valor isolado', () => {
    const pico = picoSimultaneo([
      { id: 'u1', inicio: '2018-01-01', fim: '2019-12-31', valor: 60 },
      { id: 'u2', inicio: '2020-01-01', fim: '2021-12-31', valor: 70 },
    ])
    expect(pico.valor).toBe(70)
    expect(pico.ids).toEqual(['u2'])
  })

  it('experiências concomitantes somam no período de sobreposição', () => {
    const pico = picoSimultaneo([
      { id: 'u1', inicio: '2018-01-01', fim: '2020-06-30', valor: 60 },
      { id: 'u2', inicio: '2020-01-01', fim: '2021-12-31', valor: 70 },
    ])
    expect(pico).toEqual({ valor: 130, inicio: '2020-01-01', fim: '2020-06-30', ids: ['u1', 'u2'] })
  })

  it('sobreposição de um único dia já soma (fim inclusivo)', () => {
    const pico = picoSimultaneo([
      { id: 'u1', inicio: '2019-01-01', fim: '2020-01-01', valor: 10 },
      { id: 'u2', inicio: '2020-01-01', fim: '2020-12-31', valor: 15 },
    ])
    expect(pico.valor).toBe(25)
    expect(pico.inicio).toBe('2020-01-01')
    expect(pico.fim).toBe('2020-01-01')
  })

  it('pico entre três itens com sobreposições parciais', () => {
    const pico = picoSimultaneo([
      { id: 'a', inicio: '2020-01-01', fim: '2020-12-31', valor: 40 },
      { id: 'b', inicio: '2020-06-01', fim: '2021-06-30', valor: 30 },
      { id: 'c', inicio: '2021-01-01', fim: '2021-12-31', valor: 50 },
    ])
    // a+b = 70 (jun–dez/2020); b+c = 80 (jan–jun/2021)
    expect(pico).toEqual({ valor: 80, inicio: '2021-01-01', fim: '2021-06-30', ids: ['b', 'c'] })
  })

  it('em empate, mantém o primeiro período atingido', () => {
    const pico = picoSimultaneo([
      { id: 'a', inicio: '2018-01-01', fim: '2018-12-31', valor: 50 },
      { id: 'b', inicio: '2020-01-01', fim: '2020-12-31', valor: 50 },
    ])
    expect(pico.ids).toEqual(['a'])
  })
})
