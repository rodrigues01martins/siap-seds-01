import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import type { Perfil } from '../../domain/perfis'
import { decidirAcesso } from './acesso'
import { AcessoNaoAutorizado } from './AcessoNaoAutorizado'
import { useUsuario } from './useUsuario'

interface Props {
  children: ReactNode
  /** Restringe a rota a alguns perfis; sem a lista, qualquer perfil válido entra. */
  perfis?: readonly Perfil[]
}

export function RotaProtegida({ children, perfis }: Props) {
  const usuario = useUsuario()
  const local = useLocation()

  switch (decidirAcesso(usuario, perfis)) {
    case 'carregando':
      return <p className="p-8 text-slate-600">Carregando…</p>
    case 'login':
      return <Navigate to="/login" replace state={{ de: local.pathname }} />
    case 'nao-autorizado':
      return <AcessoNaoAutorizado />
    case 'liberado':
      return children
  }
}
