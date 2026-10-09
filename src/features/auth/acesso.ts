// Decisão de acesso da rota protegida, separada do React para ser testável.

import type { Perfil } from '../../domain/perfis'

export interface Usuario {
  uid: string
  email: string | null
  /** Custom claim "perfil"; null = autenticado, mas sem acesso. */
  perfil: Perfil | null
}

export interface EstadoUsuario {
  carregando: boolean
  usuario: Usuario | null
}

export type DecisaoAcesso = 'carregando' | 'login' | 'nao-autorizado' | 'liberado'

export function decidirAcesso(estado: EstadoUsuario, perfisPermitidos?: readonly Perfil[]): DecisaoAcesso {
  if (estado.carregando) return 'carregando'
  if (!estado.usuario) return 'login'
  const { perfil } = estado.usuario
  if (!perfil) return 'nao-autorizado'
  if (perfisPermitidos && !perfisPermitidos.includes(perfil)) return 'nao-autorizado'
  return 'liberado'
}
