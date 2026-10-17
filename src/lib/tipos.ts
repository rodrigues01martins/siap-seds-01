// Formato dos documentos lidos do Firestore pelas telas (gravados pela /api).

import type { StatusD1 } from '../domain/d1'
import type { PapelSessao } from '../domain/comissao'
import type { Perfil } from '../domain/permissoes'

export interface Lote {
  codigo: string
  descricao: string
}

export interface Chamamento {
  numero: string
  titulo: string
  processoSei?: string
  dataLimitePropostas?: string
  justificativaMinima?: number
  lotes: Lote[]
  /** "excluindo": exclusão registrada pela /api e ainda não concluída. */
  status?: 'excluindo'
}

export interface Osc {
  cnpj: string
  razaoSocial: string
  nomeFantasia?: string
  status?: 'excluindo'
}

export interface Proposta {
  loteCodigo: string
  oscCnpj: string
  protocolo?: string
  numeroSEI?: string
  observacao?: string
  bloqueada?: boolean
  totais?: { status?: StatusD1; d1?: number; d2?: number; nf?: number }
  admissibilidade?: { situacao?: 'admitida' | 'nao_admitida' | 'desclassificada' }
  status?: 'excluindo'
}

/** Quem está presente na sessão: só o nome e o papel (sem login). */
export interface PresenteSessao {
  nome: string
  papel: PapelSessao
}

/** Reset da sessão (presidente): quem, quando e por quê. */
export interface ResetSessao {
  por: { uid: string; email: string | null }
  em: { toDate(): Date }
  motivo: string
}

export interface Sessao {
  data: string
  /** reiniciando: reset em andamento (ou interrompido); reiniciada: registros desconsiderados (sem novos registros). */
  status: 'aberta' | 'encerrada' | 'reiniciando' | 'reiniciada'
  reiniciadaPor?: { uid: string; email: string | null }
  reiniciadaEm?: { toDate(): Date }
  motivo?: string
  resets?: number
  historicoResets?: ResetSessao[]
  /** Lote(s) em pauta: as propostas desses lotes são as analisadas na sessão. */
  lotes: string[]
  presentes: PresenteSessao[]
  /** O que o telão mostra; dados anteriores à Etapa 5 não têm `tipo` (= subcritério). */
  foco: { tipo?: 'admissibilidade' | 'subcriterio' | 'd2' | 'resumo'; propostaId: string; subcriterio?: string } | null
  abertaPor?: { uid: string; email: string | null }
}

export interface Avaliacao {
  nivel: number
  justificativa: string
  paginas: number[]
  decisao: 'unanimidade' | 'maioria'
  votoDivergente?: string
  sessaoId: string
}

/** Cadastro em usuarios/{uid} (tela Usuários, /api/usuarios). */
export interface UsuarioCadastro {
  email: string
  nome?: string
  /** admin ou presidente; ausente ou outro valor = cadastro do modelo anterior, sem acesso. */
  perfil?: Perfil | string | null
  /** Só no cadastro do modelo anterior (o administrador antigo continua admin). */
  admin?: boolean
  ativo?: boolean
}
