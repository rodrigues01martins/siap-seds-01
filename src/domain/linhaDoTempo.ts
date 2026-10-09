// Linha do tempo das experiências A e B (tela da D2): barras e trechos sobrepostos,
// em posição relativa (0 a 1) para desenhar em SVG. Em execução vai até a data limite
// (Anexo IV, 3.3.1, IV); a sobreposição é o que C2.2 conta uma vez só e C2.3 soma (3.8.3).

import type { CategoriaExperiencia } from './d2.js'
import { paraDia } from './intervalos.js'

export interface ExperienciaNaLinha {
  id: string
  categorias: CategoriaExperiencia[]
  inicio: string
  fim: string | null
}

export interface Barra {
  id: string
  inicio: string
  fim: string
  emExecucao: boolean
  x0: number
  x1: number
}

export interface Sobreposicao {
  inicio: string
  fim: string
  ids: [string, string]
  x0: number
  x1: number
}

export interface LinhaDoTempo {
  inicio: string | null
  fim: string | null
  barras: Barra[]
  sobreposicoes: Sobreposicao[]
}

const CATEGORIAS_LINHA: CategoriaExperiencia[] = ['A', 'B']

export function linhaDoTempo(experiencias: ExperienciaNaLinha[], dataLimite: string): LinhaDoTempo {
  const limite = paraDia(dataLimite)
  const periodos = experiencias
    .filter((e) => e.categorias.some((c) => CATEGORIAS_LINHA.includes(c)) && paraDia(e.inicio) <= limite)
    .map((e) => {
      const fim = e.fim === null || paraDia(e.fim) > limite ? dataLimite : e.fim
      return { id: e.id, inicio: e.inicio, fim, emExecucao: e.fim === null }
    })
    .sort((a, b) => a.inicio.localeCompare(b.inicio) || a.id.localeCompare(b.id))
  if (periodos.length === 0) return { inicio: null, fim: null, barras: [], sobreposicoes: [] }

  const inicio = periodos[0]!.inicio
  const fim = periodos.reduce((maior, p) => (p.fim > maior ? p.fim : maior), periodos[0]!.fim)
  const d0 = paraDia(inicio)
  const total = Math.max(paraDia(fim) - d0, 1)
  const x = (data: string) => (paraDia(data) - d0) / total

  const barras = periodos.map((p) => ({ ...p, x0: x(p.inicio), x1: x(p.fim) }))
  const sobreposicoes: Sobreposicao[] = []
  periodos.forEach((a, i) =>
    periodos.slice(i + 1).forEach((b) => {
      const ini = a.inicio > b.inicio ? a.inicio : b.inicio
      const fi = a.fim < b.fim ? a.fim : b.fim
      if (ini <= fi) sobreposicoes.push({ inicio: ini, fim: fi, ids: [a.id, b.id], x0: x(ini), x1: x(fi) })
    }),
  )
  return { inicio, fim, barras, sobreposicoes }
}
