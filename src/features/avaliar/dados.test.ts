import { describe, expect, it } from 'vitest'
import { motivoSemAvaliacao, motivoSemSessao, type DadosProposta } from './dados'

const dados = (sessaoAberta: DadosProposta['sessaoAberta']): DadosProposta => ({
  chamamento: { id: 'ch1', numero: '001/2026', titulo: 'C', lotes: [] },
  proposta: { id: 'p1', loteCodigo: 'L1', oscCnpj: '1' },
  osc: null,
  sessaoAberta,
})
const sessao = (lotes: string[]) => ({ id: 's1', data: '2026-11-10', status: 'aberta' as const, lotes, presentes: [], foco: null })

describe('motivoSemSessao: a Comissão só registra em sessão aberta, com o lote da proposta na pauta', () => {
  it('sem sessão aberta', () => {
    expect(motivoSemSessao(dados(null), 'a admissibilidade')).toBe('Nenhuma sessão aberta: o presidente precisa abrir a sessão para registrar a admissibilidade.')
  })
  it('proposta de lote fora da pauta', () => {
    expect(motivoSemSessao(dados(sessao(['L2'])), 'experiências')).toBe('Proposta fora da pauta da sessão aberta.')
  })
  it('lote da proposta na pauta da sessão aberta: pode registrar', () => {
    expect(motivoSemSessao(dados(sessao(['L1'])), 'níveis')).toBeNull()
  })
  it('D1 e D2: proposta não admitida não segue para avaliação, mesmo com sessão', () => {
    const naoAdmitida = { ...dados(sessao(['L1'])), proposta: { id: 'p1', loteCodigo: 'L1', oscCnpj: '1', admissibilidade: { situacao: 'nao_admitida' as const } } }
    expect(motivoSemAvaliacao(naoAdmitida, 'níveis')).toBe('Proposta não admitida (Anexo III, item 28): não segue para avaliação.')
    expect(motivoSemAvaliacao(dados(sessao(['L1'])), 'níveis')).toBeNull()
  })
})
