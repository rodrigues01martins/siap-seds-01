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
  /** Concluída (ação reversível): relatórios saem como finais; alterar a avaliação desfaz a conclusão. */
  concluida?: boolean
  totais?: { status?: StatusD1; d1?: number; d2?: number; nf?: number }
  admissibilidade?: AdmissibilidadeGravada
  atualizadoPor?: AtualizadoPor
}

/** Quem gravou o documento por último (sem auditoria detalhada). */
export interface AtualizadoPor {
  nome: string | null
  email: string | null
}

/** Página inicial/final de um PA, com limite, página de corte e excedente (Anexo III, 7.1). */
export interface PlanoAdmissibilidadeGravado {
  codigo: string
  paginaInicial: number | null
  paginaFinal: number | null
  limite: number
  paginas: number | null
  paginaCorte: number | null
  excede: number
}

/** Admissibilidade simplificada: admitida (sim/não), motivo e páginas por PA. */
export interface AdmissibilidadeGravada {
  admitida?: boolean
  motivo?: string
  planos?: PlanoAdmissibilidadeGravado[]
  /** desclassificada só em registros anteriores à Simplificação 2/4. */
  situacao?: 'admitida' | 'nao_admitida' | 'desclassificada'
  sessaoId?: string
}

/** Quem está presente na sessão: só o nome e o papel (sem login). */
export interface PresenteSessao {
  nome: string
  papel: PapelSessao
}

export interface Sessao {
  data: string
  status: 'aberta' | 'encerrada'
  /** Lote(s) em pauta: as propostas desses lotes são as analisadas na sessão. */
  lotes: string[]
  presentes: PresenteSessao[]
  /** O que o telão mostra; dados anteriores à Etapa 5 não têm `tipo` (= subcritério). */
  foco: { tipo?: 'admissibilidade' | 'subcriterio' | 'd2' | 'resumo'; propostaId: string; subcriterio?: string } | null
}

export interface Avaliacao {
  nivel: number
  justificativa: string
  paginas: number[]
  sessaoId: string
  atualizadoPor?: AtualizadoPor
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
