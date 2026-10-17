import { describe, expect, it } from 'vitest'
import type { ComId } from '../../lib/firestore'
import type { UsuarioCadastro } from '../../lib/tipos'
import { alternarPermissao, areasLiberadas, contagemPermissoes, filtrarUsuarios, ordenarUsuarios, resumoUsuarios } from './usuarios'

const u = (id: string, dados: Partial<UsuarioCadastro> = {}): ComId<UsuarioCadastro> => ({ id, email: `${id}@goias.gov.br`, ativo: true, ...dados })

const LISTA = [
  u('carla', { nome: 'Carla Dias', permissoes: ['consultar', 'nivelD1'] }),
  u('ana', { nome: 'Ana Lima', admin: true }),
  u('bruno', { nome: 'Bruno Reis', permissoes: [] }),
  u('davi', { nome: 'Davi Melo', permissoes: ['consultar'], ativo: false }),
]

describe('tela Usuários — números do topo', () => {
  it('total, administradores, sem nenhum acesso liberado e desativados', () => {
    expect(resumoUsuarios(LISTA)).toEqual({ total: 4, administradores: 1, semAcesso: 1, desativados: 1 })
  })
})

describe('busca e ordem', () => {
  it('busca por nome ou e-mail, sem diferenciar maiúsculas e acentos', () => {
    expect(filtrarUsuarios(LISTA, 'LIMA').map((x) => x.id)).toEqual(['ana'])
    expect(filtrarUsuarios(LISTA, 'bruno@').map((x) => x.id)).toEqual(['bruno'])
    expect(filtrarUsuarios([u('e', { nome: 'Érica' })], 'erica')).toHaveLength(1)
    expect(filtrarUsuarios(LISTA, '  ')).toHaveLength(4)
  })

  it('ordena por nome (ou e-mail, sem nome)', () => {
    expect(ordenarUsuarios([...LISTA, u('zz')]).map((x) => x.id)).toEqual(['ana', 'bruno', 'carla', 'davi', 'zz'])
  })
})

describe('resumo de cada linha', () => {
  it('áreas com ao menos uma permissão; administrador = todas', () => {
    expect(areasLiberadas(LISTA[0]!)).toEqual(['Consulta', 'Avaliação'])
    expect(areasLiberadas(LISTA[1]!)).toBe('todas')
    expect(areasLiberadas(LISTA[2]!)).toEqual([])
  })

  it('contagem de permissões ativas; administrador = automático', () => {
    expect(contagemPermissoes(LISTA[0]!)).toBe('2/14')
    expect(contagemPermissoes(LISTA[1]!)).toBe('Automático')
    expect(contagemPermissoes(u('x'))).toBe('0/14')
  })
})

describe('alternarPermissao', () => {
  it('liga ou desliga, mantendo a ordem das áreas', () => {
    expect(alternarPermissao(['nivelD1'], 'consultar')).toEqual(['consultar', 'nivelD1'])
    expect(alternarPermissao(['consultar', 'nivelD1'], 'consultar')).toEqual(['nivelD1'])
  })
})
