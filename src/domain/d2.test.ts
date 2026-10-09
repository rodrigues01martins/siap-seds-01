import { describe, expect, it } from 'vitest'
import {
  calcularC21,
  calcularC22,
  calcularC23,
  calcularC24,
  calcularD2,
  problemasDaExperiencia,
  type Experiencia,
} from './d2'

const DATA_LIMITE = '2026-10-31'

let seq = 0
/** Experiência mínima válida; cada teste ajusta só o que importa. */
function exp(dados: Partial<Experiencia> = {}): Experiencia {
  seq += 1
  return {
    id: `e${seq}`,
    categorias: ['A'],
    inicio: '2020-01-01',
    fim: '2020-12-31',
    ...dados,
  }
}

/** Unidade de internação (categoria A) com capacidade informada. */
const internacao = (dados: Partial<Experiencia>) =>
  exp({ categorias: ['A'], internacao: true, unidades: 1, ...dados })

describe('C2.1 — Diversidade e aderência', () => {
  it('sem experiências → 0', () => {
    expect(calcularC21([]).pontos).toBe(0)
  })

  it('pontuação cumulativa entre categorias: A + B + C + D = 8', () => {
    const r = calcularC21([
      exp({ categorias: ['A', 'D'] }),
      exp({ categorias: ['B'] }),
      exp({ categorias: ['C'] }),
    ])
    expect(r.pontos).toBe(8)
  })

  it('várias experiências da mesma categoria não aumentam a pontuação', () => {
    const r = calcularC21([exp({ categorias: ['A'] }), exp({ categorias: ['A'] }), exp({ categorias: ['A'] })])
    expect(r.pontos).toBe(4)
  })

  it('D pode ser comprovada pelo mesmo instrumento usado em A ou B', () => {
    expect(calcularC21([exp({ categorias: ['B', 'D'] })]).pontos).toBe(3)
  })

  it('a mesma experiência não pode ser enquadrada em A e B', () => {
    expect(() => calcularC21([exp({ id: 'x', categorias: ['A', 'B'] })])).toThrow(/x.*A.*B/)
  })

  it('memória registra quais experiências comprovaram cada categoria', () => {
    const r = calcularC21([exp({ id: 'termo-1', categorias: ['C'] })])
    expect(r.memoria.join('\n')).toMatch(/C.*termo-1/)
  })
})

describe('C2.2 — Tempo de experiência (apenas A e B)', () => {
  it('fronteira 11/12 meses: 11 → 0 pt; 12 → 1 pt', () => {
    expect(calcularC22([exp({ inicio: '2020-01-01', fim: '2020-11-30' })], DATA_LIMITE)).toMatchObject({
      valorApurado: 11,
      pontos: 0,
    })
    expect(calcularC22([exp({ inicio: '2020-01-01', fim: '2020-12-31' })], DATA_LIMITE)).toMatchObject({
      valorApurado: 12,
      pontos: 1,
    })
  })

  it('fronteira 47/48 meses: 47 → 3 pt; 48 → 4 pt', () => {
    expect(calcularC22([exp({ inicio: '2020-01-01', fim: '2023-11-30' })], DATA_LIMITE)).toMatchObject({
      valorApurado: 47,
      pontos: 3,
    })
    expect(calcularC22([exp({ inicio: '2020-01-01', fim: '2023-12-31' })], DATA_LIMITE)).toMatchObject({
      valorApurado: 48,
      pontos: 4,
    })
  })

  it('períodos sucessivos de experiências distintas SOMAM (6 + 6 = 12 meses)', () => {
    const r = calcularC22(
      [
        exp({ categorias: ['A'], inicio: '2019-01-01', fim: '2019-06-30' }),
        exp({ categorias: ['B'], inicio: '2021-01-01', fim: '2021-06-30' }),
      ],
      DATA_LIMITE,
    )
    expect(r.valorApurado).toBe(12)
    expect(r.pontos).toBe(1)
  })

  it('períodos concomitantes contam UMA vez (12 + 12 sobrepostos 6 meses = 18, não 24)', () => {
    const r = calcularC22(
      [
        exp({ inicio: '2020-01-01', fim: '2020-12-31' }),
        exp({ inicio: '2020-07-01', fim: '2021-06-30' }),
      ],
      DATA_LIMITE,
    )
    expect(r.valorApurado).toBe(18)
    expect(r.pontos).toBe(1)
  })

  it('experiências contíguas formam um período contínuo para contagem de meses completos', () => {
    // Separadas seriam 5 + 6 = 11 meses; contínuas são 12.
    const r = calcularC22(
      [
        exp({ inicio: '2020-01-15', fim: '2020-06-30' }),
        exp({ inicio: '2020-07-01', fim: '2021-01-14' }),
      ],
      DATA_LIMITE,
    )
    expect(r.valorApurado).toBe(12)
  })

  it('desconsidera categorias C e D', () => {
    const r = calcularC22(
      [exp({ categorias: ['C'], inicio: '2010-01-01', fim: '2020-12-31' }), exp({ categorias: ['D'] })],
      DATA_LIMITE,
    )
    expect(r.valorApurado).toBe(0)
    expect(r.pontos).toBe(0)
  })

  it('experiência em execução (fim nulo) conta até a data limite', () => {
    const r = calcularC22([exp({ inicio: '2022-11-01', fim: null })], '2026-10-31')
    expect(r.valorApurado).toBe(48)
    expect(r.pontos).toBe(4)
  })

  it('período posterior à data limite é cortado', () => {
    const r = calcularC22([exp({ inicio: '2026-01-01', fim: '2027-12-31' })], '2026-10-31')
    expect(r.valorApurado).toBe(10)
  })
})

