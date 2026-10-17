import { describe, expect, it } from 'vitest'
import { problemasParaConcluir } from './conclusao'
import { MATRIZ_2026 } from './matriz'

const CODIGOS = MATRIZ_2026.dimensao1.planos.flatMap((p) => p.subcriterios.map((s) => s.codigo))
const completas = (): { codigo: string; nivel: number | null; justificativa: string }[] =>
  CODIGOS.map((codigo) => ({ codigo, nivel: 3, justificativa: 'Fundamentação da Comissão.' }))

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
      'faltam 1 de 28 justificativas da D1 (mínimo de 20 caracteres)',
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

  it('justificativa abaixo do mínimo (do chamamento ou o padrão de 20) conta como faltando', () => {
    const avaliacoes = completas()
    avaliacoes[5] = { ...avaliacoes[5]!, justificativa: 'Curta demais.' }
    expect(problemasParaConcluir({ admissibilidade: { situacao: 'admitida' }, avaliacoes })).toEqual([
      'faltam 1 de 28 justificativas da D1 (mínimo de 20 caracteres)',
    ])
    expect(problemasParaConcluir({ admissibilidade: { situacao: 'admitida' }, avaliacoes: completas() }, { justificativaMinima: 40 })).toEqual([
      'faltam 28 de 28 justificativas da D1 (mínimo de 40 caracteres)',
    ])
  })

  it('justificativa de subcritério sem nível não conta em dobro (já falta o nível)', () => {
    const avaliacoes = completas()
    avaliacoes[0] = { ...avaliacoes[0]!, nivel: null, justificativa: '' }
    expect(problemasParaConcluir({ admissibilidade: { situacao: 'admitida' }, avaliacoes })).toEqual(['faltam 1 de 28 níveis da D1'])
  })

  it('admissibilidade incompleta (rascunho do salvamento automático): motivo da não admissão e páginas dos PAs', () => {
    const naoAdmitida = { situacao: 'nao_admitida', admitida: false, motivo: 'curto' }
    expect(problemasParaConcluir({ admissibilidade: naoAdmitida, avaliacoes: [] })).toEqual([
      'informe o motivo da não admissão (ao menos 10 caracteres)',
    ])
    const planos = MATRIZ_2026.dimensao1.planos.map((p, i) => ({
      codigo: p.codigo,
      paginaInicial: i === 1 ? null : 1,
      paginaFinal: i === 1 || i === 4 ? null : 2,
    }))
    expect(problemasParaConcluir({ admissibilidade: { situacao: 'admitida', admitida: true, planos }, avaliacoes: completas() })).toEqual([
      'informe as páginas de PA2, PA5 na admissibilidade',
    ])
  })
})
