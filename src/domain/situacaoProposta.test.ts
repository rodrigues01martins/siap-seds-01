import { describe, expect, it } from 'vitest'
import { ROTULO_SITUACAO, situacaoDaProposta } from './situacaoProposta'

describe('situação da proposta exibida nas telas e relatórios (sem homologação)', () => {
  it('o campo bloqueada (homologação antiga) é ignorado: vale a avaliação', () => {
    expect(situacaoDaProposta({ bloqueada: true, totais: { status: 'apta' } })).toBe('apta')
    expect(situacaoDaProposta({ bloqueada: true })).toBe('pendente')
  })

  it('admissibilidade antes da avaliação; sem totais → pendente', () => {
    expect(situacaoDaProposta({ admissibilidade: { situacao: 'nao_admitida' }, totais: { status: 'apta' } })).toBe('nao_admitida')
    expect(situacaoDaProposta({ totais: { status: 'inapta' } })).toBe('inapta')
    expect(situacaoDaProposta({})).toBe('pendente')
  })

  it('rótulos sem "Homologada"', () => {
    expect(Object.values(ROTULO_SITUACAO)).not.toContain('Homologada')
    expect(ROTULO_SITUACAO.nao_admitida).toBe('Não admitida')
  })
})
