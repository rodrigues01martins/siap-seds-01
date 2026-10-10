import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import type { Exigencia } from '../../domain/permissoes'
import { decidirAcesso } from './acesso'
import { AcessoNaoAutorizado } from './AcessoNaoAutorizado'
import { useUsuario } from './useUsuario'

interface Props {
  children: ReactNode
  /** Permissão (ou 'admin') exigida pela rota; sem ela, basta ter acesso ao app. */
  exige?: Exigencia
}

export function RotaProtegida({ children, exige }: Props) {
  const usuario = useUsuario()
  const local = useLocation()

  switch (decidirAcesso(usuario, exige)) {
    case 'carregando':
      return <p role="status" className="p-8 text-body-md text-text-secondary">Carregando…</p>
    case 'login':
      return <Navigate to="/login" replace state={{ de: local.pathname }} />
    case 'nao-autorizado':
      return <AcessoNaoAutorizado />
    case 'liberado':
      return children
  }
}
