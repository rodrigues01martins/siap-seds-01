import { describe, expect, it } from 'vitest'
import { calcularD1 } from './d1'
import { calcularD2, type Experiencia } from './d2'
import { MATRIZ_2026 } from './matriz'
import { consolidarProposta } from './proposta'

const CODIGOS = MATRIZ_2026.dimensao1.planos.flatMap((p) => p.subcriterios.map((s) => s.codigo))
const todos = (nivel: number) => Object.fromEntries(CODIGOS.map((c) => [c, nivel]))

const EXPERIENCIAS: Experiencia[] = [
  { id: 'e1', categorias: ['A', 'D'], internacao: true, inicio: '2019-01-01', fim: null, vagas: 90, unidades: 2 },
  { id: 'e2', categorias: ['C'], inicio: '2020-01-01', fim: '2021-12-31', execucaoSatisfatoria: true },
]

describe('consolidarProposta (C4)', () => {
  it('é exatamente calcularD1 + calcularD2, sem regra própria', () => {
    const entrada = { niveis: todos(3), experiencias: EXPERIENCIAS, dataLimite: '2026-10-31' }
    const { totais, resultadoD2 } = consolidarProposta(entrada)
    const d1 = calcularD1(entrada.niveis)
    const d2 = calcularD2({ experiencias: EXPERIENCIAS, dataLimite: '2026-10-31' })

    expect(resultadoD2).toEqual(JSON.parse(JSON.stringify(d2)))
    expect(totais).toEqual({
      totaisPorPA: d1.totaisPorPA,
      d1: d1.d1,
      d2: d2.total,
      nf: d1.d1 + d2.total,
      status: d1.status,
      completa: d1.completa,
      pendentes: d1.pendentes,
      motivos: d1.motivos,
    })
  })

  it('avaliação incompleta → status pendente', () => {
    const { totais } = consolidarProposta({ niveis: { '1.1': 3 }, experiencias: [], dataLimite: '2026-10-31' })
    expect(totais).toMatchObject({ status: 'pendente', completa: false, d1: 3, d2: 0, nf: 3 })
    expect(totais.pendentes).toHaveLength(27)
  })

  it('resultado sem valores undefined (pronto para o Firestore)', () => {
    const { totais, resultadoD2 } = consolidarProposta({ niveis: {}, experiencias: [], dataLimite: '2026-10-31' })
    const temIndefinido = (v: unknown): boolean =>
      v === undefined || (typeof v === 'object' && v !== null && Object.values(v).some(temIndefinido))
    expect(temIndefinido(totais)).toBe(false)
    expect(temIndefinido(resultadoD2)).toBe(false)
  })
})
