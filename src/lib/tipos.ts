// Formato dos documentos lidos do Firestore pelas telas (gravados pela /api).

import type { StatusD1 } from '../domain/d1'
import type { Perfil } from '../domain/perfis'

export interface Lote {
  codigo: string
  descricao: string
}

export interface Chamamento {
  numero: string
  titulo: string
  processoSei?: string
  dataLimitePropostas?: string
  indiceCorrecao?: string
  dataBaseCorrecao?: string
  justificativaMinima?: number
  lotes: Lote[]
}

export interface Osc {
  cnpj: string
  razaoSocial: string
  nomeFantasia?: string
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
}

export interface PresenteSessao {
  uid: string
  email: string | null
  perfil: Perfil
}

export interface DeclaracaoSessao {
  uid: string
  semImpedimento: boolean
  motivo?: string
}

export interface Sessao {
  data: string
  status: 'aberta' | 'encerrada'
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

export interface UsuarioCadastro {
  email: string
  perfil: Perfil | null
}
