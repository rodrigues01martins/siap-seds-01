// Classificação das propostas por Nota Final (NF = D1 + D2), em ordem decrescente (Anexo IV, item 1.4).
// Só propostas aptas com avaliação completa entram no ranking.
// O sistema NÃO desempata: propostas com a mesma NF dividem a posição e são sinalizadas;
// a Comissão decide o empate formalmente em outra instância.

import type { ResultadoD1 } from './d1.js'
import type { ResultadoD2 } from './d2.js'

export interface PropostaAvaliada {
  id: string
  d1: ResultadoD1
  d2: ResultadoD2
}

export interface PosicaoRanking {
  posicao: number
  id: string
  d1: number
  d2: number
  nf: number
  /** Mesma NF de outra proposta (dividem a posição); a Comissão decide fora do sistema. */
  empatada: boolean
}

export interface Classificacao {
  ranking: PosicaoRanking[]
  inaptas: string[]
  desclassificadas: string[]
  pendentes: string[]
  /** Falso enquanto houver proposta pendente de avaliação. */
  definitiva: boolean
}

type Situacao = 'apta' | 'inapta' | 'desclassificada' | 'pendente'

/**
 * Decisão de sistema: "pendente" não é status do Anexo IV; marca avaliação incompleta e nunca
 * é classificada. Resultado incompleto conta como pendente mesmo que traga outro status.
 */
function situacao({ d1 }: PropostaAvaliada): Situacao {
  if (d1.status === 'desclassificada') return 'desclassificada'
  if (d1.status === 'pendente' || !d1.completa || d1.pendentes.length > 0) return 'pendente'
  return d1.status
}

export function classificar(propostas: PropostaAvaliada[]): Classificacao {
  const aptas: PropostaAvaliada[] = []
  const inaptas: string[] = []
  const desclassificadas: string[] = []
  const pendentes: string[] = []

  for (const p of propostas) {
    const s = situacao(p)
    if (s === 'apta') aptas.push(p)
    else if (s === 'inapta') inaptas.push(p.id)
    else if (s === 'desclassificada') desclassificadas.push(p.id)
    else pendentes.push(p.id)
  }

  const notas = aptas
    .map((p) => ({ id: p.id, d1: p.d1.d1, d2: p.d2.total, nf: p.d1.d1 + p.d2.total }))
    .sort((x, y) => y.nf - x.nf)
  const contagemPorNF = new Map<number, number>()
  for (const n of notas) contagemPorNF.set(n.nf, (contagemPorNF.get(n.nf) ?? 0) + 1)

  // Posição de competição (1, 2, 2, 4): empatadas dividem a posição da primeira do grupo.
  const ranking = notas.map((n) => ({
    posicao: notas.findIndex((outra) => outra.nf === n.nf) + 1,
    ...n,
    empatada: contagemPorNF.get(n.nf)! > 1,
  }))
  return { ranking, inaptas, desclassificadas, pendentes, definitiva: pendentes.length === 0 }
}
