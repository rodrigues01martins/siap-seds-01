import { describe, expect, it } from 'vitest'
import { AREAS, PERMISSOES, lerAcesso, podeFazer, podeLer, type Acesso } from './permissoes'

const usuario = (permissoes: Acesso['permissoes'], extras: Partial<Acesso> = {}): Acesso => ({
  admin: false,
  ativo: true,
  permissoes,
  ...extras,
})

describe('áreas e permissões (espelho da seção do CLAUDE.md)', () => {
  it('correspondem exatamente à tabela aprovada', () => {
    expect(AREAS.map((a) => [a.rotulo, a.permissoes.map((p) => p.id)])).toEqual([
      ['Consulta', ['consultar']],
      ['Cadastros', ['chamamentos', 'oscs', 'propostas']],
      ['Avaliação', ['admissibilidade', 'nivelD1', 'experienciasD2', 'diligencias']],
      ['Sessão e resultado', ['sessaoAbrirEncerrar', 'sessaoConduzir', 'homologar', 'reabrir', 'desempate', 'resetarSessao']],
    ])
    expect(PERMISSOES).toHaveLength(14)
    expect(new Set(PERMISSOES).size).toBe(14)
  })
})

describe('podeFazer', () => {
  it('administrador pode tudo, inclusive a gestão de usuários', () => {
    const admin = usuario([], { admin: true })
    for (const p of PERMISSOES) expect(podeFazer(admin, p)).toBe(true)
    expect(podeFazer(admin, 'admin')).toBe(true)
  })

  it('usuário comum só faz o que foi liberado e nunca a gestão de usuários', () => {
    const avaliador = usuario(['consultar', 'nivelD1'])
    expect(podeFazer(avaliador, 'nivelD1')).toBe(true)
    expect(podeFazer(avaliador, 'homologar')).toBe(false)
    expect(podeFazer(avaliador, 'admin')).toBe(false)
  })

  it('conta desativada ou sem cadastro não faz nada', () => {
    expect(podeFazer(usuario(['nivelD1'], { ativo: false }), 'nivelD1')).toBe(false)
    expect(podeFazer(usuario([], { admin: true, ativo: false }), 'admin')).toBe(false)
    expect(podeFazer(null, 'consultar')).toBe(false)
  })
})

describe('podeLer (entra no app e consulta os dados)', () => {
  it('administrador ou quem tem ao menos uma permissão', () => {
    expect(podeLer(usuario([], { admin: true }))).toBe(true)
    expect(podeLer(usuario(['consultar']))).toBe(true)
    expect(podeLer(usuario(['homologar']))).toBe(true)
  })

  it('sem nenhuma permissão, desativado ou sem cadastro: não', () => {
    expect(podeLer(usuario([]))).toBe(false)
    expect(podeLer(usuario(['consultar'], { ativo: false }))).toBe(false)
    expect(podeLer(null)).toBe(false)
  })
})

describe('lerAcesso (documento usuarios/{uid})', () => {
  it('lê admin, ativo e permissões, descartando as desconhecidas', () => {
    expect(lerAcesso({ email: 'a@b.c', admin: true, permissoes: ['nivelD1', 'superpoder', 3], ativo: true })).toEqual({
      admin: true,
      ativo: true,
      permissoes: ['nivelD1'],
    })
  })

  it('campos ausentes: não admin, ativo e sem permissões', () => {
    expect(lerAcesso({ email: 'a@b.c' })).toEqual({ admin: false, ativo: true, permissoes: [] })
    expect(lerAcesso({ admin: 'sim', permissoes: 'nivelD1', ativo: 'não' })).toEqual({ admin: false, ativo: true, permissoes: [] })
  })

  it('ativo=false desativa; documento ausente é null', () => {
    expect(lerAcesso({ admin: true, ativo: false })).toMatchObject({ ativo: false })
    expect(lerAcesso(undefined)).toBeNull()
    expect(lerAcesso(null)).toBeNull()
  })
})
