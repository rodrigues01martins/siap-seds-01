import { describe, expect, it } from 'vitest'
import type { ComId } from '../../lib/firestore'
import type { UsuarioCadastro } from '../../lib/tipos'
import { filtrarUsuarios, ordenarUsuarios, perfilDe, resumoUsuarios } from './usuarios'

const u = (id: string, dados: Partial<UsuarioCadastro> = {}): ComId<UsuarioCadastro> => ({ id, email: `${id}@goias.gov.br`, ativo: true, ...dados })

const LISTA = [
  u('carla', { nome: 'Carla Dias', perfil: 'presidente' }),
  u('ana', { nome: 'Ana Lima', perfil: 'admin' }),
  // Cadastro do modelo anterior (relator): sem perfil, precisa ser atualizado.
  u('bruno', { nome: 'Bruno Reis', admin: false }),
  u('davi', { nome: 'Davi Melo', perfil: 'presidente', ativo: false }),
  u('edu', { nome: 'Edu Admin Antigo', admin: true }),
]

describe('tela Usuários — números do topo', () => {
  it('total, administradores, presidentes, acesso a atualizar (cadastro antigo) e desativados', () => {
    expect(resumoUsuarios(LISTA)).toEqual({ total: 5, administradores: 2, presidentes: 2, acessoAtualizar: 1, desativados: 1 })
  })
})

describe('perfil de cada linha', () => {
  it('perfil novo; administrador antigo = admin; cadastro antigo = null', () => {
    expect(LISTA.map(perfilDe)).toEqual(['presidente', 'admin', null, 'presidente', 'admin'])
  })
})

describe('busca e ordem', () => {
  it('busca por nome ou e-mail, sem diferenciar maiúsculas e acentos', () => {
    expect(filtrarUsuarios(LISTA, 'LIMA').map((x) => x.id)).toEqual(['ana'])
    expect(filtrarUsuarios(LISTA, 'bruno@').map((x) => x.id)).toEqual(['bruno'])
    expect(filtrarUsuarios([u('e', { nome: 'Érica' })], 'erica')).toHaveLength(1)
    expect(filtrarUsuarios(LISTA, '  ')).toHaveLength(5)
  })

  it('ordena por nome (ou e-mail, sem nome)', () => {
    expect(ordenarUsuarios([...LISTA, u('zz')]).map((x) => x.id)).toEqual(['ana', 'bruno', 'carla', 'davi', 'edu', 'zz'])
  })
})
