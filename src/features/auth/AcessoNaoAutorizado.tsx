import { useState } from 'react'
import { useUsuario } from './useUsuario'

export function AcessoNaoAutorizado() {
  const { usuario, sair, recarregarPerfil } = useUsuario()
  const [verificando, setVerificando] = useState(false)

  async function verificarNovamente() {
    setVerificando(true)
    try {
      await recarregarPerfil()
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
    </main>
  )
}
