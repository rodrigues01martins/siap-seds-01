import { describe, expect, it } from 'vitest'
import { centavosParaReais, reaisParaCentavos } from './formatacao'

describe('valor em reais digitado na tela ↔ centavos', () => {
  it('reaisParaCentavos aceita o formato brasileiro', () => {
    expect(reaisParaCentavos('12.000.000,00')).toBe(1_200_000_000)
    expect(reaisParaCentavos('R$ 1.234,5')).toBe(123_450)
    expect(reaisParaCentavos('1500')).toBe(150_000)
    expect(reaisParaCentavos('')).toBeNull()
    expect(reaisParaCentavos('abc')).toBeNaN()
    expect(reaisParaCentavos('1,234')).toBeNaN()
  })

  it('centavosParaReais formata para o campo de edição (sem símbolo)', () => {
    expect(centavosParaReais(1_200_000_000)).toBe('12.000.000,00')
    expect(centavosParaReais(null)).toBe('')
  })
})
