import { describe, expect, it } from 'vitest'
import type { Acesso } from '../../domain/permissoes'
import { decidirAcesso, type EstadoUsuario } from './acesso'

const logado = (acesso: Acesso | null): EstadoUsuario => ({
  carregando: false,
  usuario: { uid: 'u1', email: 'u1@seds.go.gov.br', nome: 'Pessoa', acesso },
})
const ADMIN: Acesso = { perfil: 'admin', ativo: true }
const PRESIDENTE: Acesso = { perfil: 'presidente', ativo: true }
/** Cadastro do modelo anterior (relator, membro, controle): sem perfil novo. */
const ANTIGO: Acesso = { perfil: null, ativo: true }

describe('decidirAcesso (rota protegida)', () => {
  it('enquanto o Firebase resolve a sessão ou o cadastro → carregando', () => {
    expect(decidirAcesso({ carregando: true, usuario: null })).toBe('carregando')
  })

  it('sem usuário → login', () => {
    expect(decidirAcesso({ carregando: false, usuario: null })).toBe('login')
  })

  it('logado sem cadastro, com cadastro antigo (sem perfil) ou desativado → nao-autorizado', () => {
    expect(decidirAcesso(logado(null))).toBe('nao-autorizado')
    expect(decidirAcesso(logado(ANTIGO))).toBe('nao-autorizado')
    expect(decidirAcesso(logado({ perfil: 'presidente', ativo: false }))).toBe('nao-autorizado')
  })

  it('admin ou presidente → liberado', () => {
    expect(decidirAcesso(logado(PRESIDENTE))).toBe('liberado')
    expect(decidirAcesso(logado(ADMIN))).toBe('liberado')
  })

  it('rota de gestão de usuários: só o admin', () => {
    expect(decidirAcesso(logado(PRESIDENTE), 'admin')).toBe('nao-autorizado')
    expect(decidirAcesso(logado(ADMIN), 'admin')).toBe('liberado')
  })
})
