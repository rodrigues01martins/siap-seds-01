import { describe, expect, it } from 'vitest'
import { replicacaoDisponivel } from './replicacao'

const LOTES = [
  { codigo: 'L1', descricao: 'Lote I' },
  { codigo: 'L2', descricao: 'Lote II' },
]
const ORIGEM = { id: 'p1', loteCodigo: 'L1', oscCnpj: 'osc' }
const DESTINO = { id: 'p2', loteCodigo: 'L2', oscCnpj: 'osc' }
const SESSAO = { lotes: ['L1', 'L2'] }
const base = { proposta: ORIGEM, propostas: [ORIGEM, DESTINO, { id: 'p3', loteCodigo: 'L2', oscCnpj: 'outra' }], lotes: LOTES, experiencias: 2, sessao: SESSAO }

describe('replicar para outro lote — quando o comando aparece', () => {
  it('destino = a proposta da mesma OSC no outro lote (nos dois sentidos)', () => {
    expect(replicacaoDisponivel(base)).toEqual({ destinos: [{ propostaId: 'p2', lote: 'L2', rotuloLote: 'L2 — Lote II' }], motivo: null })
    expect(replicacaoDisponivel({ ...base, proposta: DESTINO }).destinos).toEqual([{ propostaId: 'p1', lote: 'L1', rotuloLote: 'L1 — Lote I' }])
  })

  it('sem proposta da OSC no outro lote: nada a oferecer, com a explicação', () => {
    expect(replicacaoDisponivel({ ...base, propostas: [ORIGEM] })).toEqual({
      destinos: [],
      motivo: 'Não há proposta desta OSC em outro lote deste chamamento.',
    })
  })

  it.each([
    ['sem experiências na origem', { experiencias: 0 }, 'Cadastre experiências nesta proposta para replicá-las.'],
    ['sem sessão aberta', { sessao: null }, 'Nenhuma sessão aberta: a replicação grava no outro lote só em sessão aberta.'],
    ['lote de destino fora da pauta', { sessao: { lotes: ['L1'] } }, 'O lote de destino (L2) não está na pauta da sessão aberta.'],
    [
      'destino não admitido',
      { propostas: [ORIGEM, { ...DESTINO, admissibilidade: { situacao: 'nao_admitida' as const } }] },
      'A proposta da OSC no outro lote não foi admitida: não segue para avaliação.',
    ],
  ])('%s: comando indisponível, com o motivo', (_caso, ajuste, motivo) => {
    const r = replicacaoDisponivel({ ...base, ...ajuste })
    expect(r.motivo).toBe(motivo)
    expect(r.destinos).toHaveLength(1)
  })
})
