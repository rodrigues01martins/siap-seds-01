import { describe, expect, it } from 'vitest'
import { esquemaExcluirChamamento, esquemaExcluirExperiencia, esquemaPreviaExperiencia, previaDe, resumoDaContagem } from './exclusao'

describe('prévia da exclusão: contagem e texto', () => {
  it('ordem fixa, só o que tem quantidade, singular e plural', () => {
    expect(resumoDaContagem({ avaliacao: 28, proposta: 1, experiencia: 4, documento: 0 })).toBe('1 proposta, 28 avaliações, 4 experiências')
    expect(resumoDaContagem({ sessao: 2, desempate: 1, resultadoD2: 1, osc: 1, lote: 3 })).toBe(
      '3 lotes, 2 sessões, 1 OSC, 1 resultado da D2, 1 decisão de desempate',
    )
    expect(resumoDaContagem({ admissibilidade: 2, documento: 1, chamamento: 1, outro: 3 })).toBe(
      '1 chamamento, 2 admissibilidades, 1 documento, 3 outros registros',
    )
  })

  it('previaDe: itens na ordem, total e resumo', () => {
    const previa = previaDe({ experiencia: 1, documento: 2, avaliacao: 0 })
    expect(previa).toEqual({ itens: { experiencia: 1, documento: 2 }, total: 3, resumo: '1 experiência, 2 documentos' })
    expect(Object.keys(previa.itens)).toEqual(['experiencia', 'documento'])
  })
})

describe('esquemas da exclusão: sem justificativa e sem identificador digitado', () => {
  it('campos extras são recusados', () => {
    const r = esquemaExcluirChamamento.safeParse({ id: 'ch1', justificativa: 'Cadastro feito por engano.' })
    expect(r.success).toBe(false)
  })

  it('lote é opcional no chamamento; documento é índice inteiro ≥ 0 (vem como texto na prévia)', () => {
    expect(esquemaExcluirChamamento.parse({ id: 'ch1', lote: ' L1 ' })).toEqual({ id: 'ch1', lote: 'L1' })
    expect(esquemaExcluirExperiencia.parse({ chamamentoId: 'c', propostaId: 'p', id: 'e', documento: 1 })).toMatchObject({ documento: 1 })
    expect(esquemaPreviaExperiencia.parse({ chamamentoId: 'c', propostaId: 'p', id: 'e', documento: '2', simular: 'true' })).toMatchObject({ documento: 2 })
    expect(esquemaExcluirExperiencia.safeParse({ chamamentoId: 'c', propostaId: 'p', id: 'e', documento: -1 }).success).toBe(false)
  })
})
