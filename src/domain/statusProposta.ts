// Status exibido no painel do chamamento: o da avaliação (totais gravados pelo servidor, C4),
// com "homologada" prevalecendo (C5).

import type { StatusD1 } from './d1.js'

export type StatusPainel = StatusD1 | 'homologada'

export const ROTULO_STATUS: Record<StatusPainel, string> = {
  pendente: 'Pendente',
  apta: 'Apta',
  inapta: 'Inapta',
  desclassificada: 'Desclassificada',
  homologada: 'Homologada',
}

const STATUS_AVALIACAO: readonly string[] = ['pendente', 'apta', 'inapta', 'desclassificada']

export interface PropostaParaStatus {
  bloqueada?: boolean
  totais?: { status?: string }
}

export function statusDaProposta(proposta: PropostaParaStatus): StatusPainel {
  if (proposta.bloqueada === true) return 'homologada'
  const status = proposta.totais?.status
  return status && STATUS_AVALIACAO.includes(status) ? (status as StatusD1) : 'pendente'
}
