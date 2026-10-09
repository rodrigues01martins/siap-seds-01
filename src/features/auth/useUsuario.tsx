// Sessão do usuário: um único listener do Firebase Auth compartilhado via contexto.
// O perfil vem do custom claim "perfil" do ID token (definido por scripts/set-role.ts).

import { onIdTokenChanged, signOut } from 'firebase/auth'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { extrairPerfil } from '../../domain/perfis'
import { obterAuth } from '../../lib/firebase'
import type { EstadoUsuario } from './acesso'

interface ValorUsuario extends EstadoUsuario {
  sair: () => Promise<void>
  /** Força a renovação do ID token para ler um perfil recém-atribuído. */
  recarregarPerfil: () => Promise<void>
}

const ContextoUsuario = createContext<ValorUsuario | null>(null)

export function UsuarioProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoUsuario>({ carregando: true, usuario: null })

  useEffect(() => {
    const auth = obterAuth()
    let ativo = true
    // onIdTokenChanged também dispara quando o token é renovado (ex.: recarregarPerfil).
    const cancelar = onIdTokenChanged(auth, async (user) => {
      if (!user) {
        if (ativo) setEstado({ carregando: false, usuario: null })
        return
      }
      let perfil = null
      try {
        perfil = extrairPerfil((await user.getIdTokenResult()).claims)
      } catch {
        perfil = null // sem token legível não há acesso
      }
      if (ativo) setEstado({ carregando: false, usuario: { uid: user.uid, email: user.email, perfil } })
    })
    return () => {
      ativo = false
      cancelar()
    }
  }, [])

  const valor = useMemo<ValorUsuario>(
    () => ({
      ...estado,
      sair: () => signOut(obterAuth()),
      recarregarPerfil: async () => {
        await obterAuth().currentUser?.getIdToken(true)
      },
    }),
    [estado],
  )

  return <ContextoUsuario.Provider value={valor}>{children}</ContextoUsuario.Provider>
}

export function useUsuario(): ValorUsuario {
  const valor = useContext(ContextoUsuario)
  if (!valor) throw new Error('useUsuario() precisa estar dentro de <UsuarioProvider>')
  return valor
}
