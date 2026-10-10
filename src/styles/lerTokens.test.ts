import { describe, expect, it } from 'vitest'
import { corDoToken, variaveisCss } from './lerTokens'

describe('leitura dos tokens como texto (relatórios)', () => {
  const mapa = variaveisCss(':root { --a: #0af; /* x: #fff */ --b: var(--a); --c: var(--b); --d: 12px; --e: var(--e); }')

  it('resolve var() em cadeia até o HEX, em maiúsculas e com 6 dígitos', () => {
    expect(corDoToken('c', mapa)).toBe('#00AAFF')
  })

  it('recusa token inexistente, valor que não é cor e ciclo', () => {
    expect(() => corDoToken('z', mapa)).toThrow('inexistente')
    expect(() => corDoToken('d', mapa)).toThrow('HEX')
    expect(() => corDoToken('e', mapa)).toThrow('ciclo')
  })
})
