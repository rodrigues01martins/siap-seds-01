// Dimensão 1 — Capacidade Técnica e Operacional (PS = NA; D1 = PA1 + … + PA6).

import { formatarNumero } from './formatacao.js'
import { MATRIZ_2026, type Matriz } from './matriz/index.js'

/** Nível atribuído por código de subcritério; ausente ou nulo = ainda não avaliado. */
export type NiveisD1 = Record<string, number | null | undefined>

export type StatusD1 = 'apta' | 'inapta' | 'desclassificada' | 'pendente'

export interface TotalPA {
  codigo: string
  titulo: string
  pontos: number
  maximo: number
  avaliados: number
  quantidade: number
}

export interface ResultadoD1 {
  totaisPorPA: TotalPA[]
  d1: number
  maximo: number
  corte: number
  completa: boolean
  pendentes: string[]
  status: StatusD1
  motivos: string[]
}

export function calcularD1(niveis: NiveisD1, matriz: Matriz = MATRIZ_2026): ResultadoD1 {
  const { planos, escala, corte, subcriteriosEliminatorios, maximo } = matriz.dimensao1
  const nivelMinimo = escala[0]!.nivel
  const nivelMaximo = escala.at(-1)!.nivel
  const codigos = new Set(planos.flatMap((p) => p.subcriterios.map((s) => s.codigo)))

  for (const [codigo, nivel] of Object.entries(niveis)) {
    if (!codigos.has(codigo)) throw new Error(`Subcritério inexistente na matriz: ${codigo}`)
    if (nivel == null) continue
    if (!Number.isInteger(nivel) || nivel < nivelMinimo || nivel > nivelMaximo) {
      throw new RangeError(
        `Subcritério ${codigo}: nível ${nivel} inválido (inteiro de ${nivelMinimo} a ${nivelMaximo})`,
      )
    }
  }

  const pendentes: string[] = []
  const totaisPorPA = planos.map((plano): TotalPA => {
    let pontos = 0
    let avaliados = 0
    for (const s of plano.subcriterios) {
      const nivel = niveis[s.codigo]
      if (nivel == null) {
        pendentes.push(s.codigo)
        continue
      }
      pontos += nivel
      avaliados += 1
    }
    return {
      codigo: plano.codigo,
      titulo: plano.titulo,
      pontos,
      maximo: plano.maximo,
      avaliados,
      quantidade: plano.subcriterios.length,
    }
  })

  const d1 = totaisPorPA.reduce((t, pa) => t + pa.pontos, 0)
  const completa = pendentes.length === 0
  const zerados = subcriteriosEliminatorios.filter((c) => niveis[c] === 0)

  const motivos: string[] = []
  let status: StatusD1
  if (zerados.length > 0) {
    status = 'desclassificada'
    motivos.push(`Nível 0 em subcritério eliminatório: ${zerados.join(', ')}`)
  } else if (!completa) {
    status = 'pendente'
    motivos.push(`Subcritérios sem nível atribuído: ${pendentes.join(', ')}`)
  } else if (d1 < corte) {
    status = 'inapta'
    motivos.push(`D1 = ${formatarNumero(d1)} inferior ao corte de ${formatarNumero(corte)} pontos`)
  } else {
    status = 'apta'
    motivos.push(`D1 = ${formatarNumero(d1)} igual ou superior ao corte de ${formatarNumero(corte)} pontos`)
  }

  return { totaisPorPA, d1, maximo, corte, completa, pendentes, status, motivos }
}
