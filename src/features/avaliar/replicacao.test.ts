import { describe, expect, it } from 'vitest'
import { replicacaoDisponivel } from './replicacao'

const LOTES = [
  { codigo: 'L1', descricao: 'Lote I' },
  { codigo: 'L2', descricao: 'Lote II' },
]
const LOTE1 = { id: 'p1', loteCodigo: 'L1', oscCnpj: 'osc' }
const LOTE2 = { id: 'p2', loteCodigo: 'L2', oscCnpj: 'osc' }
const PROPOSTAS = [LOTE1, LOTE2, { id: 'p3', loteCodigo: 'L2', oscCnpj: 'outra' }]

/** Cenário real: Lote I avaliado em sessão já encerrada; a sessão aberta tem só o Lote II em pauta. */
const naPropostaDoLote2 = { proposta: LOTE2, propostas: PROPOSTAS, lotes: LOTES, experiencias: 0, sessao: { lotes: ['L2'] } }

describe('replicar entre lotes — comandos da aba D2', () => {
  it('proposta nova do Lote II, sem experiências: "Trazer do outro lote" disponível; "Replicar para outro lote" não aparece', () => {
    expect(replicacaoDisponivel(naPropostaDoLote2)).toEqual({
      outras: [{ propostaId: 'p1', lote: 'L1', rotuloLote: 'L1 — Lote I' }],
      aviso: null,
      enviar: null,
      trazer: { motivo: null },
    })
  })

  it('proposta com experiências e o outro lote em pauta: os dois sentidos disponíveis', () => {
    const r = replicacaoDisponivel({ ...naPropostaDoLote2, proposta: LOTE1, experiencias: 2, sessao: { lotes: ['L1', 'L2'] } })
    expect(r.outras).toEqual([{ propostaId: 'p2', lote: 'L2', rotuloLote: 'L2 — Lote II' }])
    expect(r.enviar).toEqual({ motivo: null })
    expect(r.trazer).toEqual({ motivo: null })
  })

  it('sem proposta da OSC em outro lote: só a explicação, sem comandos', () => {
    expect(replicacaoDisponivel({ ...naPropostaDoLote2, propostas: [LOTE2] })).toEqual({
      outras: [],
      aviso: 'Não há proposta desta OSC em outro lote deste chamamento.',
      enviar: null,
      trazer: null,
    })
  })

  it.each([
    ['sem sessão aberta', { sessao: null }, 'Nenhuma sessão aberta: a cópia entre lotes grava só em sessão aberta.'],
    ['esta proposta fora da pauta', { sessao: { lotes: ['L1'] } }, 'Esta proposta não está na pauta da sessão aberta.'],
    ['esta proposta não admitida', { proposta: { ...LOTE2, admissibilidade: { situacao: 'nao_admitida' as const } } }, 'Esta proposta não foi admitida: não segue para avaliação.'],
  ])('trazer indisponível — %s', (_caso, ajuste, motivo) => {
    expect(replicacaoDisponivel({ ...naPropostaDoLote2, ...ajuste }).trazer).toEqual({ motivo })
  })

  it.each([
    ['sem sessão aberta', { sessao: null }, 'Nenhuma sessão aberta: a cópia entre lotes grava só em sessão aberta.'],
    ['lote de destino fora da pauta', { sessao: { lotes: ['L1'] } }, 'O lote de destino (L2) não está na pauta da sessão aberta.'],
    [
      'destino não admitido',
      { propostas: [LOTE1, { ...LOTE2, admissibilidade: { situacao: 'nao_admitida' as const } }] },
      'A proposta da OSC no outro lote não foi admitida: não segue para avaliação.',
    ],
  ])('replicar indisponível — %s', (_caso, ajuste, motivo) => {
    const r = replicacaoDisponivel({ ...naPropostaDoLote2, proposta: LOTE1, experiencias: 2, sessao: { lotes: ['L1', 'L2'] }, ...ajuste })
    expect(r.enviar).toEqual({ motivo })
  })
})
