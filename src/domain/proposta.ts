// Consolidação da proposta (C4): D1 + D2 + NF + status, só com as funções de src/domain.

import { calcularD1, type NiveisD1, type StatusD1, type TotalPA } from './d1'
import { calcularD2, type Experiencia, type ResultadoD2 } from './d2'
import { MATRIZ_2026, type Matriz } from './matriz'

export interface TotaisProposta {
  totaisPorPA: TotalPA[]
  d1: number
  d2: number
  nf: number
  status: StatusD1
  completa: boolean
  pendentes: string[]
  motivos: string[]
}

export interface EntradaProposta {
  niveis: NiveisD1
  experiencias: Experiencia[]
  dataLimite: string
}

/** Resultado em JSON puro (sem undefined), pronto para gravar no Firestore. */
export function consolidarProposta(
  { niveis, experiencias, dataLimite }: EntradaProposta,
  matriz: Matriz = MATRIZ_2026,
): { totais: TotaisProposta; resultadoD2: ResultadoD2 } {
  const d1 = calcularD1(niveis, matriz)
  const d2 = calcularD2({ experiencias, dataLimite }, matriz)
  const totais: TotaisProposta = {
    totaisPorPA: d1.totaisPorPA,
    d1: d1.d1,
    d2: d2.total,
    nf: d1.d1 + d2.total,
    status: d1.status,
    completa: d1.completa,
    pendentes: d1.pendentes,
    motivos: d1.motivos,
  }
  return JSON.parse(JSON.stringify({ totais, resultadoD2: d2 })) as { totais: TotaisProposta; resultadoD2: ResultadoD2 }
}
