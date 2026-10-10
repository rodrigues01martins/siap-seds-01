// Classificação das propostas por Nota Final (NF = D1 + D2), em ordem decrescente (Anexo IV, item 1.4).
// Só propostas aptas com avaliação completa entram no ranking.
// Empate de NF (RF-27): aplicam-se, sucessivamente, os critérios do Edital registrados na matriz
// (matriz_2026.json: desempate, fonteDesempate). Se ainda assim persistir o empate, as propostas
// dividem a posição e a Comissão decide; o presidente registra a decisão (api/desempate.ts), aplicada
// por classificarLote só ao mesmo grupo residual e à mesma NF.

import type { ResultadoD1, TotalPA } from './d1.js'
import type { CodigoCriterioD2, ResultadoD2 } from './d2.js'
import { MATRIZ_2026, type CriterioDesempate, type Matriz } from './matriz/index.js'

export interface PropostaAvaliada {
  id: string
  d1: Pick<ResultadoD1, 'd1' | 'status' | 'completa' | 'pendentes'> & {
    /** Pontos por PA (critérios de desempate II a IV). */
    totaisPorPA?: Pick<TotalPA, 'codigo' | 'pontos'>[]
  }
  d2: Pick<ResultadoD2, 'total'> & {
    /** Pontos por critério da D2 (critérios de desempate V e VI). */
    criterios?: Partial<Record<CodigoCriterioD2, { pontos: number }>>
  }
}

export interface PosicaoRanking {
  posicao: number
  id: string
  d1: number
  d2: number
  nf: number
  /** Mesma NF de outra proposta, sem desempate pelo Edital nem decisão registrada da Comissão. */
  empatada: boolean
  /** Posição definida pelos critérios de desempate do Edital (RF-27). */
  desempatadaPeloEdital: boolean
  /** Ordem do critério do Edital ("I"…"VI") que separou esta proposta das demais empatadas. */
  criterioDesempate: string | null
  /** Posição definida pela decisão de desempate registrada pela Comissão (RF-27). */
  desempatadaPelaComissao: boolean
}

/** Grupo que segue empatado depois dos critérios do Edital (divide a posição). */
export interface EmpateResidual {
  nf: number
  ids: string[]
  posicao: number
}

