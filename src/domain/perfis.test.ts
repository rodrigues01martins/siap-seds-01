import { describe, expect, it } from 'vitest'
import { PERFIS, ehPerfil, extrairPerfil } from './perfis'

describe('perfis', () => {
  it('são exatamente admin, presidente, relator, membro e controle', () => {
    expect([...PERFIS]).toEqual(['admin', 'presidente', 'relator', 'membro', 'controle'])
  })

  it.each(['admin', 'presidente', 'relator', 'membro', 'controle'])('"%s" é perfil válido', (p) => {
    expect(ehPerfil(p)).toBe(true)
  })

  it.each(['Admin', 'ADMIN', ' admin', 'avaliador', '', 1, null, undefined, {}])('%j não é perfil', (p) => {
    expect(ehPerfil(p)).toBe(false)
  })
})

describe('extrairPerfil (custom claim "perfil" do ID token)', () => {
  it('devolve o perfil quando o claim é válido', () => {
    expect(extrairPerfil({ perfil: 'relator', email: 'x@y.z' })).toBe('relator')
  })

  it('devolve null sem claim, com claim desconhecido ou sem claims', () => {
    expect(extrairPerfil({})).toBeNull()
    expect(extrairPerfil({ perfil: 'superusuario' })).toBeNull()
    expect(extrairPerfil({ perfil: ['admin'] })).toBeNull()
    expect(extrairPerfil(null)).toBeNull()
    expect(extrairPerfil(undefined)).toBeNull()
  })
})
