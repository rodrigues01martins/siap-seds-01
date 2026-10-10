import { describe, expect, it } from 'vitest'
import { PAPEIS_COMISSAO, ROTULO_PAPEL, ehPapelComissao } from './comissao'

describe('papel na Comissão de Seleção (aparece na sessão e na ata; não dá permissão)', () => {
  it('são presidente, relator e membro, nessa ordem', () => {
    expect([...PAPEIS_COMISSAO]).toEqual(['presidente', 'relator', 'membro'])
    expect(ROTULO_PAPEL).toEqual({ presidente: 'Presidente', relator: 'Relator', membro: 'Membro' })
  })

  it.each(['presidente', 'relator', 'membro'])('"%s" é papel válido', (p) => {
    expect(ehPapelComissao(p)).toBe(true)
  })

  it.each(['admin', 'controle', 'Presidente', '', null, undefined, 1])('%j não é papel', (p) => {
    expect(ehPapelComissao(p)).toBe(false)
  })
})
