// Memória de cálculo da D2 em forma legível (tela e espelho): critérios na ordem do Anexo IV
// e ids das experiências trocados pelas descrições.

import type { ResultadoCriterio, ResultadoD2 } from '../domain/d2.js'

/** Troca os ids das experiências pelas descrições, entre aspas. */
export function legivel(linha: string, nomes: Record<string, string>): string {
  return Object.entries(nomes).reduce((texto, [id, nome]) => texto.split(id).join(`“${nome}”`), linha)
}

/** C2.1, C2.2, C2.3 (2.3.1 A, 2.3.1 B, 2.3.1, 2.3.2, 2.3.3) e C2.4, com o nível de recuo. */
export function criteriosDaMemoria(r: ResultadoD2): { resultado: ResultadoCriterio; nivel: 0 | 1 }[] {
  const c23 = r.criterios['C2.3']
  return [
    { resultado: r.criterios['C2.1'], nivel: 0 },
    { resultado: r.criterios['C2.2'], nivel: 0 },
    { resultado: c23, nivel: 0 },
    { resultado: c23.subcriterios['2.3.1'].A, nivel: 1 },
    { resultado: c23.subcriterios['2.3.1'].B, nivel: 1 },
    { resultado: c23.subcriterios['2.3.1'], nivel: 1 },
    { resultado: c23.subcriterios['2.3.2'], nivel: 1 },
    { resultado: c23.subcriterios['2.3.3'], nivel: 1 },
    { resultado: r.criterios['C2.4'], nivel: 0 },
  ]
}