describe('C2.3 — 2.3.1 A: capacidade simultânea em internação', () => {
  const pontosA = (exps: Experiencia[]) => calcularC23(exps).subcriterios['2.3.1'].A

  it.each([
    [50, 0.25],
    [51, 0.5],
    [80, 0.5],
    [81, 0.75],
    [120, 0.75],
    [121, 1],
  ])('%i vagas → %f', (vagas, pontos) => {
    expect(pontosA([internacao({ vagas })]).pontos).toBe(pontos)
  })

  it('sem experiência em internação → 0', () => {
    expect(pontosA([]).pontos).toBe(0)
  })

  it('unidades SUCESSIVAS não somam vagas (40 + 40 em anos distintos = 40)', () => {
    const r = pontosA([
      internacao({ vagas: 40, inicio: '2018-01-01', fim: '2019-12-31' }),
      internacao({ vagas: 40, inicio: '2020-01-01', fim: '2021-12-31' }),
    ])
    expect(r.valorApurado).toBe(40)
    expect(r.pontos).toBe(0.25)
  })

  it('unidades CONCOMITANTES somam vagas (40 + 40 sobrepostas = 80)', () => {
    const r = pontosA([
      internacao({ vagas: 40, inicio: '2018-01-01', fim: '2020-06-30' }),
      internacao({ vagas: 40, inicio: '2020-01-01', fim: '2021-12-31' }),
    ])
    expect(r.valorApurado).toBe(80)
    expect(r.pontos).toBe(0.5)
  })

  it('só considera internação: semiliberdade (A sem internação) e B ficam de fora', () => {
    const r = pontosA([
      exp({ categorias: ['A'], internacao: false, vagas: 200 }),
      exp({ categorias: ['B'], internacao: true, vagas: 200 }),
    ])
    expect(r.valorApurado).toBe(0)
    expect(r.pontos).toBe(0)
  })

  it('experiência sem vagas comprovadas é desconsiderada e registrada na memória', () => {
    const r = pontosA([internacao({ id: 'sem-vagas', vagas: null })])
    expect(r.pontos).toBe(0)
    expect(r.memoria.join('\n')).toMatch(/sem-vagas/)
  })
})

describe('C2.3 — 2.3.1 B: unidades de internação simultâneas', () => {
  const pontosB = (exps: Experiencia[]) => calcularC23(exps).subcriterios['2.3.1'].B

  it('1 unidade → 0; 2 → 0,5; 3 → 0,75; 4 → 1', () => {
    const concomitantes = (n: number) =>
      Array.from({ length: n }, () => internacao({ vagas: 10, inicio: '2020-01-01', fim: '2020-12-31' }))
    expect(pontosB(concomitantes(1)).pontos).toBe(0)
    expect(pontosB(concomitantes(2)).pontos).toBe(0.5)
    expect(pontosB(concomitantes(3)).pontos).toBe(0.75)
    expect(pontosB(concomitantes(4)).pontos).toBe(1)
  })

  it('3 unidades SUCESSIVAS contam como 1 unidade simultânea → 0', () => {
    const r = pontosB([
      internacao({ inicio: '2016-01-01', fim: '2017-12-31' }),
      internacao({ inicio: '2018-01-01', fim: '2019-12-31' }),
      internacao({ inicio: '2020-01-01', fim: '2021-12-31' }),
    ])
    expect(r.valorApurado).toBe(1)
    expect(r.pontos).toBe(0)
  })

  it('um instrumento pode abranger várias unidades', () => {
    expect(pontosB([internacao({ unidades: 3 })]).pontos).toBe(0.75)
  })

  it('2.3.1 = A + B, limitado a 2', () => {
    const r = calcularC23([internacao({ vagas: 200, unidades: 5 })]).subcriterios['2.3.1']
    expect(r.pontos).toBe(2)
  })
})

