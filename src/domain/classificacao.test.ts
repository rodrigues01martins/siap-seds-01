import { describe, expect, it } from 'vitest'
import { classificar, classificarLote, type PropostaAvaliada } from './classificacao'
import { calcularD1, type NiveisD1, type ResultadoD1 } from './d1'
import { calcularD2, type ResultadoD2 } from './d2'
import { MATRIZ_2026 } from './matriz'

const CODIGOS = MATRIZ_2026.dimensao1.planos.flatMap((p) => p.subcriterios.map((s) => s.codigo))
const D2_ZERO: ResultadoD2 = calcularD2({ dataLimite: '2026-10-31', experiencias: [] })

function niveis(padrao: number, sobrescritas: NiveisD1 = {}): NiveisD1 {
  return { ...Object.fromEntries(CODIGOS.map((c) => [c, padrao])), ...sobrescritas }
}

function proposta(id: string, n: NiveisD1, d2: ResultadoD2 = D2_ZERO): PropostaAvaliada {
  return { id, d1: calcularD1(n), d2 }
}

/** D1 = 108 em 27 subcritérios, com 6.4 ainda sem nível → pendente. */
function pendenteComNotaAlta(id: string): PropostaAvaliada {
  const n = niveis(4)
  delete n['6.4']
  return proposta(id, n)
}

describe('classificar — status "pendente" nunca entra no ranking', () => {
  it('proposta pendente não recebe posição, mesmo com nota parcial maior que as aptas', () => {
    const pendente = pendenteComNotaAlta('osc-pendente')
    expect(pendente.d1.status).toBe('pendente')
    expect(pendente.d1.d1).toBe(108)

    const r = classificar([proposta('osc-apta', niveis(3)), pendente])

    expect(r.ranking.map((p) => p.id)).toEqual(['osc-apta'])
    expect(r.ranking[0]!.posicao).toBe(1)
    expect(r.pendentes).toEqual(['osc-pendente'])
  })

  it('a presença de pendentes não altera posições nem notas das aptas', () => {
    const aptas = [proposta('a', niveis(3)), proposta('b', niveis(4)), proposta('c', niveis(3, { '1.1': 4 }))]
    const sem = classificar(aptas)
    const com = classificar([pendenteComNotaAlta('p1'), ...aptas, pendenteComNotaAlta('p2')])
    expect(com.ranking).toEqual(sem.ranking)
  })

  it('com pendentes a classificação não é definitiva; sem pendentes é', () => {
    expect(classificar([proposta('a', niveis(3)), pendenteComNotaAlta('p')]).definitiva).toBe(false)
    expect(classificar([proposta('a', niveis(3))]).definitiva).toBe(true)
  })

  it('resultado incompleto rotulado como "apta" é tratado como pendente (defesa contra dado adulterado)', () => {
    const real = pendenteComNotaAlta('forjada')
    const forjado: ResultadoD1 = { ...real.d1, status: 'apta' }
    const r = classificar([{ ...real, d1: forjado }])
    expect(r.ranking).toEqual([])
    expect(r.pendentes).toEqual(['forjada'])
    expect(r.definitiva).toBe(false)
  })

  it('pendente já desclassificada (nível 0 em 1.1) fica entre as desclassificadas', () => {
    const r = classificar([proposta('x', { '1.1': 0 })])
    expect(r.desclassificadas).toEqual(['x'])
    expect(r.pendentes).toEqual([])
    expect(r.ranking).toEqual([])
  })
})

describe('classificar — ordem e exclusões', () => {
  it('ordena aptas por NF = D1 + D2 decrescente', () => {
    const d2Alta = calcularD2({
      dataLimite: '2026-10-31',
      experiencias: [{ id: 'e1', categorias: ['A', 'D'], inicio: '2018-01-01', fim: null }],
    })
    const r = classificar([proposta('a', niveis(3)), proposta('b', niveis(4)), proposta('c', niveis(3), d2Alta)])
    expect(r.ranking.map((p) => [p.posicao, p.id, p.nf])).toEqual([
      [1, 'b', 112],
      [2, 'c', 84 + d2Alta.total],
      [3, 'a', 84],
    ])
  })

  it('inaptas e desclassificadas ficam fora do ranking', () => {
    const r = classificar([
      proposta('apta', niveis(3)),
      proposta('inapta', niveis(2)),
      proposta('descl', niveis(4, { '1.2': 0 })),
    ])
    expect(r.ranking.map((p) => p.id)).toEqual(['apta'])
    expect(r.inaptas).toEqual(['inapta'])
    expect(r.desclassificadas).toEqual(['descl'])
  })

  it('empate em NF: mesma posição e sinalização; o sistema não desempata (a Comissão decide em outra instância)', () => {
    const r = classificar([
      proposta('a', niveis(3)),
      proposta('b', niveis(3)),
      proposta('c', niveis(4)),
      proposta('d', niveis(3, { '6.4': 2 })),
    ])
    expect(r.ranking.map((p) => [p.posicao, p.id, p.nf, p.empatada])).toEqual([
      [1, 'c', 112, false],
      [2, 'a', 84, true],
      [2, 'b', 84, true],
      [4, 'd', 83, false],
    ])
  })
})

