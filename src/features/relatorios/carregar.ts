// Leitura única dos dados de cada relatório (no momento de gerar). Convertem os documentos do Firestore
// nos formatos puros de src/relatorios, que montam o documento e o código de verificação.

import type { ResultadoD2 } from '../../domain/d2'
import type { TotaisProposta } from '../../domain/proposta'
import { ROTULO_SITUACAO, situacaoDaProposta } from '../../domain/situacaoProposta'
import { lerColecao, lerDocumento } from '../../lib/firestore'
import type { Avaliacao, Chamamento, Osc, Proposta, Sessao } from '../../lib/tipos'
import type { DadosAta } from '../../relatorios/ata'
import type { AdmissibilidadeEspelho, DadosEspelho } from '../../relatorios/espelho'

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
      concluida: proposta.concluida === true,
      status: situacaoDaProposta(proposta),
      totais: (proposta.totais as TotaisProposta | undefined) ?? null,
    },
    admissibilidade: (proposta.admissibilidade as AdmissibilidadeEspelho | undefined) ?? null,
    avaliacoes: Object.fromEntries(avaliacoes.map((a) => [a.id, { nivel: a.nivel, justificativa: a.justificativa, paginas: a.paginas ?? [] }])),
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

/** Dados da ata: sessão (lotes e presentes), propostas dos lotes em pauta (situação e conclusão) e desempates. */
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
  // Pauta: as propostas dos lotes da sessão.
  const lotes = sessao.lotes ?? []
  const pauta = propostas.filter((p) => lotes.includes(p.loteCodigo)).map((p) => p.id)

  return {
    chamamento: { numero: chamamento.numero, titulo: chamamento.titulo },
    sessao: {
      id: sessao.id,
      data: sessao.data,
      lotes,
      presentes: sessao.presentes ?? [],
    },
    propostas: pauta.map((id) => {
      const p = porId.get(id)!
      return {
        id,
        nomeOsc: nome(id),
        cnpj: p.oscCnpj,
        loteCodigo: p.loteCodigo,
        numeroSEI: p.numeroSEI,
        status: ROTULO_SITUACAO[situacaoDaProposta(p)],
        nf: p.totais?.nf ?? null,
        concluida: p.concluida === true,
      }
    }),
    desempates: desempates
      .filter((d) => d.propostas.some((id) => pauta.includes(id)))
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((d) => ({ loteCodigo: d.loteCodigo, nf: d.nf, ordem: d.ordem.map(nome), justificativa: d.justificativa })),
  }
}