describe('C2.3 — 2.3.2: força de trabalho simultânea (A e B)', () => {
  const pontos232 = (exps: Experiencia[]) => calcularC23(exps).subcriterios['2.3.2']

  it.each([
    [20, 0.25],
    [21, 0.5],
    [60, 0.5],
    [61, 0.75],
    [90, 0.75],
    [91, 1],
  ])('%i trabalhadores → %f', (trabalhadores, pontos) => {
    expect(pontos232([exp({ trabalhadores })]).pontos).toBe(pontos)
  })

  it('equipes de períodos sucessivos NÃO somam (50 e 50 → 50)', () => {
    const r = pontos232([
      exp({ categorias: ['A'], trabalhadores: 50, inicio: '2018-01-01', fim: '2018-12-31' }),
      exp({ categorias: ['B'], trabalhadores: 50, inicio: '2019-01-01', fim: '2019-12-31' }),
    ])
    expect(r.valorApurado).toBe(50)
    expect(r.pontos).toBe(0.5)
  })

  it('equipes concomitantes de A e B somam (50 + 50 → 100)', () => {
    const r = pontos232([
      exp({ categorias: ['A'], trabalhadores: 50, inicio: '2018-01-01', fim: '2019-06-30' }),
      exp({ categorias: ['B'], trabalhadores: 50, inicio: '2019-01-01', fim: '2019-12-31' }),
    ])
    expect(r.valorApurado).toBe(100)
    expect(r.pontos).toBe(1)
  })

  it('categoria C não entra', () => {
    expect(pontos232([exp({ categorias: ['C'], trabalhadores: 500 })]).pontos).toBe(0)
  })
})

describe('C2.3 — 2.3.3: escala financeira anual (A e B), em centavos', () => {
  const pontos233 = (exps: Experiencia[]) => calcularC23(exps).subcriterios['2.3.3']
  const R$ = (reais: number) => Math.round(reais * 100)

  it('R$ 5.000.000,00 exatos → 0,25 (faixa "até")', () => {
    expect(pontos233([exp({ valorAnualCentavos: R$(5_000_000) })]).pontos).toBe(0.25)
  })

  it('R$ 5.000.000,01 → 0,50 (faixa "acima de")', () => {
    expect(pontos233([exp({ valorAnualCentavos: R$(5_000_000.01) })]).pontos).toBe(0.5)
  })

  it.each([
    [10_000_000, 0.5],
    [10_000_000.01, 0.75],
    [20_000_000, 0.75],
    [20_000_000.01, 1],
  ])('R$ %f → %f', (reais, pontos) => {
    expect(pontos233([exp({ valorAnualCentavos: R$(reais) })]).pontos).toBe(pontos)
  })

  it('valores de períodos sucessivos NÃO somam (4 mi + 4 mi em anos distintos → 0,25)', () => {
    const r = pontos233([
      exp({ valorAnualCentavos: R$(4_000_000), inicio: '2019-01-01', fim: '2019-12-31' }),
      exp({ valorAnualCentavos: R$(4_000_000), inicio: '2020-01-01', fim: '2020-12-31' }),
    ])
    expect(r.valorApurado).toBe(R$(4_000_000))
    expect(r.pontos).toBe(0.25)
  })

  it('valores concomitantes somam (4 mi + 4 mi sobrepostos → 8 mi → 0,50)', () => {
    const r = pontos233([
      exp({ valorAnualCentavos: R$(4_000_000), inicio: '2019-01-01', fim: '2020-06-30' }),
      exp({ valorAnualCentavos: R$(4_000_000), inicio: '2020-01-01', fim: '2020-12-31' }),
    ])
    expect(r.valorApurado).toBe(R$(8_000_000))
    expect(r.pontos).toBe(0.5)
  })

  it('soma concomitante que fecha exatamente em R$ 5.000.000,00 continua 0,25', () => {
    const r = pontos233([
      exp({ valorAnualCentavos: R$(2_500_000.1), inicio: '2020-01-01', fim: '2020-12-31' }),
      exp({ valorAnualCentavos: R$(2_499_999.9), inicio: '2020-01-01', fim: '2020-12-31' }),
    ])
    expect(r.valorApurado).toBe(R$(5_000_000))
    expect(r.pontos).toBe(0.25)
  })

  it('rejeita valor que não seja inteiro em centavos', () => {
    expect(() => pontos233([exp({ id: 'quebrado', valorAnualCentavos: 10.5 })])).toThrow(/quebrado/)
  })
})

