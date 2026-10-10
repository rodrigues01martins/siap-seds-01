// Quadro-resumo do lote: a mesma tabela da tela de classificação (classificarLote, src/domain), em linhas
// prontas para o PDF e o XLSX. A tela de classificação usa daqui o motivo de quem fica fora e o aviso
// de classificação não definitiva, para os três mostrarem o mesmo texto.

import type { TDocumentDefinitions } from 'pdfmake/interfaces'
import { classificarLote, type ClassificacaoLote, type DecisaoDesempate, type SituacaoAdmissao } from '../domain/classificacao.js'
import { formatarNumero } from '../domain/formatacao.js'
import { MATRIZ_2026 } from '../domain/matriz/index.js'
import type { TotaisProposta } from '../domain/proposta.js'
import { ROTULO_STATUS, statusDaProposta } from '../domain/statusProposta.js'
import { montarPdf, tabela, type Rodape } from './documento.js'

/** Proposta do lote como a classificação a lê (totais e admissibilidade gravados pela /api). */
export interface PropostaQuadro {
  id: string
  nomeOsc: string
  totais?: TotaisProposta
  bloqueada?: boolean
  admissibilidade?: { situacao: SituacaoAdmissao; motivos: string[]; motivacao?: string }
}

export interface DecisaoComJustificativa extends DecisaoDesempate {
  justificativa: string
}

export type SituacaoFora = 'pendente' | 'inapta' | 'desclassificada' | 'nao_admitida'

export const ROTULO_FORA: Record<SituacaoFora, string> = {
  pendente: 'Pendente',
  inapta: 'Inapta',
  desclassificada: 'Desclassificada',
  nao_admitida: 'Não admitida',
}

export interface LinhaQuadro {
  id: string
  /** null = fora da classificação. */
  posicao: number | null
  nomeOsc: string
  /** Pontos de PA1…PA6 (null sem totais). */
  pas: (number | null)[]
  d1: number | null
  d2: number | null
  nf: number | null
  situacao: string
  observacao: string
}

export interface Quadro {
  linhas: LinhaQuadro[]
  definitiva: boolean
  /** Texto do selo "Classificação não definitiva", ou null. */
  aviso: string | null
  empates: { nf: number; nomes: string[]; decisao: { ordem: string[]; justificativa: string } | null }[]
}

const PLANOS = MATRIZ_2026.dimensao1.planos
const plural = (n: number, singular: string, pluralTexto: string) => `${n} ${n === 1 ? singular : pluralTexto}`
const mesmoConjunto = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x))

/** Motivo de uma proposta fora da classificação, com o texto do domínio. */
export function motivoFora(p: PropostaQuadro, situacao: SituacaoFora): string {
  if (situacao === 'pendente') {
    if (!p.totais) return 'Avaliação não iniciada'
    const n = p.totais.pendentes.length
    return `${n === 1 ? 'Falta' : 'Faltam'} ${plural(n, 'subcritério', 'subcritérios')}`
  }
  if (situacao === 'nao_admitida' || (situacao === 'desclassificada' && p.admissibilidade?.situacao === 'desclassificada')) {
    const motivos = [...(p.admissibilidade?.motivos ?? [])]
    if (p.admissibilidade?.motivacao) motivos.push(p.admissibilidade.motivacao)
    return motivos.join('; ') || 'Admissibilidade (Anexo III, item 28)'
  }
  return (p.totais?.motivos ?? []).join('; ')
}

/** Texto do selo de classificação não definitiva (null quando definitiva). */
export function avisoNaoDefinitiva(r: ClassificacaoLote): string | null {
  if (r.definitiva) return null
  const abertos = r.empates.filter((e) => !e.decidido).length
  const partes = [
    r.pendentes.length > 0 && plural(r.pendentes.length, 'proposta pendente', 'propostas pendentes'),
    abertos > 0 && plural(abertos, 'empate sem decisão', 'empates sem decisão'),
  ].filter(Boolean)
  return `Classificação não definitiva: ${partes.join('; ')}.`
}

export function classificarPropostas(propostas: PropostaQuadro[], decisoes: DecisaoDesempate[]): ClassificacaoLote {
  return classificarLote(
    propostas.map((p) => ({ id: p.id, totais: p.totais ?? null, admissao: p.admissibilidade?.situacao })),
    decisoes,
  )
}

/** Propostas fora da classificação, na ordem da tela: pendentes, inaptas, desclassificadas e não admitidas. */
export function propostasFora(r: ClassificacaoLote): { id: string; situacao: SituacaoFora }[] {
  return [
    ...r.pendentes.map((id) => ({ id, situacao: 'pendente' as const })),
    ...r.inaptas.map((id) => ({ id, situacao: 'inapta' as const })),
    ...r.desclassificadas.map((id) => ({ id, situacao: 'desclassificada' as const })),
    ...r.naoAdmitidas.map((id) => ({ id, situacao: 'nao_admitida' as const })),
  ]
}