// ---------------------------------------------------------------------------
// Etapa 6a — classificação do lote a partir dos totais gravados + decisão de desempate da Comissão
// ---------------------------------------------------------------------------

const totais = (nf: number, dados: Partial<{ status: string; completa: boolean; pendentes: string[] }> = {}) => ({
  d1: nf - 5,
  d2: 5,
  status: 'apta',
  completa: true,
  pendentes: [] as string[],
  ...dados,
})

describe('classificarLote — usa classificar() sobre os totais gravados', () => {
  it('aptas em ordem de NF; inaptas, desclassificadas, não admitidas e pendentes fora do ranking', () => {
    const r = classificarLote([
      { id: 'a', totais: totais(90) },
      { id: 'b', totais: totais(95) },
      { id: 'inapta', totais: totais(60, { status: 'inapta' }) },
      { id: 'descl', totais: totais(100, { status: 'desclassificada' }) },
      { id: 'semTotais' },
      { id: 'incompleta', totais: totais(99, { status: 'pendente', completa: false, pendentes: ['6.4'] }) },
      { id: 'naoAdmitida', admissao: 'nao_admitida' },
      { id: 'pa-ausente', admissao: 'desclassificada', totais: totais(97) },
    ])
    expect(r.ranking.map((p) => [p.posicao, p.id])).toEqual([
      [1, 'b'],
      [2, 'a'],
    ])
    expect(r.inaptas).toEqual(['inapta'])
    expect(r.desclassificadas.sort()).toEqual(['descl', 'pa-ausente'])
    expect(r.naoAdmitidas).toEqual(['naoAdmitida'])
    expect(r.pendentes.sort()).toEqual(['incompleta', 'semTotais'])
    expect(r.definitiva).toBe(false)
  })

  it('empate sem decisão: mesma posição, sinalizado e classificação não definitiva', () => {
    const r = classificarLote([
      { id: 'a', totais: totais(90) },
      { id: 'b', totais: totais(84) },
      { id: 'c', totais: totais(84) },
    ])
    expect(r.ranking.map((p) => [p.posicao, p.id, p.empatada])).toEqual([
      [1, 'a', false],
      [2, 'b', true],
      [2, 'c', true],
    ])
    expect(r.empates).toEqual([{ nf: 84, ids: ['b', 'c'], decidido: false }])
    expect(r.definitiva).toBe(false)
  })

  it('decisão da Comissão para o mesmo grupo e a mesma NF: ordem registrada, sem empate pendente', () => {
    const r = classificarLote(
      [
        { id: 'a', totais: totais(90) },
        { id: 'b', totais: totais(84) },
        { id: 'c', totais: totais(84) },
      ],
      [{ propostas: ['b', 'c'], nf: 84, ordem: ['c', 'b'] }],
    )
    expect(r.ranking.map((p) => [p.posicao, p.id, p.empatada, p.desempatadaPelaComissao])).toEqual([
      [1, 'a', false, false],
      [2, 'c', false, true],
      [3, 'b', false, true],
    ])
    expect(r.empates).toEqual([{ nf: 84, ids: ['b', 'c'], decidido: true }])
    expect(r.definitiva).toBe(true)
  })

  it('decisão que não corresponde mais ao grupo (outra proposta empatou ou a NF mudou) é ignorada', () => {
    const tres = [
      { id: 'b', totais: totais(84) },
      { id: 'c', totais: totais(84) },
      { id: 'd', totais: totais(84) },
    ]
    const r = classificarLote(tres, [{ propostas: ['b', 'c'], nf: 84, ordem: ['c', 'b'] }])
    expect(r.ranking.every((p) => p.empatada && p.posicao === 1)).toBe(true)
    expect(r.empates[0]!.decidido).toBe(false)

    const outraNF = classificarLote(tres.slice(0, 2), [{ propostas: ['b', 'c'], nf: 80, ordem: ['c', 'b'] }])
    expect(outraNF.empates[0]!.decidido).toBe(false)
  })
})
