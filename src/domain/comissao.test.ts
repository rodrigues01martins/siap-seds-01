import { describe, expect, it } from 'vitest'
import { PAPEIS_SESSAO, ROTULO_PAPEL, ehPapelSessao } from './comissao'

describe('papel de quem está presente na sessão (só o nome e o papel; não é login)', () => {
  it('são presidente e membro, nessa ordem', () => {
    expect([...PAPEIS_SESSAO]).toEqual(['presidente', 'membro'])
    expect(ROTULO_PAPEL).toEqual({ presidente: 'Presidente', membro: 'Membro' })
  })

  it.each(['presidente', 'membro'])('"%s" é papel válido', (p) => {
    expect(ehPapelSessao(p)).toBe(true)
  })

  it.each(['relator', 'admin', 'controle', 'Presidente', '', null, undefined, 1])('%j não é papel', (p) => {
    expect(ehPapelSessao(p)).toBe(false)
  })
})
