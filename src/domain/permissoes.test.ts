import { describe, expect, it } from 'vitest'
import { PERMISSOES, podeFazer } from './permissoes'

describe('matriz de permissões (espelho da seção do CLAUDE.md)', () => {
  it('corresponde exatamente à matriz aprovada', () => {
    expect(PERMISSOES).toEqual({
      cadastros: ['admin'],
      nivelD1: ['presidente', 'relator', 'membro'],
      experienciasD2: ['presidente', 'relator'],
      homologar: ['presidente'],
      perfis: ['admin'],
      sessaoAbrirEncerrar: ['presidente'],
      sessaoConduzir: ['presidente', 'relator'],
      admissibilidade: ['presidente', 'relator'],
      lerAuditoria: ['admin', 'presidente', 'controle'],
    })
  })

  it('podeFazer consulta a matriz', () => {
    expect(podeFazer('admin', 'cadastros')).toBe(true)
    expect(podeFazer('presidente', 'cadastros')).toBe(false)
    expect(podeFazer('membro', 'nivelD1')).toBe(true)
    expect(podeFazer('controle', 'nivelD1')).toBe(false)
    expect(podeFazer(null, 'lerAuditoria')).toBe(false)
  })
})