export function montarQuadro(propostas: PropostaQuadro[], decisoes: DecisaoComJustificativa[]): Quadro {
  const r = classificarPropostas(propostas, decisoes)
  const porId = new Map(propostas.map((p) => [p.id, p]))
  const pas = (p: PropostaQuadro) => PLANOS.map((_, i) => p.totais?.totaisPorPA[i]?.pontos ?? null)

  const classificadas: LinhaQuadro[] = r.ranking.map((pos) => {
    const p = porId.get(pos.id)!
    return {
      id: p.id,
      posicao: pos.posicao,
      nomeOsc: p.nomeOsc,
      pas: pas(p),
      d1: pos.d1,
      d2: pos.d2,
      nf: pos.nf,
      situacao: ROTULO_STATUS[statusDaProposta(p)],
      observacao: pos.empatada
        ? 'Empatada'
        : pos.desempatadaPelaComissao
          ? 'Desempate da Comissão'
          : pos.desempatadaPeloEdital
            ? `Desempate pelo Edital (critério ${pos.criterioDesempate})`
            : '',
    }
  })
  const fora: LinhaQuadro[] = propostasFora(r).map(({ id, situacao }) => {
    const p = porId.get(id)!
    return {
      id,
      posicao: null,
      nomeOsc: p.nomeOsc,
      pas: pas(p),
      d1: p.totais?.d1 ?? null,
      d2: p.totais?.d2 ?? null,
      nf: p.totais?.nf ?? null,
      situacao: `${ROTULO_FORA[situacao]}${p.bloqueada ? ' (homologada)' : ''}`,
      observacao: motivoFora(p, situacao),
    }
  })

  const nome = (id: string) => porId.get(id)?.nomeOsc ?? id
  return {
    linhas: [...classificadas, ...fora],
    definitiva: r.definitiva,
    aviso: avisoNaoDefinitiva(r),
    empates: r.empates.map((e) => {
      const decisao = e.decidido ? decisoes.find((d) => d.nf === e.nf && mesmoConjunto(d.propostas, e.ids)) : undefined
      return {
        nf: e.nf,
        nomes: e.ids.map(nome),
        decisao: decisao ? { ordem: decisao.ordem.map(nome), justificativa: decisao.justificativa } : null,
      }
    }),
  }
}

export interface CabecalhoQuadro {
  chamamento: { numero: string; titulo: string }
  lote: { codigo: string; descricao: string }
}

export const COLUNAS_QUADRO = ['Posição', 'OSC', ...PLANOS.map((p) => p.codigo), 'D1', 'D2', 'NF', 'Situação', 'Observação']

export const tituloQuadro = (c: CabecalhoQuadro) => `Quadro-resumo — Lote ${c.lote.codigo} — ${c.lote.descricao}`
export const subtituloQuadro = (c: CabecalhoQuadro) =>
  `Chamamento Público nº ${c.chamamento.numero} — ${c.chamamento.titulo}. Ranking por NF entre propostas aptas e completas (Anexo IV, 3.10); empates de NF resolvidos pelos critérios do Edital (I a VI) e, se persistirem, pela Comissão.`

/** Texto de cada empate para o PDF e o XLSX. */
export function textoEmpate(e: Quadro['empates'][number]): string {
  return `NF ${formatarNumero(e.nf)}: ${e.nomes.join(', ')} — ${
    e.decisao ? `decisão da Comissão: ${e.decisao.ordem.join(' > ')}. Justificativa: ${e.decisao.justificativa}` : 'sem decisão registrada'
  }`
}

const num = (v: number | null) => (v === null ? '—' : formatarNumero(v))

export function quadroPdf(cabecalho: CabecalhoQuadro, quadro: Quadro, rodape: Rodape, minuta: boolean): TDocumentDefinitions {
  return montarPdf({
    titulo: tituloQuadro(cabecalho),
    subtitulo: subtituloQuadro(cabecalho),
    orientacao: 'landscape',
    rodape,
    minuta,
    conteudo: [
      ...(quadro.aviso ? [{ text: quadro.aviso, bold: true, color: '#92400e', margin: [0, 0, 0, 6] as [number, number, number, number] }] : []),
      tabela(
        COLUNAS_QUADRO,
        quadro.linhas.map((l) => [
          l.posicao === null ? '—' : `${l.posicao}º`,
          l.nomeOsc,
          ...l.pas.map((v) => ({ text: num(v), alignment: 'right' as const })),
          { text: num(l.d1), alignment: 'right' as const },
          { text: num(l.d2), alignment: 'right' as const },
          { text: num(l.nf), alignment: 'right' as const, bold: true },
          l.situacao,
          l.observacao,
        ]),
        [38, 110, 28, 28, 28, 28, 28, 28, 32, 32, 32, 60, '*'],
      ),
      ...(quadro.empates.length > 0
        ? [{ text: 'Empates não resolvidos pelos critérios do Edital (RF-27)', style: 'secao' }, { ul: quadro.empates.map(textoEmpate) }]
        : []),
    ],
  })
}
