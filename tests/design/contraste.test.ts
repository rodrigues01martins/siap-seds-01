// Contraste WCAG 2.2 AA de todos os pares semânticos usados na interface (tests/design/pares.ts).
import { describe, expect, it } from 'vitest'
import { MINIMO, PARES } from './pares'
import { contraste, cor } from './tokens'

describe('contraste dos tokens (WCAG 2.2 AA)', () => {
  it.each(PARES)('$uso: --$frente sobre --$fundo ($tipo)', ({ frente, fundo, tipo }) => {
    const razao = contraste(cor(frente), cor(fundo))
    expect(razao, `${frente} ${cor(frente)} sobre ${fundo} ${cor(fundo)} = ${razao.toFixed(2)}:1`).toBeGreaterThanOrEqual(MINIMO[tipo])
  })

  it('cálculo confere com valores conhecidos (preto/branco 21:1; #005FAA/branco ≈ 6,5:1; o DS arredonda para 6,4)', () => {
    expect(contraste('#000000', '#FFFFFF')).toBeCloseTo(21, 5)
    expect(contraste('#005FAA', '#FFFFFF')).toBeCloseTo(6.53, 2)
    expect(contraste('#858585', '#FFFFFF')).toBeLessThan(4.5) // por isso text.muted virou #707070 (DS §8)
  })
})
