import type { Faixa } from './matriz/tipos'

/** Retorna a primeira faixa cujo limite `ate` (inclusivo) comporta o valor; `ate` nulo = sem limite. */
export function pontuarPorFaixa(valor: number, faixas: Faixa[]): Faixa {
  const faixa = faixas.find((f) => f.ate === null || valor <= f.ate)
  if (!faixa) throw new Error(`Nenhuma faixa comporta o valor ${valor}`)
  return faixa
}
