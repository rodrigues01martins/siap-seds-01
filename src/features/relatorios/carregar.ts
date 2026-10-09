// Leitura única dos dados de cada relatório (no momento de gerar). Convertem os documentos do Firestore
// nos formatos puros de src/relatorios, que montam o documento e o código de verificação.

import type { Admissibilidade } from '../../domain/admissibilidade'
import type { ResultadoD2 } from '../../domain/d2'
import { MATRIZ_2026 } from '../../domain/matriz'
import type { TotaisProposta } from '../../domain/proposta'
import { ROTULO_STATUS, statusDaProposta } from '../../domain/statusProposta'
import { lerColecao, lerDocumento } from '../../lib/firestore'
import type { Avaliacao, Chamamento, Osc, Proposta, Sessao } from '../../lib/tipos'
import type { DadosAta } from '../../relatorios/ata'
import type { DadosEspelho } from '../../relatorios/espelho'
import type { DiligenciaGravada } from '../diligencias/ListaDiligencias'

const SUBCRITERIOS = new Map(MATRIZ_2026.dimensao1.planos.flatMap((p) => p.subcriterios.map((s) => [s.codigo, s.titulo] as const)))

export async function carregarEspelho(ch: string, p: string): Promise<DadosEspelho | null> {
  const base = `chamamentos/${ch}/propostas/${p}`
  const [chamamento, proposta, avaliacoes, d2, experiencias] = await Promise.all([
    lerDocumento<Chamamento>(`chamamentos/${ch}`),
    lerDocumento<Proposta>(base),
    lerColecao<Avaliacao>(`${base}/avaliacoes`),
    lerDocumento<ResultadoD2>(`${base}/resultadoD2/atual`),
    lerColecao<{ descricao?: string }>(`${base}/experiencias`),
  ])
  if (!chamamento || !proposta) return null
  const osc = await lerDocumento<Osc>(`oscs/${proposta.oscCnpj}`)
  const lote = chamamento.lotes.find((l) => l.codigo === proposta.loteCodigo)
  const { id: _id, ...resultadoD2 } = d2 ?? { id: '' }
  return {
    chamamento: { numero: chamamento.numero, titulo: chamamento.titulo },
    lote: { codigo: proposta.loteCodigo, descricao: lote?.descricao },
    osc: { cnpj: proposta.oscCnpj, razaoSocial: osc?.razaoSocial ?? 'OSC não encontrada' },
    proposta: {
      id: proposta.id,
      numeroSEI: proposta.numeroSEI,
      protocolo: proposta.protocolo,
      bloqueada: proposta.bloqueada === true,
      status: statusDaProposta(proposta),
      totais: (proposta.totais as TotaisProposta | undefined) ?? null,
    },
    admissibilidade: (proposta.admissibilidade as Admissibilidade | undefined) ?? null,
    avaliacoes: Object.fromEntries(
      avaliacoes.map((a) => [
        a.id,
        { nivel: a.nivel, decisao: a.decisao, votoDivergente: a.votoDivergente, justificativa: a.justificativa, paginas: a.paginas ?? [] },
      ]),
    ),
    d2: d2 ? (resultadoD2 as ResultadoD2) : null,
    experiencias: Object.fromEntries(experiencias.map((e) => [e.id, e.descricao ?? e.id])),
  }
}

interface DesempateGravado {
  loteCodigo: string
  nf: number
  propostas: string[]
  ordem: string[]
  justificativa: string
}

/** Dados da ata: sessão, pauta, decisões por maioria registradas nela, desempates e diligências da pauta. */
export async function carregarAta(ch: string, s: string): Promise<DadosAta | null> {
  const [chamamento, sessao, propostas, oscs, desempates] = await Promise.all([
    lerDocumento<Chamamento>(`chamamentos/${ch}`),
    lerDocumento<Sessao>(`chamamentos/${ch}/sessoes/${s}`),
    lerColecao<Proposta>(`chamamentos/${ch}/propostas`),
    lerColecao<Osc>('oscs'),
    lerColecao<DesempateGravado>(`chamamentos/${ch}/desempates`),
  ])
  if (!chamamento || !sessao) return null
  const porId = new Map(propostas.map((p) => [p.id, p]))
  const nomeOsc = new Map(oscs.map((o) => [o.cnpj, o.razaoSocial]))
  const nome = (id: string) => {
    const p = porId.get(id)
    return p ? (nomeOsc.get(p.oscCnpj) ?? p.oscCnpj) : id
  }
  const pauta = sessao.pauta.filter((id) => porId.has(id))

  const porProposta = await Promise.all(
    pauta.map(async (id) => ({
      id,
      avaliacoes: await lerColecao<Avaliacao>(`chamamentos/${ch}/propostas/${id}/avaliacoes`),
      diligencias: await lerColecao<Omit<DiligenciaGravada, 'id'>>(`chamamentos/${ch}/propostas/${id}/diligencias`),
    })),
  )

  return {
    chamamento: { numero: chamamento.numero, titulo: chamamento.titulo },
    sessao: { id: sessao.id, data: sessao.data, presentes: sessao.presentes, declaracoes: sessao.declaracoes },
    propostas: pauta.map((id) => {
      const p = porId.get(id)!
      return {
        id,
        nomeOsc: nome(id),
        cnpj: p.oscCnpj,
        loteCodigo: p.loteCodigo,
        numeroSEI: p.numeroSEI,
        status: ROTULO_STATUS[statusDaProposta(p)],
        nf: p.totais?.nf ?? null,
        bloqueada: p.bloqueada === true,
      }
    }),
    decisoesPorMaioria: porProposta.flatMap(({ id, avaliacoes }) =>
      avaliacoes
        .filter((a) => a.sessaoId === s && a.decisao === 'maioria')
        .sort((a, b) => [...SUBCRITERIOS.keys()].indexOf(a.id) - [...SUBCRITERIOS.keys()].indexOf(b.id))
        .map((a) => ({
          propostaId: id,
          codigo: a.id,
          titulo: SUBCRITERIOS.get(a.id) ?? '',
          nivel: a.nivel,
          votoDivergente: a.votoDivergente,
          justificativa: a.justificativa,
        })),
    ),
    desempates: desempates
      .filter((d) => d.propostas.some((id) => pauta.includes(id)))
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((d) => ({ loteCodigo: d.loteCodigo, nf: d.nf, ordem: d.ordem.map(nome), justificativa: d.justificativa })),
    diligencias: porProposta.flatMap(({ id, diligencias }) =>
      diligencias
        .sort((a, b) => a.prazo.localeCompare(b.prazo) || a.id.localeCompare(b.id))
        .map((x) => ({
          propostaId: id,
          objeto: x.objeto,
          prazo: x.prazo,
          status: x.status,
          resposta: x.resposta?.texto,
          conclusao: x.conclusao,
        })),
    ),
  }
}
