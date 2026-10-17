import { describe, expect, it } from 'vitest'
import { ACESSO_DESATUALIZADO, PERFIS, ROTULO_PERFIL, lerAcesso, podeFazer, podeLer, precisaAtualizarAcesso, type Acesso } from './permissoes'

const acesso = (perfil: Acesso['perfil'], ativo = true): Acesso => ({ perfil, ativo })

describe('perfis (espelho da seção do CLAUDE.md)', () => {
  it('só dois: admin e presidente', () => {
    expect([...PERFIS]).toEqual(['admin', 'presidente'])
    expect(ROTULO_PERFIL).toEqual({ admin: 'Administrador', presidente: 'Presidente' })
  })
})

describe('podeFazer: os dois fazem tudo; só o admin gerencia usuários', () => {
  it('admin: tudo, inclusive usuários', () => {
    expect(podeFazer(acesso('admin'))).toBe(true)
    expect(podeFazer(acesso('admin'), 'admin')).toBe(true)
  })

  it('presidente: tudo, menos usuários e perfis', () => {
    expect(podeFazer(acesso('presidente'))).toBe(true)
    expect(podeFazer(acesso('presidente'), 'usuario')).toBe(true)
    expect(podeFazer(acesso('presidente'), 'admin')).toBe(false)
  })

  it('sem perfil (cadastro antigo), desativado ou sem cadastro: nada', () => {
    expect(podeFazer(acesso(null))).toBe(false)
    expect(podeFazer(acesso('admin', false), 'admin')).toBe(false)
    expect(podeFazer(null)).toBe(false)
  })
})

describe('podeLer e acesso desatualizado', () => {
  it('entra quem está ativo com perfil', () => {
    expect(podeLer(acesso('admin'))).toBe(true)
    expect(podeLer(acesso('presidente'))).toBe(true)
    expect(podeLer(acesso(null))).toBe(false)
    expect(podeLer(acesso('presidente', false))).toBe(false)
    expect(podeLer(null)).toBe(false)
  })

  it('cadastro ativo sem perfil novo: "Seu acesso precisa ser atualizado pelo administrador."', () => {
    expect(ACESSO_DESATUALIZADO).toBe('Seu acesso precisa ser atualizado pelo administrador.')
    expect(precisaAtualizarAcesso(acesso(null))).toBe(true)
    expect(precisaAtualizarAcesso(acesso('presidente'))).toBe(false)
    expect(precisaAtualizarAcesso(acesso(null, false))).toBe(false)
    expect(precisaAtualizarAcesso(null)).toBe(false)
  })
})

describe('lerAcesso (documento usuarios/{uid})', () => {
  it('lê o perfil e o ativo', () => {
    expect(lerAcesso({ email: 'a@b.c', perfil: 'presidente' })).toEqual({ perfil: 'presidente', ativo: true })
    expect(lerAcesso({ perfil: 'admin', ativo: false })).toEqual({ perfil: 'admin', ativo: false })
  })

  it('cadastro do modelo anterior (relator, membro, controle) fica sem perfil', () => {
    expect(lerAcesso({ admin: false, permissoes: ['consultar', 'nivelD1'], comissao: 'relator' })).toEqual({ perfil: null, ativo: true })
    expect(lerAcesso({ perfil: 'relator' })).toEqual({ perfil: null, ativo: true })
  })

  it('administrador do modelo anterior (admin: true, sem perfil) continua admin; o perfil novo vale mais', () => {
    expect(lerAcesso({ admin: true, permissoes: [] })).toEqual({ perfil: 'admin', ativo: true })
    expect(lerAcesso({ admin: true, perfil: 'presidente' })).toEqual({ perfil: 'presidente', ativo: true })
  })

  it('documento ausente é null', () => {
    expect(lerAcesso(undefined)).toBeNull()
    expect(lerAcesso(null)).toBeNull()
  })
})
