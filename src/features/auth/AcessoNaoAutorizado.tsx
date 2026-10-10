import { useState } from 'react'
import { AlertaErro } from '../../componentes/AlertaErro'
import { chamarApi } from '../../lib/api'
import { useUsuario } from './useUsuario'

export function AcessoNaoAutorizado() {
  const { usuario, sair, recarregarPerfil } = useUsuario()
  const [verificando, setVerificando] = useState(false)
  const [erro, setErro] = useState<unknown>(null)

  async function verificarNovamente() {
    setVerificando(true)
    try {
      await recarregarPerfil()
    } finally {
      setVerificando(false)
    }
  }

  /** Primeiro acesso do sistema: vira admin se for a conta de ADMIN_INICIAL_EMAIL e não houver admin. */
  async function tornarPrimeiroAdmin() {
    setErro(null)
    setVerificando(true)
    try {
      await chamarApi('/api/primeiro-admin', { metodo: 'POST' })
      await recarregarPerfil()
    } catch (e) {
      setErro(e)
    } finally {
      setVerificando(false)
    }
  }

  return (
    <main className="mx-auto mt-24 max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-xl font-semibold text-slate-900">Acesso não autorizado</h1>
      <p className="mt-3 text-slate-600">
        A conta <strong>{usuario?.email}</strong> não tem perfil para acessar esta área. Solicite ao administrador
        a atribuição de um perfil.
      </p>
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={verificarNovamente}
          disabled={verificando}
          className="rounded-md bg-slate-900 px-4 py-2 text-white disabled:opacity-60"
        >
          {verificando ? 'Verificando…' : 'Verificar novamente'}
        </button>
        <button type="button" onClick={() => sair()} className="rounded-md border border-slate-300 px-4 py-2">
          Sair
        </button>
      </div>
      <div className="mt-6 border-t border-slate-200 pt-4 text-sm text-slate-600">
        <p>Primeira instalação, ainda sem nenhum administrador?</p>
        <button
          type="button"
          onClick={tornarPrimeiroAdmin}
          disabled={verificando}
          className="mt-2 rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-800 disabled:opacity-60"
        >
          Sou o administrador inicial
        </button>
        <div className="mt-3">
          <AlertaErro erro={erro} />
        </div>
      </div>
    </main>
  )
}
