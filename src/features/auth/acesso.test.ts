import { describe, expect, it } from 'vitest'
import type { Acesso } from '../../domain/permissoes'
import { decidirAcesso, type EstadoUsuario } from './acesso'

const logado = (acesso: Acesso | null): EstadoUsuario => ({
  carregando: false,
  usuario: { uid: 'u1', email: 'u1@seds.go.gov.br', nome: 'Pessoa', acesso },
})
const comum = (permissoes: Acesso['permissoes'], ativo = true): Acesso => ({ admin: false, ativo, permissoes })
const ADMIN: Acesso = { admin: true, ativo: true, permissoes: [] }

describe('decidirAcesso (rota protegida)', () => {
  it('enquanto o Firebase resolve a sessão ou o cadastro → carregando', () => {
    expect(decidirAcesso({ carregando: true, usuario: null })).toBe('carregando')
  })

  it('sem usuário → login', () => {
    expect(decidirAcesso({ carregando: false, usuario: null })).toBe('login')
  })

  it('logado sem cadastro, sem nenhuma permissão ou desativado → nao-autorizado', () => {
    expect(decidirAcesso(logado(null))).toBe('nao-autorizado')
    expect(decidirAcesso(logado(comum([])))).toBe('nao-autorizado')
    expect(decidirAcesso(logado(comum(['consultar'], false)))).toBe('nao-autorizado')
  })

  it('com ao menos uma permissão ou administrador → liberado', () => {
    expect(decidirAcesso(logado(comum(['consultar'])))).toBe('liberado')
    expect(decidirAcesso(logado(ADMIN))).toBe('liberado')
  })

  it('rota que exige uma permissão ou o administrador', () => {
    expect(decidirAcesso(logado(comum(['consultar'])), 'chamamentos')).toBe('nao-autorizado')
    expect(decidirAcesso(logado(comum(['chamamentos'])), 'chamamentos')).toBe('liberado')
    expect(decidirAcesso(logado(comum(['chamamentos'])), 'admin')).toBe('nao-autorizado')
    expect(decidirAcesso(logado(ADMIN), 'admin')).toBe('liberado')
  })
})