export interface Classificacao {
  ranking: PosicaoRanking[]
  inaptas: string[]
  desclassificadas: string[]
  pendentes: string[]
  /** Empates que os critérios do Edital não resolveram. */
  empates: EmpateResidual[]
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

/** Valor da proposta no critério de desempate (undefined = dado ausente; o critério não se aplica). */
function valorNoCriterio(p: PropostaAvaliada, criterio: CriterioDesempate): number | undefined {
  const ref = criterio.referencia
  if (ref === 'D1') return p.d1.d1
  const pa = p.d1.totaisPorPA?.find((t) => t.codigo === ref)
  if (pa) return pa.pontos
  return p.d2.criterios?.[ref as CodigoCriterioD2]?.pontos
}

interface Subgrupo {
  propostas: PropostaAvaliada[]
  /** Critério que deixou a proposta sozinha no subgrupo (null = segue empatada ou nunca empatou). */
  criterio: string | null
}

/**
 * Aplica os critérios sucessivamente a um grupo de mesma NF: em cada critério, maior valor vence;
 * quem empata segue para o próximo. Para no primeiro critério sem dado para alguma proposta do grupo.
 */
function desempatar(grupo: PropostaAvaliada[], criterios: CriterioDesempate[], nivel = 0): Subgrupo[] {
  const criterio = criterios[nivel]
  if (grupo.length <= 1 || !criterio) return [{ propostas: grupo, criterio: null }]
  const valores = grupo.map((p) => valorNoCriterio(p, criterio))
  if (valores.some((v) => v === undefined)) return [{ propostas: grupo, criterio: null }]

  const distintos = [...new Set(valores as number[])].sort((a, b) => b - a)
  return distintos.flatMap((valor) => {
    const sub = grupo.filter((_, i) => valores[i] === valor)
    if (sub.length === 1) return [{ propostas: sub, criterio: criterio.ordem }]
    return desempatar(sub, criterios, nivel + 1)
  })
}

export function classificar(propostas: PropostaAvaliada[], matriz: Matriz = MATRIZ_2026): Classificacao {
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

  const nf = (p: PropostaAvaliada) => p.d1.d1 + p.d2.total
  const porNF = new Map<number, PropostaAvaliada[]>()
  for (const p of aptas) porNF.set(nf(p), [...(porNF.get(nf(p)) ?? []), p])

  const ranking: PosicaoRanking[] = []
  const empates: EmpateResidual[] = []
  for (const valorNF of [...porNF.keys()].sort((a, b) => b - a)) {
    const grupo = porNF.get(valorNF)!
    const empateDeNF = grupo.length > 1
    for (const sub of desempatar(grupo, matriz.desempate)) {
      // Posição de competição (1, 2, 2, 4): quem segue empatado divide a posição.
      const posicao = ranking.length + 1
      const residual = sub.propostas.length > 1
      if (residual) empates.push({ nf: valorNF, ids: sub.propostas.map((p) => p.id), posicao })
      for (const p of sub.propostas) {
        ranking.push({
          posicao,
          id: p.id,
          d1: p.d1.d1,
          d2: p.d2.total,
          nf: valorNF,
          empatada: residual,
          desempatadaPeloEdital: empateDeNF && !residual,
          criterioDesempate: residual ? null : sub.criterio,
          desempatadaPelaComissao: false,
        })
      }
    }
  }
  return { ranking, inaptas, desclassificadas, pendentes, empates, definitiva: pendentes.length === 0 }
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
  totaisPorPA?: Pick<TotalPA, 'codigo' | 'pontos'>[]
  /** Ausente em totais gravados antes do RF-27: os critérios V e VI não se aplicam até o recálculo. */
  d2PorCriterio?: Partial<Record<CodigoCriterioD2, number>>
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

export interface ClassificacaoLote extends Omit<Classificacao, 'empates'> {
  naoAdmitidas: string[]
  /** Empates que os critérios do Edital não resolveram, com ou sem decisão da Comissão. */
  empates: GrupoEmpatado[]
}

const mesmoConjunto = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x))

export function classificarLote(
  propostas: PropostaDoLote[],
  decisoes: DecisaoDesempate[] = [],
  matriz: Matriz = MATRIZ_2026,
): ClassificacaoLote {
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
        d1: { d1: t.d1, status: t.status as ResultadoD1['status'], completa: t.completa, pendentes: t.pendentes, totaisPorPA: t.totaisPorPA },
        d2: {
          total: t.d2,
          criterios: t.d2PorCriterio
            ? Object.fromEntries(Object.entries(t.d2PorCriterio).map(([c, pontos]) => [c, { pontos }]))
            : undefined,
        },
      })
    }
  }

  const base = classificar(avaliadas, matriz)
  const ranking = [...base.ranking]
  const empates: GrupoEmpatado[] = []

  for (const grupo of base.empates) {
    const decisao = decisoes.find((d) => d.nf === grupo.nf && mesmoConjunto(d.propostas, grupo.ids) && mesmoConjunto(d.ordem, grupo.ids))
    empates.push({ nf: grupo.nf, ids: grupo.ids, decidido: decisao !== undefined })
    if (!decisao) continue
    const inicio = ranking.findIndex((p) => p.id === grupo.ids[0])
    decisao.ordem.forEach((id, i) => {
      const entrada = base.ranking.find((p) => p.id === id)!
      ranking[inicio + i] = { ...entrada, posicao: grupo.posicao + i, empatada: false, desempatadaPelaComissao: true }
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
