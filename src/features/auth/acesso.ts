// Decisão de acesso da rota protegida, separada do React para ser testável.

import { podeFazer, podeLer, type Acesso, type Exigencia } from '../../domain/permissoes'

export interface Usuario {
  uid: string
  email: string | null
  nome: string | null
  /** Cadastro em usuarios/{uid}; null = autenticado, mas sem cadastro (sem acesso). */
  acesso: Acesso | null
}

export interface EstadoUsuario {
  carregando: boolean
  usuario: Usuario | null
}

export type DecisaoAcesso = 'carregando' | 'login' | 'nao-autorizado' | 'liberado'

/** Sem `exigencia`: basta entrar no app (podeLer). Com ela: a permissão ou ser administrador. */
export function decidirAcesso(estado: EstadoUsuario, exigencia?: Exigencia): DecisaoAcesso {
  if (estado.carregando) return 'carregando'
  if (!estado.usuario) return 'login'
  const { acesso } = estado.usuario
  if (!podeLer(acesso)) return 'nao-autorizado'
  if (exigencia && !podeFazer(acesso, exigencia)) return 'nao-autorizado'
  return 'liberado'
}
