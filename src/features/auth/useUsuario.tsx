// Sessão do usuário: login (Firebase Auth) + cadastro em usuarios/{uid}, ouvido em tempo real.
// Quando o administrador libera ou retira uma permissão, a tela muda sozinha (sem sair e entrar).
// Conta sem acesso (sem cadastro ou cadastro antigo): pede uma vez ao servidor (PUT /api/usuarios), que só
// dá acesso a um administrador inicial (api/_lib/adminsIniciais.ts) enquanto o projeto não tiver administrador.

import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { lerAcesso, podeLer } from '../../domain/permissoes'
import { chamarApi } from '../../lib/api'
import { obterAuth, obterDb } from '../../lib/firebase'
import type { EstadoUsuario } from './acesso'

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
      atualizar({ carregando: true, usuario: null })
      const base = { uid: user.uid, email: user.email, nome: user.displayName }
      let pediuPrimeiroAcesso = false

      pararCadastro = onSnapshot(
        doc(obterDb(), 'usuarios', user.uid),
        (documento) => {
          const dados = documento.data()
          const acesso = lerAcesso(dados)
          if (!podeLer(acesso) && !pediuPrimeiroAcesso) {
            // Continua "carregando" até o servidor responder; se criar o cadastro, este listener dispara de novo.
            pediuPrimeiroAcesso = true
            chamarApi('/api/usuarios', { metodo: 'PUT' }).catch(() =>
              atualizar({ carregando: false, usuario: { ...base, acesso } }),
            )
            return
          }
          const nome = typeof dados?.nome === 'string' ? dados.nome : base.nome
          atualizar({ carregando: false, usuario: { ...base, nome, acesso } })
        },
        () => atualizar({ carregando: false, usuario: { ...base, acesso: null } }),
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
