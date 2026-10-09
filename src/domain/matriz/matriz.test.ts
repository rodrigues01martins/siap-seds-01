import { describe, expect, it } from 'vitest'
import { MATRIZ_2026, validarMatriz } from './index'
import type { Matriz } from './tipos'

const copia = (): Matriz => structuredClone(MATRIZ_2026)

describe('matriz_2026.json — Dimensão 1', () => {
  const { dimensao1 } = MATRIZ_2026

  it('tem 6 PAs na ordem PA1..PA6', () => {
    expect(dimensao1.planos.map((p) => p.codigo)).toEqual(['PA1', 'PA2', 'PA3', 'PA4', 'PA5', 'PA6'])
  })

  it('tem 28 subcritérios com códigos únicos', () => {
    const codigos = dimensao1.planos.flatMap((p) => p.subcriterios.map((s) => s.codigo))
    expect(codigos).toHaveLength(28)
    expect(new Set(codigos).size).toBe(28)
  })

  it('distribui os subcritérios 5, 5, 4, 6, 4, 4', () => {
    expect(dimensao1.planos.map((p) => p.subcriterios.length)).toEqual([5, 5, 4, 6, 4, 4])
  })

  it('cada subcritério tem título, elementos e 4 pontos', () => {
    for (const plano of dimensao1.planos) {
      for (const s of plano.subcriterios) {
        expect(s.titulo.length).toBeGreaterThan(0)
        expect(s.elementos.length).toBeGreaterThan(0)
        expect(s.pontos).toBe(4)
      }
    }
  })

  it('máximos por PA (20, 20, 16, 24, 16, 16) batem com a soma dos subcritérios e somam 112', () => {
    expect(dimensao1.planos.map((p) => p.maximo)).toEqual([20, 20, 16, 24, 16, 16])
    for (const plano of dimensao1.planos) {
      expect(plano.subcriterios.reduce((t, s) => t + s.pontos, 0)).toBe(plano.maximo)
    }
    expect(dimensao1.planos.reduce((t, p) => t + p.maximo, 0)).toBe(112)
    expect(dimensao1.maximo).toBe(112)
  })

  it('limites de páginas são 12, 12, 8, 12, 10, 8', () => {
    expect(dimensao1.planos.map((p) => p.limitePaginas)).toEqual([12, 12, 8, 12, 10, 8])
  })

  it('limites de páginas citam o Anexo III, item 7.1', () => {
    expect(dimensao1.fonteLimitePaginas).toBe('Anexo III – Caderno de Proposta Técnica, item 7.1 (SEI 95574003)')
  })

  it('escala 0–4 com descritores', () => {
    expect(dimensao1.escala.map((e) => e.nivel)).toEqual([0, 1, 2, 3, 4])
    for (const e of dimensao1.escala) expect(e.descritor.length).toBeGreaterThan(0)
  })

  it('corte = 67,2 (60% de 112) e eliminatórios = 1.1 e 1.2', () => {
    expect(dimensao1.corte).toBe(67.2)
    expect(dimensao1.corte).toBeCloseTo(dimensao1.maximo * 0.6, 10)
    expect(dimensao1.subcriteriosEliminatorios).toEqual(['1.1', '1.2'])
  })
})

describe('matriz_2026.json — Dimensão 2', () => {
  const { criterios } = MATRIZ_2026.dimensao2

  it('máximos 8 + 4 + 4 + 4 = 20 e NF máxima = 132', () => {
    expect(criterios['C2.1'].maximo).toBe(8)
    expect(criterios['C2.2'].maximo).toBe(4)
    expect(criterios['C2.3'].maximo).toBe(4)
    expect(criterios['C2.4'].maximo).toBe(4)
    expect(MATRIZ_2026.dimensao2.maximo).toBe(20)
    expect(MATRIZ_2026.notaFinalMaxima).toBe(MATRIZ_2026.dimensao1.maximo + MATRIZ_2026.dimensao2.maximo)
  })

  it('C2.1: categorias A=4, B=2, C=1, D=1 somam 8; A e B são mutuamente exclusivas', () => {
    const c21 = criterios['C2.1']
    expect(c21.categorias.map((c) => [c.codigo, c.pontos])).toEqual([
      ['A', 4],
      ['B', 2],
      ['C', 1],
      ['D', 1],
    ])
    expect(c21.categoriasMutuamenteExclusivas).toEqual([{ categorias: ['A', 'B'] }])
  })

  it('C2.3: subcritérios 2.3.1 (2), 2.3.2 (1), 2.3.3 (1); 2.3.1 = A (1) + B (1)', () => {
    const sub = criterios['C2.3'].subcriterios
    expect(sub['2.3.1'].maximo).toBe(2)
    expect(sub['2.3.1'].A.maximo).toBe(1)
    expect(sub['2.3.1'].B.maximo).toBe(1)
    expect(sub['2.3.2'].maximo).toBe(1)
    expect(sub['2.3.3'].maximo).toBe(1)
  })
})

describe('compatibilidade com o Firestore (matrizes/2026)', () => {
  /** O Firestore não aceita array dentro de array; o seed falharia. */
  function caminhosComArrayAninhado(valor: unknown, caminho = '$'): string[] {
    if (Array.isArray(valor)) {
      return valor.flatMap((item, i) =>
        Array.isArray(item) ? [`${caminho}[${i}]`] : caminhosComArrayAninhado(item, `${caminho}[${i}]`),
      )
    }
    if (valor && typeof valor === 'object') {
      return Object.entries(valor).flatMap(([k, v]) => caminhosComArrayAninhado(v, `${caminho}.${k}`))
    }
    return []
  }

  it('não contém arrays aninhados', () => {
    expect(caminhosComArrayAninhado(MATRIZ_2026)).toEqual([])
  })
})

describe('validarMatriz', () => {
  it('aceita a matriz oficial', () => {
    expect(() => validarMatriz(copia())).not.toThrow()
  })

  it('rejeita PA cujo máximo não bate com a soma dos subcritérios', () => {
    const m = copia()
    m.dimensao1.planos[0]!.maximo = 21
    expect(() => validarMatriz(m)).toThrow(/PA1/)
  })

  it('rejeita código de subcritério duplicado', () => {
    const m = copia()
    m.dimensao1.planos[1]!.subcriterios[0]!.codigo = '1.1'
    expect(() => validarMatriz(m)).toThrow(/duplicado/)
  })

  it('rejeita faixas fora de ordem crescente', () => {
    const m = copia()
    m.dimensao2.criterios['C2.2'].faixas.reverse()
    expect(() => validarMatriz(m)).toThrow(/C2.2/)
  })

  it('rejeita faixas sem a faixa final ilimitada (ate = null)', () => {
    const m = copia()
    m.dimensao2.criterios['C2.4'].faixas.pop()
    expect(() => validarMatriz(m)).toThrow(/C2.4/)
  })
})
