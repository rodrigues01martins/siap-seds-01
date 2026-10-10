import { describe, expect, it } from 'vitest'
import { camposDoErro } from './base'
import { esquemaAlterarUsuario, esquemaNovoUsuario } from './usuarios'

const NOVO = { nome: ' Maria Souza ', email: ' Maria@Goias.gov.br ', admin: false, permissoes: ['consultar', 'nivelD1'], comissao: 'membro' }

describe('esquemaNovoUsuario (tela Usuários → Novo usuário)', () => {
  it('normaliza nome e e-mail', () => {
    expect(esquemaNovoUsuario.parse(NOVO)).toEqual({ ...NOVO, nome: 'Maria Souza', email: 'maria@goias.gov.br' })
  })

  it('papel na Comissão é opcional (vazio ou null = sem papel)', () => {
    expect(esquemaNovoUsuario.parse({ ...NOVO, comissao: '' }).comissao).toBeNull()
    expect(esquemaNovoUsuario.parse({ ...NOVO, comissao: null }).comissao).toBeNull()
  })

  it('rejeita campos inválidos com mensagem por campo', () => {
    const r = esquemaNovoUsuario.safeParse({ nome: 'M', email: 'x', admin: 'sim', permissoes: ['superpoder'], comissao: 'chefe' })
    expect(r.success).toBe(false)
    expect(camposDoErro(r.error!)).toMatchObject({
      nome: 'Informe o nome (ao menos 3 letras).',
      email: 'Informe um e-mail válido.',
      'permissoes.0': 'Permissão desconhecida.',
      comissao: 'Papel inválido: use presidente, relator ou membro.',
    })
  })

  it('permissão repetida é rejeitada', () => {
    expect(esquemaNovoUsuario.safeParse({ ...NOVO, permissoes: ['nivelD1', 'nivelD1'] }).success).toBe(false)
  })
})

describe('esquemaAlterarUsuario (tela Usuários → Gerenciar)', () => {
  it('aceita só os campos enviados', () => {
    expect(esquemaAlterarUsuario.parse({ uid: 'abc', ativo: false })).toEqual({ uid: 'abc', ativo: false })
    expect(esquemaAlterarUsuario.parse({ uid: 'abc', comissao: null })).toEqual({ uid: 'abc', comissao: null })
  })

  it('exige algo para alterar e um uid válido', () => {
    expect(camposDoErro(esquemaAlterarUsuario.safeParse({ uid: 'abc' }).error!)).toEqual({ _: 'Informe ao menos um campo para alterar.' })
    expect(esquemaAlterarUsuario.safeParse({ uid: 'a/b', admin: true }).success).toBe(false)
    expect(esquemaAlterarUsuario.safeParse({ uid: 'abc', email: 'x@y.z' }).success).toBe(false)
  })
})
