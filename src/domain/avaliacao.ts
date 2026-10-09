// Regras do registro de nível de um subcritério da D1 (C2), lidas da matriz.

import { MATRIZ_2026, type Matriz, type PlanoDeAcao } from './matriz/index.js'

/** Mínimo de caracteres da justificativa quando o chamamento não define outro. */
export const JUSTIFICATIVA_MINIMA_PADRAO = 20

export type DecisaoComissao = 'unanimidade' | 'maioria'

export interface RegistroAvaliacao {
  codigo: string
  nivel: number
  justificativa: string
  /** Páginas do Plano de Ação que fundamentam o nível (numeração do próprio PA). */
  paginas: number[]
  decisao: DecisaoComissao
  votoDivergente?: string
}

export function planoDoSubcriterio(codigo: string, matriz: Matriz = MATRIZ_2026): PlanoDeAcao | null {
  return matriz.dimensao1.planos.find((p) => p.subcriterios.some((s) => s.codigo === codigo)) ?? null
}

export function problemasDoRegistro(
  registro: RegistroAvaliacao,
  opcoes: { justificativaMinima?: number } = {},
  matriz: Matriz = MATRIZ_2026,
): Record<string, string> {
  const problemas: Record<string, string> = {}
  const plano = planoDoSubcriterio(registro.codigo, matriz)
  if (!plano) problemas.codigo = 'Subcritério inexistente na matriz.'

  const { escala } = matriz.dimensao1
  const minimo = escala[0]!.nivel
  const maximo = escala.at(-1)!.nivel
  if (!Number.isInteger(registro.nivel) || registro.nivel < minimo || registro.nivel > maximo) {
    problemas.nivel = `O nível deve ser um inteiro de ${minimo} a ${maximo}.`
  }

  const justificativaMinima = opcoes.justificativaMinima ?? JUSTIFICATIVA_MINIMA_PADRAO
  if (registro.justificativa.trim().length < justificativaMinima) {
    problemas.justificativa = `A justificativa deve ter ao menos ${justificativaMinima} caracteres.`
  }

  if (registro.paginas.some((pagina) => !Number.isInteger(pagina) || pagina < 1)) {
    problemas.paginas = 'As páginas devem ser números inteiros a partir de 1.'
  } else if (plano) {
    const acima = registro.paginas.find((pagina) => pagina > plano.limitePaginas)
    if (acima !== undefined) {
      problemas.paginas = `Página ${acima} acima do limite de ${plano.limitePaginas} páginas do ${plano.codigo}.`
    }
  }

  if (registro.votoDivergente !== undefined && registro.decisao !== 'maioria') {
    problemas.votoDivergente = 'Voto divergente só se aplica a decisão por maioria.'
  }
  return problemas
}

/** Páginas citadas acima do limite do PA do subcritério (aviso antes de enviar; a /api recusa). */
export function paginasAcimaDoCorte(
  codigo: string,
  paginas: number[],
  matriz: Matriz = MATRIZ_2026,
): { plano: string; limite: number; acima: number[] } | null {
  const plano = planoDoSubcriterio(codigo, matriz)
  if (!plano) return null
  return { plano: plano.codigo, limite: plano.limitePaginas, acima: paginas.filter((p) => p > plano.limitePaginas) }
}

/** Nível 0 neste subcritério desclassifica a proposta (Anexo IV, 3.10). */
export function ehEliminatorio(codigo: string, matriz: Matriz = MATRIZ_2026): boolean {
  return matriz.dimensao1.subcriteriosEliminatorios.includes(codigo)
}

/** "5, 2 7" → [2, 5, 7]; o que não for inteiro ≥ 1 vai para `invalidos`. */
export function lerPaginas(texto: string): { paginas: number[]; invalidos: string[] } {
  const paginas = new Set<number>()
  const invalidos: string[] = []
  for (const parte of texto.split(/[\s,;]+/).filter(Boolean)) {
    if (/^\d+$/.test(parte) && Number(parte) >= 1) paginas.add(Number(parte))
    else invalidos.push(parte)
  }
  return { paginas: [...paginas].sort((a, b) => a - b), invalidos }
}
