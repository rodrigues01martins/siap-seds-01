// Sessão do usuário: login (Firebase Auth) + cadastro em usuarios/{uid}, ouvido em tempo real.
// Quando o administrador libera ou retira uma permissão, a tela muda sozinha (sem sair e entrar).
// A leitura do cadastro (e o primeiro acesso do administrador inicial) fica em ./cadastro.ts, com limite de
// tempo: a tela nunca fica em "Carregando…" para sempre.

import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDocFromServer, onSnapshot } from 'firebase/firestore'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { chamarApi } from '../../lib/api'
import { obterAuth, obterDb } from '../../lib/firebase'
import type { EstadoUsuario } from './acesso'
import { acompanharCadastro } from './cadastro'

interface ValorUsuario extends EstadoUsuario {
  sair: () => Promise<void>
}

const ContextoUsuario = createContext<ValorUsuario | null>(null)

export function UsuarioProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoUsuario>({ carregando: true, usuario: null })

  useEffect(() => {
    let ativo = true
    let pararCadastro: (() => void) | null = null
    const atualizar = (novo: EstadoUsuario) => {
      if (ativo) setEstado(novo)
    }

    const pararLogin = onAuthStateChanged(obterAuth(), (user) => {
      pararCadastro?.()
      pararCadastro = null
      if (!user) {
        atualizar({ carregando: false, usuario: null })
        return
      }
      const referencia = doc(obterDb(), 'usuarios', user.uid)
      pararCadastro = acompanharCadastro(
        {
          ouvir: (aoReceber, aoFalhar) => onSnapshot(referencia, (d) => aoReceber(d.data()), aoFalhar),
          pedirPrimeiroAcesso: async () => {
            await chamarApi('/api/usuarios', { metodo: 'PUT' })
          },
          lerDoServidor: async () => (await getDocFromServer(referencia)).data(),
        },
        (cadastro) => {
          if (cadastro.carregando) return atualizar({ carregando: true, usuario: null })
          atualizar({
            carregando: false,
            usuario: {
              uid: user.uid,
              email: user.email,
              nome: cadastro.nome ?? user.displayName,
              acesso: cadastro.acesso,
              erro: cadastro.erro,
            },
          })
        },
      )
    })

    return () => {
      ativo = false
      pararLogin()
      pararCadastro?.()
    }
  }, [])

  const valor = useMemo<ValorUsuario>(() => ({ ...estado, sair: () => signOut(obterAuth()) }), [estado])

  return <ContextoUsuario.Provider value={valor}>{children}</ContextoUsuario.Provider>
}

export function useUsuario(): ValorUsuario {
  const valor = useContext(ContextoUsuario)
  if (!valor) throw new Error('useUsuario() precisa estar dentro de <UsuarioProvider>')
  return valor
}
