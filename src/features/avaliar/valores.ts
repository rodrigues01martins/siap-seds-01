// Valores da avaliação como a tela mostra: o rascunho do salvamento automático (otimista) ou o gravado. Usado
// pelo cabeçalho (progresso, D1 e NF parciais, status) e pela aba D1 (subtotais, pendências).

import { calcularD1, type ResultadoD1 } from '../../domain/d1'
import { MATRIZ_2026 } from '../../domain/matriz'
import { pendenciasDoRegistro } from '../../esquemas/avaliacao'
import type { FilaSalvamento } from '../../lib/salvamento'
import type { Avaliacao } from '../../lib/tipos'

export const CODIGOS_D1 = MATRIZ_2026.dimensao1.planos.flatMap((p) => p.subcriterios.map((s) => s.codigo))

/** Chaves do salvamento automático (uma por campo gravado). */
export const chaveD1 = (p: string, codigo: string, campo: 'nivel' | 'justificativa' | 'paginas') => `d1:${p}:${codigo}:${campo}`
export const chaveAdmissao = (p: string) => `adm:${p}`
export const chaveExperiencia = (p: string, id: string) => `d2:${p}:${id}`

export interface ValorSubcriterio {
  nivel: number | null
  justificativa: string
}

export function valoresD1(fila: FilaSalvamento, p: string, avaliacoes: ({ id: string } & Partial<Avaliacao>)[]): Map<string, ValorSubcriterio> {
  const gravadas = new Map(avaliacoes.map((a) => [a.id, a]))
  return new Map(
    CODIGOS_D1.map((codigo) => {
      const nivel = fila.rascunho<number | null>(chaveD1(p, codigo, 'nivel'))
      const justificativa = fila.rascunho<string>(chaveD1(p, codigo, 'justificativa'))
      const gravada = gravadas.get(codigo)
      return [
        codigo,
        {
          nivel: nivel !== undefined ? nivel : (gravada?.nivel ?? null),
          justificativa: justificativa ?? gravada?.justificativa ?? '',
        },
      ]
    }),
  )
}

export interface ResumoD1 {
  previa: ResultadoD1
  /** Subcritérios sem pendência (nível e justificativa com o mínimo). */
  completos: number
  /** Códigos com pendência, na ordem da matriz. */
  pendentes: string[]
}

export function resumirD1(valores: Map<string, ValorSubcriterio>, justificativaMinima?: number): ResumoD1 {
  const previa = calcularD1(Object.fromEntries([...valores].map(([c, v]) => [c, v.nivel])))
  const pendentes = CODIGOS_D1.filter((c) => pendenciasDoRegistro(valores.get(c), justificativaMinima).length > 0)
  return { previa, completos: CODIGOS_D1.length - pendentes.length, pendentes }
}

/** Próximo subcritério pendente depois de `depoisDe` (circular), ou o primeiro; null se não há. */
export function proximoPendente(pendentes: string[], depoisDe: string | null): string | null {
  if (pendentes.length === 0) return null
  if (depoisDe === null) return pendentes[0]!
  const i = CODIGOS_D1.indexOf(depoisDe)
  return pendentes.find((c) => CODIGOS_D1.indexOf(c) > i) ?? pendentes[0]!
}

/** Eliminatórias na prévia: nível 0 em subcritério eliminatório (desclassifica) e D1 abaixo do corte (inapta). */
export function eliminatorias(previa: ResultadoD1): string[] {
  return previa.motivos.filter((m) => m.startsWith('Nível 0') || m.includes('inferior ao corte'))
}
