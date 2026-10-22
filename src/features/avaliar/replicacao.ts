// "Replicar para outro lote" na aba D2: para onde a proposta pode replicar (a proposta da mesma OSC em outro lote do
// chamamento) e, quando não pode, por quê — as mesmas condições que a /api confere (experiências na origem, sessão
// aberta com o lote de destino em pauta, destino admitido). A /api repete tudo na confirmação.

import type { Lote, Proposta } from '../../lib/tipos'

export interface DestinoReplicacao {
  propostaId: string
  lote: string
  /** Ex.: "L2 — Lote II". */
  rotuloLote: string
}

export interface Replicacao {
  destinos: DestinoReplicacao[]
  /** Por que não dá para replicar agora (null = pode). */
  motivo: string | null
}

type PropostaResumo = { id: string } & Pick<Proposta, 'loteCodigo' | 'oscCnpj'> & Partial<Pick<Proposta, 'admissibilidade'>>

export const rotuloDoLote = (codigo: string, lotes: Lote[]) => {
  const lote = lotes.find((l) => l.codigo === codigo)
  return lote?.descricao ? `${codigo} — ${lote.descricao}` : codigo
}

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
  experiencias: number
  sessao: { lotes?: string[] } | null
}): Replicacao {
  const candidatas = propostas.filter((p) => p.id !== proposta.id && p.oscCnpj === proposta.oscCnpj && p.loteCodigo !== proposta.loteCodigo)
  const destinos = candidatas.map((p) => ({ propostaId: p.id, lote: p.loteCodigo, rotuloLote: rotuloDoLote(p.loteCodigo, lotes) }))
  if (destinos.length === 0) return { destinos, motivo: 'Não há proposta desta OSC em outro lote deste chamamento.' }
  if (experiencias === 0) return { destinos, motivo: 'Cadastre experiências nesta proposta para replicá-las.' }
  if (!sessao) return { destinos, motivo: 'Nenhuma sessão aberta: a replicação grava no outro lote só em sessão aberta.' }
  const naPauta = candidatas.filter((p) => (sessao.lotes ?? []).includes(p.loteCodigo))
  if (naPauta.length === 0) {
    return { destinos, motivo: `O lote de destino (${candidatas.map((p) => p.loteCodigo).join(', ')}) não está na pauta da sessão aberta.` }
  }
  const admitidas = naPauta.filter((p) => !['nao_admitida', 'desclassificada'].includes(p.admissibilidade?.situacao ?? ''))
  if (admitidas.length === 0) return { destinos, motivo: 'A proposta da OSC no outro lote não foi admitida: não segue para avaliação.' }
  return { destinos, motivo: null }
}
