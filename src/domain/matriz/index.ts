import dados from './matriz_2026.json' with { type: 'json' }
import type { Faixa, Matriz } from './tipos.js'

export type * from './tipos.js'

function validarFaixas(rotulo: string, faixas: Faixa[], erros: string[]) {
  const ultima = faixas.at(-1)
  if (!ultima || ultima.ate !== null) {
    erros.push(`${rotulo}: a última faixa deve ser ilimitada (ate = null)`)
  }
  faixas.forEach((faixa, i) => {
    if (faixa.ate === null && i !== faixas.length - 1) {
      erros.push(`${rotulo}: apenas a última faixa pode ser ilimitada`)
    }
    const anterior = faixas[i - 1]
    if (anterior && (anterior.ate === null || (faixa.ate !== null && faixa.ate <= anterior.ate))) {
      erros.push(`${rotulo}: faixas fora de ordem crescente`)
    }
  })
}

/** Confere a coerência interna da matriz; lança erro listando todas as inconsistências. */
export function validarMatriz(matriz: Matriz): Matriz {
  const erros: string[] = []
  const { dimensao1: d1, dimensao2: d2 } = matriz

  const codigos = new Set<string>()
  for (const plano of d1.planos) {
    const soma = plano.subcriterios.reduce((t, s) => t + s.pontos, 0)
    if (soma !== plano.maximo) {
      erros.push(`${plano.codigo}: máximo ${plano.maximo} difere da soma dos subcritérios (${soma})`)
    }
    for (const s of plano.subcriterios) {
      if (codigos.has(s.codigo)) erros.push(`Subcritério ${s.codigo} duplicado`)
      codigos.add(s.codigo)
    }
  }
  const somaPlanos = d1.planos.reduce((t, p) => t + p.maximo, 0)
  if (somaPlanos !== d1.maximo) erros.push(`D1: máximo ${d1.maximo} difere da soma dos PAs (${somaPlanos})`)
  for (const c of d1.subcriteriosEliminatorios) {
    if (!codigos.has(c)) erros.push(`Subcritério eliminatório inexistente: ${c}`)
  }
  d1.escala.forEach((e, i) => {
    if (e.nivel !== i) erros.push(`Escala: níveis devem ser inteiros consecutivos a partir de 0`)
  })

  const { criterios: c } = d2
  const sub = c['C2.3'].subcriterios
  validarFaixas('C2.2', c['C2.2'].faixas, erros)
  validarFaixas('C2.3 / 2.3.1 A', sub['2.3.1'].A.faixas, erros)
  validarFaixas('C2.3 / 2.3.1 B', sub['2.3.1'].B.faixas, erros)
  validarFaixas('C2.3 / 2.3.2', sub['2.3.2'].faixas, erros)
  validarFaixas('C2.3 / 2.3.3', sub['2.3.3'].faixas, erros)
  validarFaixas('C2.4', c['C2.4'].faixas, erros)
  const somaD2 = c['C2.1'].maximo + c['C2.2'].maximo + c['C2.3'].maximo + c['C2.4'].maximo
  if (somaD2 !== d2.maximo) erros.push(`D2: máximo ${d2.maximo} difere da soma dos critérios (${somaD2})`)

  if (matriz.notaFinalMaxima !== d1.maximo + d2.maximo) erros.push('Nota final máxima difere de D1 + D2')

  const { admissibilidade: adm } = matriz
  if (!adm.requisitosEssenciais.some((r) => r.codigo === adm.requisitoPlanos)) {
    erros.push(`Admissibilidade: requisito dos PAs ${adm.requisitoPlanos} não está entre os requisitos essenciais`)
  }

  if (erros.length > 0) throw new Error(`Matriz inválida:\n- ${erros.join('\n- ')}`)
  return matriz
}

const matriz: Matriz = dados
export const MATRIZ_2026: Matriz = validarMatriz(matriz)
