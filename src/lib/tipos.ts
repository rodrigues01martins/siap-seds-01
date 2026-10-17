// Formato dos documentos lidos do Firestore pelas telas (gravados pela /api).

import type { StatusD1 } from '../domain/d1'
import type { PapelComissao } from '../domain/comissao'
import type { Permissao } from '../domain/permissoes'

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

export interface PresenteSessao {
  uid: string
  email: string | null
  /** Papel na Comissão no momento da sessão. */
  perfil: PapelComissao
}

export interface DeclaracaoSessao {
  uid: string
  semImpedimento: boolean
  motivo?: string
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
  pauta: string[]
  presentes: PresenteSessao[]
  declaracoes: DeclaracaoSessao[]
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
  admin?: boolean
  ativo?: boolean
  permissoes?: Permissao[]
  comissao?: PapelComissao | null
}
