import { describe, expect, it } from 'vitest'
import type { Perfil } from '../../domain/perfis'
import { decidirAcesso, type EstadoUsuario } from './acesso'

const logado = (perfil: Perfil | null): EstadoUsuario => ({
  carregando: false,
  usuario: { uid: 'u1', email: 'u1@seds.go.gov.br', perfil },
})

describe('decidirAcesso (rota protegida)', () => {
  it('enquanto o Firebase resolve a sessão → carregando', () => {
    expect(decidirAcesso({ carregando: true, usuario: null })).toBe('carregando')
  })

  it('sem usuário → login', () => {
    expect(decidirAcesso({ carregando: false, usuario: null })).toBe('login')
  })

  it('logado sem perfil → nao-autorizado', () => {
    expect(decidirAcesso(logado(null))).toBe('nao-autorizado')
  })

  it.each(['admin', 'presidente', 'relator', 'membro', 'controle'] as const)('perfil %s → liberado', (perfil) => {
    expect(decidirAcesso(logado(perfil))).toBe('liberado')
  })

  it('rota restrita a perfis: perfil fora da lista → nao-autorizado', () => {
    expect(decidirAcesso(logado('controle'), ['admin', 'presidente'])).toBe('nao-autorizado')
    expect(decidirAcesso(logado('admin'), ['admin', 'presidente'])).toBe('liberado')
  })
})
