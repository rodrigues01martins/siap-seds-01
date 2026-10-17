import { describe, expect, it } from 'vitest'
import { camposDoErro } from './base'
import { esquemaAlterarUsuario, esquemaNovoUsuario } from './usuarios'

const NOVO = { nome: ' Maria Souza ', email: ' Maria@Goias.gov.br ', perfil: 'presidente' }

describe('esquemaNovoUsuario (tela Usuários → Novo usuário)', () => {
  it('normaliza nome e e-mail; perfil admin ou presidente', () => {
    expect(esquemaNovoUsuario.parse(NOVO)).toEqual({ nome: 'Maria Souza', email: 'maria@goias.gov.br', perfil: 'presidente' })
    expect(esquemaNovoUsuario.parse({ ...NOVO, perfil: 'admin' }).perfil).toBe('admin')
  })

  it('rejeita campos inválidos com mensagem por campo; perfis antigos não existem', () => {
    const r = esquemaNovoUsuario.safeParse({ nome: 'M', email: 'x', perfil: 'relator' })
    expect(r.success).toBe(false)
    expect(camposDoErro(r.error!)).toEqual({
      nome: 'Informe o nome (ao menos 3 letras).',
      email: 'Informe um e-mail válido.',
      perfil: 'Perfil inválido: use admin ou presidente.',
    })
  })

  it('campos do modelo anterior (admin, permissões, papel) não são aceitos', () => {
    const r = esquemaNovoUsuario.safeParse({ ...NOVO, admin: false, permissoes: [], comissao: null })
    expect(camposDoErro(r.error!)).toEqual({ admin: 'Campo não permitido.', permissoes: 'Campo não permitido.', comissao: 'Campo não permitido.' })
  })
})

describe('esquemaAlterarUsuario (tela Usuários → Gerenciar)', () => {
  it('aceita só os campos enviados', () => {
    expect(esquemaAlterarUsuario.parse({ uid: 'abc', ativo: false })).toEqual({ uid: 'abc', ativo: false })
    expect(esquemaAlterarUsuario.parse({ uid: 'abc', perfil: 'admin' })).toEqual({ uid: 'abc', perfil: 'admin' })
  })

  it('exige algo para alterar e um uid válido; perfil antigo é rejeitado', () => {
    expect(camposDoErro(esquemaAlterarUsuario.safeParse({ uid: 'abc' }).error!)).toEqual({ _: 'Informe ao menos um campo para alterar.' })
    expect(esquemaAlterarUsuario.safeParse({ uid: 'a/b', perfil: 'admin' }).success).toBe(false)
    expect(esquemaAlterarUsuario.safeParse({ uid: 'abc', email: 'x@y.z' }).success).toBe(false)
    expect(esquemaAlterarUsuario.safeParse({ uid: 'abc', perfil: 'membro' }).success).toBe(false)
  })
})
