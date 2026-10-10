// /login (AuthPage): e-mail e senha; "Primeiro acesso ou esqueci minha senha" envia o e-mail do Firebase
// para criar ou redefinir a senha (mesma resposta para e-mail existente ou não).

import { FirebaseError } from 'firebase/app'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { KeyRound, LogIn } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { AuthPage } from '../../components/templates/AuthPage'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/TextField'
import { obterAuth } from '../../lib/firebase'
import { mensagemErroLogin } from './mensagens'
import { enviarEmailDeSenha } from './senha'
import { useUsuario } from './useUsuario'

export function Login() {
  const { carregando, usuario } = useUsuario()
  const navegar = useNavigate()
  const destino = (useLocation().state as { de?: string } | null)?.de ?? '/'
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  if (!carregando && usuario) return <Navigate to={destino} replace />

  async function pedirSenha() {
    setErro(null)
    setAviso(null)
    if (!email.trim()) {
      setErro('Digite o seu e-mail acima e clique de novo.')
      return
    }
    try {
      await enviarEmailDeSenha(email)
      setAviso(`Se ${email.trim()} estiver cadastrado, chegará um e-mail com o link para criar a senha. Veja também o spam.`)
    } catch (e) {
      setErro((e as Error).message)
    }
  }

  async function entrar(evento: FormEvent) {
    evento.preventDefault()
    setErro(null)
    setAviso(null)
    setEnviando(true)
    try {
      await signInWithEmailAndPassword(obterAuth(), email.trim(), senha)
      navegar(destino, { replace: true })
    } catch (e) {
      setErro(mensagemErroLogin(e instanceof FirebaseError ? e.code : undefined))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <AuthPage titulo="Avaliação de Planos de Ação" subtitulo="Chamamento SEDS/GO 2026 — Comissão de Seleção">
      <form onSubmit={entrar} noValidate aria-label="Entrar" className="space-y-4">
        <TextField rotulo="E-mail" type="email" obrigatorio autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField rotulo="Senha" type="password" obrigatorio autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
        {erro && (
          <Alert tom="error" titulo="Não foi possível entrar">
            {erro}
          </Alert>
        )}
        {aviso && (
          <Alert tom="success" titulo="E-mail enviado">
            {aviso}
          </Alert>
        )}
        <Button type="submit" tamanho="lg" icone={LogIn} carregando={enviando} className="w-full">
          Entrar
        </Button>
        <Button variante="tertiary" icone={KeyRound} onClick={() => void pedirSenha()} className="w-full">
          Primeiro acesso ou esqueci minha senha
        </Button>
      </form>
    </AuthPage>
  )
}
