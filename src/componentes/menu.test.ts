import { describe, expect, it } from 'vitest'
import type { Acesso } from '../domain/permissoes'
import { itensDoMenu } from './menu'

const caminhos = (acesso: Acesso | null) => itensDoMenu(acesso).map((i) => i.caminho)
const comum = (permissoes: Acesso['permissoes']): Acesso => ({ admin: false, ativo: true, permissoes })

describe('menu lateral conforme o acesso', () => {
  it('administrador: chamamentos, OSCs, usuários e histórico', () => {
    expect(caminhos({ admin: true, ativo: true, permissoes: [] })).toEqual(['/', '/oscs', '/usuarios', '/auditoria'])
  })

  it('com a permissão OSCs: chamamentos e OSCs', () => {
    expect(caminhos(comum(['oscs']))).toEqual(['/', '/oscs'])
  })

  it('só consulta ou avaliação: só chamamentos', () => {
    expect(caminhos(comum(['consultar']))).toEqual(['/'])
    expect(caminhos(comum(['nivelD1', 'homologar']))).toEqual(['/'])
  })

  it('sem acesso: nada', () => {
    expect(caminhos(null)).toEqual([])
    expect(caminhos(comum([]))).toEqual([])
    expect(caminhos({ admin: true, ativo: false, permissoes: [] })).toEqual([])
  })

  it('rótulos em português', () => {
    expect(itensDoMenu({ admin: true, ativo: true, permissoes: [] }).map((i) => i.rotulo)).toEqual([
      'Chamamentos',
      'OSCs',
      'Usuários',
      'Histórico de alterações',
    ])
  })
})
