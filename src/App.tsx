import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { Login } from './features/auth/Login'
import { RotaProtegida } from './features/auth/RotaProtegida'
import { UsuarioProvider, useUsuario } from './features/auth/useUsuario'

function Inicio() {
  const { usuario, sair } = useUsuario()
  return (
    <main className="min-h-screen bg-slate-50 p-8 text-slate-900">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Avaliação de Planos de Ação — SEDS/GO 2026</h1>
        <button type="button" onClick={() => sair()} className="rounded-md border border-slate-300 px-3 py-1.5">
          Sair
        </button>
      </header>
      <p className="mt-4 text-slate-600">
        {usuario?.email} — perfil <strong>{usuario?.perfil}</strong>
      </p>
      <p className="mt-2 text-slate-500">As telas de avaliação chegam nas próximas etapas.</p>
    </main>
  )
}

export default function App() {
  return (
    <UsuarioProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <RotaProtegida>
                <Inicio />
              </RotaProtegida>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </UsuarioProvider>
  )
}
