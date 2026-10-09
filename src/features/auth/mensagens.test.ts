import { describe, expect, it } from 'vitest'
import { mensagemErroLogin } from './mensagens'

describe('mensagemErroLogin', () => {
  it.each(['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-email'])(
    '%s → mensagem genérica (não revela se o e-mail existe)',
    (codigo) => {
      expect(mensagemErroLogin(codigo)).toBe('E-mail ou senha incorretos.')
    },
  )

  it('conta desativada', () => {
    expect(mensagemErroLogin('auth/user-disabled')).toMatch(/desativad/)
  })

  it('excesso de tentativas', () => {
    expect(mensagemErroLogin('auth/too-many-requests')).toMatch(/tentativas/)
  })

  it('falha de rede', () => {
    expect(mensagemErroLogin('auth/network-request-failed')).toMatch(/conexão/)
  })

  it('código desconhecido ou ausente → mensagem padrão', () => {
    expect(mensagemErroLogin('auth/qualquer-coisa')).toMatch(/Não foi possível entrar/)
    expect(mensagemErroLogin(undefined)).toMatch(/Não foi possível entrar/)
  })
})
