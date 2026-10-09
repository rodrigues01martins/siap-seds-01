import { describe, expect, it } from 'vitest'
import { itensDoMenu } from './menu'

const caminhos = (perfil: Parameters<typeof itensDoMenu>[0]) => itensDoMenu(perfil).map((i) => i.caminho)

describe('menu lateral por perfil', () => {
  it('admin: chamamentos, OSCs e perfis', () => {
    expect(caminhos('admin')).toEqual(['/', '/oscs', '/perfis'])
  })

  it.each(['presidente', 'relator', 'membro'] as const)('%s: só chamamentos', (perfil) => {
    expect(caminhos(perfil)).toEqual(['/'])
  })

  it('controle: chamamentos, só leitura (Etapa 4b); sem perfil: nada', () => {
    expect(caminhos('controle')).toEqual(['/'])
    expect(caminhos(null)).toEqual([])
  })

  it('rótulos em português', () => {
    expect(itensDoMenu('admin').map((i) => i.rotulo)).toEqual(['Chamamentos', 'OSCs', 'Perfis de acesso'])
  })
})
