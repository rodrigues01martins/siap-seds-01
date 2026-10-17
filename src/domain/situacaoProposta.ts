// Situação da proposta nas telas e nos relatórios (Simplificação 2/4): a da avaliação (statusDaProposta),
// sem a homologação. O campo bloqueada de propostas homologadas antes da simplificação é ignorado; a conclusão
// (concluida) é mostrada à parte, com o selo "Concluída".

import { ROTULO_STATUS, statusDaProposta, type PropostaParaStatus, type StatusPainel } from './statusProposta.js'

export type SituacaoProposta = Exclude<StatusPainel, 'homologada'>

export function situacaoDaProposta(proposta: PropostaParaStatus): SituacaoProposta {
  return statusDaProposta({ totais: proposta.totais, admissibilidade: proposta.admissibilidade }) as SituacaoProposta
}

export const ROTULO_SITUACAO: Record<SituacaoProposta, string> = {
  pendente: ROTULO_STATUS.pendente,
  apta: ROTULO_STATUS.apta,
  inapta: ROTULO_STATUS.inapta,
  desclassificada: ROTULO_STATUS.desclassificada,
  nao_admitida: ROTULO_STATUS.nao_admitida,
}
