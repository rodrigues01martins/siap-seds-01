import { describe, expect, it } from 'vitest'
import { ErroConfiguracao, lerConfigFirebase, usarEmuladores } from './configFirebase'

const COMPLETO = {
  VITE_FIREBASE_API_KEY: 'chave',
  VITE_FIREBASE_AUTH_DOMAIN: 'siap-dev.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'siap-dev',
  VITE_FIREBASE_APP_ID: '1:123:web:abc',
}

describe('lerConfigFirebase', () => {
  it('monta a configuração do SDK a partir das 4 variáveis', () => {
    expect(lerConfigFirebase(COMPLETO)).toEqual({
      apiKey: 'chave',
      authDomain: 'siap-dev.firebaseapp.com',
      projectId: 'siap-dev',
      appId: '1:123:web:abc',
    })
  })

  it('falha listando TODAS as variáveis ausentes', () => {
    const { VITE_FIREBASE_API_KEY: _a, VITE_FIREBASE_APP_ID: _b, ...parcial } = COMPLETO
    try {
      lerConfigFirebase(parcial)
      expect.unreachable('deveria lançar erro')
    } catch (erro) {
      expect(erro).toBeInstanceOf(ErroConfiguracao)
      expect((erro as ErroConfiguracao).faltando).toEqual(['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_APP_ID'])
      expect((erro as Error).message).toMatch(/VITE_FIREBASE_API_KEY.*VITE_FIREBASE_APP_ID/)
    }
  })

  it('trata valor vazio ou só com espaços como ausente', () => {
    expect(() => lerConfigFirebase({ ...COMPLETO, VITE_FIREBASE_PROJECT_ID: '   ' })).toThrow(
      /VITE_FIREBASE_PROJECT_ID/,
    )
  })

  it('a mensagem não expõe os valores já definidos', () => {
    expect(() => lerConfigFirebase({ ...COMPLETO, VITE_FIREBASE_APP_ID: '' })).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining('chave') }),
    )
  })
})

describe('usarEmuladores', () => {
  it('só no servidor de desenvolvimento do Vite e com VITE_USAR_EMULADORES=true', () => {
    expect(usarEmuladores({ DEV: true, VITE_USAR_EMULADORES: 'true' })).toBe(true)
    expect(usarEmuladores({ DEV: true, VITE_USAR_EMULADORES: 'false' })).toBe(false)
    expect(usarEmuladores({ DEV: true })).toBe(false)
  })

  it('nunca no build (produção e preview), mesmo com a variável ligada por engano', () => {
    expect(usarEmuladores({ DEV: false, PROD: true, VITE_USAR_EMULADORES: 'true' })).toBe(false)
  })
})
