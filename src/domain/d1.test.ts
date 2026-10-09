import { describe, expect, it } from 'vitest'
import { calcularD1, type NiveisD1 } from './d1'
import { MATRIZ_2026 } from './matriz'

const CODIGOS = MATRIZ_2026.dimensao1.planos.flatMap((p) => p.subcriterios.map((s) => s.codigo))

/** Todos os 28 subcritérios no mesmo nível, com sobrescritas pontuais. */
function niveis(padrao: number, sobrescritas: NiveisD1 = {}): NiveisD1 {
  return { ...Object.fromEntries(CODIGOS.map((c) => [c, padrao])), ...sobrescritas }
}

describe('calcularD1 — totais', () => {
  it('tudo nível 4 → D1 = 112 e totais por PA = máximos', () => {
    const r = calcularD1(niveis(4))
    expect(r.d1).toBe(112)
    expect(r.maximo).toBe(112)
    expect(r.totaisPorPA.map((t) => [t.codigo, t.pontos, t.maximo])).toEqual([
      ['PA1', 20, 20],
      ['PA2', 20, 20],
      ['PA3', 16, 16],
      ['PA4', 24, 24],
      ['PA5', 16, 16],
      ['PA6', 16, 16],
    ])
    expect(r.completa).toBe(true)
    expect(r.pendentes).toEqual([])
  })

  it('PS = NA: cada subcritério soma exatamente o nível atribuído', () => {
    const r = calcularD1(niveis(2, { '4.1': 4, '4.6': 0 }))
    const pa4 = r.totaisPorPA.find((t) => t.codigo === 'PA4')!
    expect(pa4.pontos).toBe(2 * 4 + 4 + 0)
    expect(r.d1).toBe(2 * 26 + 4 + 0)
  })
})

describe('calcularD1 — status', () => {
  it('D1 = 68 → apta', () => {
    // 12 × 3 + 16 × 2 = 68
    const sobrescritas = Object.fromEntries(CODIGOS.slice(0, 12).map((c) => [c, 3]))
    const r = calcularD1(niveis(2, sobrescritas))
    expect(r.d1).toBe(68)
    expect(r.status).toBe('apta')
  })

  it('D1 = 67 (abaixo do corte de 67,2) → inapta', () => {
    const sobrescritas = Object.fromEntries(CODIGOS.slice(0, 11).map((c) => [c, 3]))
    const r = calcularD1(niveis(2, sobrescritas))
    expect(r.d1).toBe(67)
    expect(r.status).toBe('inapta')
    expect(r.motivos.join(' ')).toMatch(/67,2/)
  })

  it('nível 0 em 1.1 → desclassificada, mesmo com D1 alto', () => {
    const r = calcularD1(niveis(4, { '1.1': 0 }))
    expect(r.d1).toBe(108)
    expect(r.status).toBe('desclassificada')
    expect(r.motivos.join(' ')).toMatch(/1\.1/)
  })

  it('nível 0 em 1.2 → desclassificada', () => {
    expect(calcularD1(niveis(4, { '1.2': 0 })).status).toBe('desclassificada')
  })

  it('desclassificação prevalece sobre inaptidão', () => {
    expect(calcularD1(niveis(1, { '1.1': 0 })).status).toBe('desclassificada')
  })

  it('nível 0 em subcritério não eliminatório (1.3) não desclassifica', () => {
    const r = calcularD1(niveis(4, { '1.3': 0 }))
    expect(r.status).toBe('apta')
  })

  it('nível 1 em 1.1 e 1.2 não desclassifica', () => {
    expect(calcularD1(niveis(4, { '1.1': 1, '1.2': 1 })).status).toBe('apta')
  })
})

describe('calcularD1 — avaliação incompleta', () => {
  it('sem todos os 28 níveis → pendente, com a lista do que falta', () => {
    const parcial = niveis(4)
    delete parcial['3.2']
    delete parcial['6.4']
    const r = calcularD1(parcial)
    expect(r.completa).toBe(false)
    expect(r.pendentes).toEqual(['3.2', '6.4'])
    expect(r.status).toBe('pendente')
    expect(r.d1).toBe(104)
  })

  it('nível 0 em eliminatório já desclassifica mesmo incompleta', () => {
    const r = calcularD1({ '1.1': 0 })
    expect(r.completa).toBe(false)
    expect(r.status).toBe('desclassificada')
  })
})

describe('calcularD1 — validação', () => {
  it.each([5, -1, 2.5, Number.NaN])('rejeita nível %s', (nivel) => {
    expect(() => calcularD1(niveis(3, { '2.2': nivel }))).toThrow(/2\.2/)
  })

  it('rejeita código de subcritério inexistente', () => {
    expect(() => calcularD1(niveis(3, { '7.1': 3 }))).toThrow(/7\.1/)
  })
})
