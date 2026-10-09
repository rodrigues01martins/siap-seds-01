import { describe, expect, it } from 'vitest'
import { itensDoMenu } from './menu'

const caminhos = (perfil: Parameters<typeof itensDoMenu>[0]) => itensDoMenu(perfil).map((i) => i.caminho)

describe('menu lateral por perfil', () => {
  it('admin: chamamentos, OSCs, perfis e auditoria', () => {
    expect(caminhos('admin')).toEqual(['/', '/oscs', '/perfis', '/auditoria'])
  })

  it('presidente: chamamentos e auditoria (Etapa 6b)', () => {
    expect(caminhos('presidente')).toEqual(['/', '/auditoria'])
  })

  it.each(['relator', 'membro'] as const)('%s: só chamamentos', (perfil) => {
    expect(caminhos(perfil)).toEqual(['/'])
  })

  it('controle: chamamentos (só leitura) e auditoria; sem perfil: nada', () => {
    expect(caminhos('controle')).toEqual(['/', '/auditoria'])
    expect(caminhos(null)).toEqual([])
  })

  it('rótulos em português', () => {
    expect(itensDoMenu('admin').map((i) => i.rotulo)).toEqual(['Chamamentos', 'OSCs', 'Perfis de acesso', 'Auditoria'])
  })
})