describe('C2.3 — corte na data-limite (decisão de sistema; analogia ao Anexo IV, 3.3.1, IV)', () => {
  const LIMITE = '2026-10-31'
  const emExecucao = () => internacao({ id: 'em-execucao', vagas: 60, trabalhadores: 50, inicio: '2020-01-01', fim: null })

  it('experiência iniciada após a data-limite não soma com a que está em execução', () => {
    const r = calcularC23(
      [emExecucao(), internacao({ id: 'posterior', vagas: 60, trabalhadores: 50, inicio: '2026-11-01', fim: '2027-12-31' })],
      LIMITE,
    )
    const a = r.subcriterios['2.3.1'].A
    expect(a.valorApurado).toBe(60) // sem o corte seriam 120 vagas (0,75)
    expect(a.pontos).toBe(0.5)
    expect(r.subcriterios['2.3.1'].B.valorApurado).toBe(1) // sem o corte seriam 2 unidades
    expect(r.subcriterios['2.3.2'].valorApurado).toBe(50) // sem o corte seriam 100 trabalhadores
    expect(a.memoria.join('\n')).toMatch(/posterior: desconsiderada — início posterior à data limite/)
  })

  it('experiência em execução vai só até a data-limite', () => {
    const a = calcularC23([emExecucao()], LIMITE).subcriterios['2.3.1'].A
    expect(a.memoria.join('\n')).toMatch(/em-execucao: 60 vagas de 2020-01-01 a 2026-10-31/)
  })

  it('fim posterior à data-limite é cortado: sobreposição só depois dela não soma', () => {
    const r = calcularC23(
      [
        internacao({ id: 'vigente', vagas: 60, inicio: '2025-01-01', fim: '2027-06-30' }),
        internacao({ id: 'futura', vagas: 60, inicio: '2026-11-01', fim: '2027-06-30' }),
      ],
      LIMITE,
    )
    expect(r.subcriterios['2.3.1'].A.valorApurado).toBe(60)
  })

  it('experiência iniciada exatamente na data-limite ainda soma (limite inclusivo)', () => {
    const r = calcularC23([emExecucao(), internacao({ id: 'no-limite', vagas: 60, inicio: LIMITE, fim: null })], LIMITE)
    expect(r.subcriterios['2.3.1'].A.valorApurado).toBe(120)
  })

  it('calcularD2 aplica a mesma data-limite ao C2.3', () => {
    const r = calcularD2({
      dataLimite: LIMITE,
      experiencias: [emExecucao(), internacao({ id: 'posterior', vagas: 60, inicio: '2026-11-01', fim: null })],
    })
    expect(r.criterios['C2.3'].subcriterios['2.3.1'].A.valorApurado).toBe(60)
  })

  it('experiência em execução sem data-limite informada é rejeitada', () => {
    expect(() => calcularC23([emExecucao()])).toThrow(/em-execucao.*data limite/)
  })
})

describe('C2.3 — consolidação', () => {
  it('C2.3 = 2.3.1 + 2.3.2 + 2.3.3, limitado a 4', () => {
    const r = calcularC23([
      internacao({ vagas: 200, unidades: 4, trabalhadores: 300, valorAnualCentavos: 3_000_000_000 }),
    ])
    expect(r.subcriterios['2.3.1'].pontos).toBe(2)
    expect(r.subcriterios['2.3.2'].pontos).toBe(1)
    expect(r.subcriterios['2.3.3'].pontos).toBe(1)
    expect(r.pontos).toBe(4)
    expect(r.maximo).toBe(4)
  })
})

describe('C2.4 — Histórico de execução satisfatória (A, B ou C)', () => {
  it('conta experiências distintas com execução satisfatória comprovada', () => {
    const r = calcularC24([
      exp({ categorias: ['A'], execucaoSatisfatoria: true }),
      exp({ categorias: ['B'], execucaoSatisfatoria: true }),
      exp({ categorias: ['C'], execucaoSatisfatoria: false }),
    ])
    expect(r.valorApurado).toBe(2)
    expect(r.pontos).toBe(2)
  })

  it('4 ou mais → 4 (limite)', () => {
    const r = calcularC24(
      Array.from({ length: 6 }, () => exp({ categorias: ['C'], execucaoSatisfatoria: true })),
    )
    expect(r.valorApurado).toBe(6)
    expect(r.pontos).toBe(4)
  })

  it('categoria D isolada não conta', () => {
    expect(calcularC24([exp({ categorias: ['D'], execucaoSatisfatoria: true })]).pontos).toBe(0)
  })
})

