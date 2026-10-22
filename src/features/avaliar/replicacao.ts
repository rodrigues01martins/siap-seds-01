// Cópia de experiências entre lotes na aba D2, nos dois sentidos, entre a proposta aberta e a proposta da mesma OSC
// em outro lote do chamamento:
// - "Replicar para outro lote" (enviar): desta proposta, que tem experiências, para a outra;
// - "Trazer do outro lote" (trazer): da outra proposta para esta — o caso da sessão nova do Lote II, quando o Lote I
//   já foi avaliado numa sessão encerrada e a proposta dele nem está na pauta.
// Quem recebe a cópia precisa estar na pauta da sessão aberta e admitido; a origem só é lida. A /api repete tudo.

import type { Lote, Proposta } from '../../lib/tipos'

export interface DestinoReplicacao {
  propostaId: string
  lote: string
  /** Ex.: "L2 — Lote II". */
  rotuloLote: string
}

export interface Comando {
  /** Por que o comando está indisponível agora (null = pode). */
  motivo: string | null
}

export interface Replicacao {
  /** Propostas da mesma OSC em outro lote do chamamento. */
  outras: DestinoReplicacao[]
  /** Sem outra proposta da OSC: a explicação (e nenhum comando). */
  aviso: string | null
  /** Desta proposta para a outra; null = não se aplica (sem experiências aqui). */
  enviar: Comando | null
  /** Da outra proposta para esta; null = não há outra proposta. */
  trazer: Comando | null
}

type PropostaResumo = { id: string } & Pick<Proposta, 'loteCodigo' | 'oscCnpj'> & Partial<Pick<Proposta, 'admissibilidade'>>

export const rotuloDoLote = (codigo: string, lotes: Lote[]) => {
  const lote = lotes.find((l) => l.codigo === codigo)
  return lote?.descricao ? `${codigo} — ${lote.descricao}` : codigo
}

const SEM_SESSAO = 'Nenhuma sessão aberta: a cópia entre lotes grava só em sessão aberta.'
const naoAdmitida = (p: PropostaResumo) => ['nao_admitida', 'desclassificada'].includes(p.admissibilidade?.situacao ?? '')

export function replicacaoDisponivel({
  proposta,
  propostas,
  lotes,
  experiencias,
  sessao,
}: {
  proposta: PropostaResumo
  propostas: PropostaResumo[]
  lotes: Lote[]
  /** Quantas experiências esta proposta tem. */
  experiencias: number
  sessao: { lotes?: string[] } | null
}): Replicacao {
  const candidatas = propostas.filter((p) => p.id !== proposta.id && p.oscCnpj === proposta.oscCnpj && p.loteCodigo !== proposta.loteCodigo)
  const outras = candidatas.map((p) => ({ propostaId: p.id, lote: p.loteCodigo, rotuloLote: rotuloDoLote(p.loteCodigo, lotes) }))
  if (outras.length === 0) return { outras, aviso: 'Não há proposta desta OSC em outro lote deste chamamento.', enviar: null, trazer: null }
  const pauta = sessao?.lotes ?? []

  const motivoTrazer = !sessao
    ? SEM_SESSAO
    : !pauta.includes(proposta.loteCodigo)
      ? 'Esta proposta não está na pauta da sessão aberta.'
      : naoAdmitida(proposta)
        ? 'Esta proposta não foi admitida: não segue para avaliação.'
        : null

  let enviar: Comando | null = null
  if (experiencias > 0) {
    const naPauta = candidatas.filter((p) => pauta.includes(p.loteCodigo))
    enviar = {
      motivo: !sessao
        ? SEM_SESSAO
        : naPauta.length === 0
          ? `O lote de destino (${candidatas.map((p) => p.loteCodigo).join(', ')}) não está na pauta da sessão aberta.`
          : naPauta.every(naoAdmitida)
            ? 'A proposta da OSC no outro lote não foi admitida: não segue para avaliação.'
            : null,
    }
  }
  return { outras, aviso: null, enviar, trazer: { motivo: motivoTrazer } }
}
