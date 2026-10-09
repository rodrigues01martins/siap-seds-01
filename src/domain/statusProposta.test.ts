import { describe, expect, it } from 'vitest'
import { ROTULO_STATUS, statusDaProposta } from './statusProposta'

describe('statusDaProposta (painel do chamamento)', () => {
  it('sem totais calculados → pendente', () => {
    expect(statusDaProposta({})).toBe('pendente')
  })

  it('usa o status dos totais gravados pelo servidor', () => {
    for (const status of ['pendente', 'apta', 'inapta', 'desclassificada'] as const) {
      expect(statusDaProposta({ totais: { status } })).toBe(status)
    }
  })

  it('homologada prevalece sobre o status da avaliação', () => {
    expect(statusDaProposta({ bloqueada: true, totais: { status: 'apta' } })).toBe('homologada')
    expect(statusDaProposta({ bloqueada: true, totais: { status: 'inapta' } })).toBe('homologada')
  })

  it('status desconhecido (dado adulterado) é tratado como pendente', () => {
    expect(statusDaProposta({ totais: { status: 'aprovada' } })).toBe('pendente')
  })

  it('todo status tem rótulo em português', () => {
    expect(ROTULO_STATUS).toEqual({
      pendente: 'Pendente',
      apta: 'Apta',
      inapta: 'Inapta',
      desclassificada: 'Desclassificada',
      homologada: 'Homologada',
    })
  })
})