describe('calcularD2 — consolidação e validação', () => {
  it('D2 = C2.1 + C2.2 + C2.3 + C2.4', () => {
    const r = calcularD2({
      dataLimite: DATA_LIMITE,
      experiencias: [
        internacao({
          categorias: ['A', 'D'],
          inicio: '2019-01-01',
          fim: null,
          vagas: 90,
          unidades: 2,
          trabalhadores: 70,
          valorAnualCentavos: 1_200_000_000,
          execucaoSatisfatoria: true,
        }),
        exp({ categorias: ['C'], execucaoSatisfatoria: true }),
      ],
    })
    expect(r.criterios['C2.1'].pontos).toBe(4 + 1 + 1) // A + C + D
    expect(r.criterios['C2.2'].pontos).toBe(4) // > 48 meses
    expect(r.criterios['C2.3'].pontos).toBe(0.75 + 0.5 + 0.75 + 0.75)
    expect(r.criterios['C2.4'].pontos).toBe(2)
    expect(r.total).toBe(6 + 4 + 2.75 + 2)
    expect(r.maximo).toBe(20)
  })

  it('cada critério devolve memória de cálculo não vazia', () => {
    const r = calcularD2({ dataLimite: DATA_LIMITE, experiencias: [] })
    for (const c of Object.values(r.criterios)) expect(c.memoria.length).toBeGreaterThan(0)
    expect(r.total).toBe(0)
  })

  it('rejeita ids duplicados (mesma experiência contada duas vezes)', () => {
    expect(() =>
      calcularD2({ dataLimite: DATA_LIMITE, experiencias: [exp({ id: 'dup' }), exp({ id: 'dup' })] }),
    ).toThrow(/dup/)
  })

  it('rejeita quantitativos negativos', () => {
    expect(() =>
      calcularD2({ dataLimite: DATA_LIMITE, experiencias: [exp({ id: 'neg', vagas: -1 })] }),
    ).toThrow(/neg/)
  })

  it('rejeita experiência com início posterior ao fim', () => {
    expect(() =>
      calcularD2({
        dataLimite: DATA_LIMITE,
        experiencias: [exp({ id: 'inv', inicio: '2021-01-01', fim: '2020-01-01' })],
      }),
    ).toThrow(/inv/)
  })
})

describe('problemasDaExperiencia — as mesmas regras do cálculo, por campo (para a /api)', () => {
  it('experiência válida → sem problemas', () => {
    expect(problemasDaExperiencia(exp({ categorias: ['A', 'D'], vagas: 10 }))).toEqual({})
  })

  it('A e B na mesma experiência (Anexo IV, 3.2.1, III)', () => {
    expect(problemasDaExperiencia(exp({ categorias: ['A', 'B'] }))).toEqual({
      categorias: 'Não pode ser enquadrada simultaneamente nas categorias A e B (Anexo IV, 3.2.1, III).',
    })
  })

  it('categoria desconhecida', () => {
    expect(problemasDaExperiencia(exp({ categorias: ['E' as never] }))).toEqual({ categorias: 'Categoria desconhecida: E.' })
  })

  it('fim anterior ao início; datas inexistentes', () => {
    expect(problemasDaExperiencia(exp({ inicio: '2021-01-01', fim: '2020-12-31' }))).toEqual({
      fim: 'O fim não pode ser anterior ao início.',
    })
    expect(problemasDaExperiencia(exp({ inicio: '2021-02-30' }))).toHaveProperty('inicio')
    expect(problemasDaExperiencia(exp({ fim: '2021-13-01' }))).toHaveProperty('fim')
  })

  it('fim igual ao início é aceito; em execução (fim nulo) também', () => {
    expect(problemasDaExperiencia(exp({ inicio: '2021-01-01', fim: '2021-01-01' }))).toEqual({})
    expect(problemasDaExperiencia(exp({ fim: null }))).toEqual({})
  })

  it('campos de porte precisam ser inteiros não negativos', () => {
    expect(problemasDaExperiencia(exp({ vagas: -1, trabalhadores: 2.5, valorAnualCentavos: 100 }))).toEqual({
      vagas: 'Deve ser um número inteiro não negativo.',
      trabalhadores: 'Deve ser um número inteiro não negativo.',
    })
  })
})
