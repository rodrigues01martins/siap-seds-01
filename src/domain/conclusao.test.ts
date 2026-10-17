import { describe, expect, it } from 'vitest'
import { problemasParaConcluir } from './conclusao'
import { MATRIZ_2026 } from './matriz'

const CODIGOS = MATRIZ_2026.dimensao1.planos.flatMap((p) => p.subcriterios.map((s) => s.codigo))
const completas = () => CODIGOS.map((codigo) => ({ codigo, nivel: 3, justificativa: 'Fundamentação da Comissão.' }))

describe('condições para concluir a proposta', () => {
  it('admitida, com os 28 níveis e as 28 justificativas: pode concluir', () => {
    expect(problemasParaConcluir({ admissibilidade: { situacao: 'admitida' }, avaliacoes: completas() })).toEqual([])
  })

  it('sem admissibilidade registrada', () => {
    expect(problemasParaConcluir({ admissibilidade: undefined, avaliacoes: completas() })).toEqual(['registre a admissibilidade'])
  })

  it('níveis faltando (inclusive nível inválido) e justificativas em branco', () => {
    const avaliacoes = completas().slice(2)
    avaliacoes[0] = { ...avaliacoes[0]!, justificativa: '   ' }
    avaliacoes[1] = { ...avaliacoes[1]!, nivel: Number.NaN }
    expect(problemasParaConcluir({ admissibilidade: { situacao: 'admitida' }, avaliacoes })).toEqual([
      'faltam 3 de 28 níveis da D1',
      'faltam 1 de 28 justificativas da D1',
    ])
  })

  it('subcritério fora da matriz não conta', () => {
    const avaliacoes = [...completas().slice(1), { codigo: '9.9', nivel: 3, justificativa: 'Fora da matriz.' }]
    expect(problemasParaConcluir({ admissibilidade: { situacao: 'admitida' }, avaliacoes })).toEqual(['faltam 1 de 28 níveis da D1'])
  })

  it.each(['nao_admitida', 'desclassificada'])('%s: basta a admissibilidade (não segue para a D1)', (situacao) => {
    expect(problemasParaConcluir({ admissibilidade: { situacao }, avaliacoes: [] })).toEqual([])
  })

  it('sem admissibilidade e sem níveis: os dois problemas', () => {
    expect(problemasParaConcluir({ admissibilidade: null, avaliacoes: [] })).toEqual(['registre a admissibilidade', 'faltam 28 de 28 níveis da D1'])
  })
})
