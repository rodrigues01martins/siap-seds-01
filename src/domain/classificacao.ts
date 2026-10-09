// Classificação das propostas por Nota Final (NF = D1 + D2), em ordem decrescente (Anexo IV, item 1.4).
// Só propostas aptas com avaliação completa entram no ranking.
// O sistema NÃO calcula desempate: propostas com a mesma NF dividem a posição e são sinalizadas.
// Enquanto o Edital não parametrizar o critério (RF-27), a decisão da Comissão é registrada pelo
// presidente (api/desempate.ts) e aplicada por classificarLote só ao mesmo grupo e à mesma NF.

import type { ResultadoD1 } from './d1.js'
import type { ResultadoD2 } from './d2.js'

export interface PropostaAvaliada {
  id: string
  d1: Pick<ResultadoD1, 'd1' | 'status' | 'completa' | 'pendentes'>
  d2: Pick<ResultadoD2, 'total'>
}

export interface PosicaoRanking {
  posicao: number
  id: string
  d1: number
  d2: number
  nf: number
  /** Mesma NF de outra proposta (dividem a posição) e sem decisão registrada da Comissão. */
  empatada: boolean
  /** Posição definida pela decisão de desempate registrada (RF-27). */
  desempatadaPelaComissao: boolean
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
    desempatadaPelaComissao: false,
  }))
  return { ranking, inaptas, desclassificadas, pendentes, definitiva: pendentes.length === 0 }
}

// ---------------------------------------------------------------------------
// Classificação do lote a partir do que a /api gravou (totais e admissibilidade)
// ---------------------------------------------------------------------------

export type SituacaoAdmissao = 'admitida' | 'nao_admitida' | 'desclassificada'

/** O que a /api grava em propostas/{p}.totais (C4). */
export interface TotaisGravados {
  d1: number
  d2: number
  status: string
  completa: boolean
  pendentes: string[]
}

export interface PropostaDoLote {
  id: string
  totais?: TotaisGravados | null
  /** Situação da admissibilidade (Anexo III, item 28), se registrada. */
  admissao?: SituacaoAdmissao
}

/** Decisão de desempate da Comissão (RF-27), registrada pelo presidente. */
export interface DecisaoDesempate {
  propostas: string[]
  nf: number
  ordem: string[]
}

export interface GrupoEmpatado {
  nf: number
  ids: string[]
  decidido: boolean
}

export interface ClassificacaoLote extends Classificacao {
  naoAdmitidas: string[]
  empates: GrupoEmpatado[]
}

const mesmoConjunto = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x))

export function classificarLote(propostas: PropostaDoLote[], decisoes: DecisaoDesempate[] = []): ClassificacaoLote {
  const naoAdmitidas: string[] = []
  const desclassificadasNaAdmissao: string[] = []
  const semTotais: string[] = []
  const avaliadas: PropostaAvaliada[] = []

  for (const p of propostas) {
    if (p.admissao === 'nao_admitida') naoAdmitidas.push(p.id)
    else if (p.admissao === 'desclassificada') desclassificadasNaAdmissao.push(p.id)
    else if (!p.totais) semTotais.push(p.id)
    else {
      const t = p.totais
      avaliadas.push({
        id: p.id,
        d1: { d1: t.d1, status: t.status as ResultadoD1['status'], completa: t.completa, pendentes: t.pendentes },
        d2: { total: t.d2 },
      })
    }
  }

  const base = classificar(avaliadas)
  const ranking = [...base.ranking]
  const empates: GrupoEmpatado[] = []

  for (const nf of [...new Set(ranking.filter((p) => p.empatada).map((p) => p.nf))]) {
    const ids = ranking.filter((p) => p.nf === nf).map((p) => p.id)
    const decisao = decisoes.find((d) => d.nf === nf && mesmoConjunto(d.propostas, ids) && mesmoConjunto(d.ordem, ids))
    empates.push({ nf, ids, decidido: decisao !== undefined })
    if (!decisao) continue
    const inicio = ranking.findIndex((p) => p.nf === nf)
    const posicaoInicial = ranking[inicio]!.posicao
    decisao.ordem.forEach((id, i) => {
      const entrada = base.ranking.find((p) => p.id === id)!
      ranking[inicio + i] = { ...entrada, posicao: posicaoInicial + i, empatada: false, desempatadaPelaComissao: true }
    })
  }

  return {
    ranking,
    inaptas: base.inaptas,
    desclassificadas: [...base.desclassificadas, ...desclassificadasNaAdmissao],
    pendentes: [...base.pendentes, ...semTotais],
    naoAdmitidas,
    empates,
    definitiva: base.definitiva && semTotais.length === 0 && empates.every((e) => e.decidido),
  }
}
