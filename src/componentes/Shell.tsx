// Layout das telas logadas: menu lateral conforme o acesso, cabeçalho com o usuário e sair.

import { NavLink, Outlet } from 'react-router'
import { useUsuario } from '../features/auth/useUsuario'
import { itensDoMenu } from './menu'

export function Shell() {
  const { usuario, sair } = useUsuario()
  const itens = itensDoMenu(usuario?.acesso ?? null)

  return (
    <div className="min-h-screen bg-background-default text-slate-900 md:flex">
      <aside className="bg-slate-900 px-4 py-4 text-slate-100 md:w-56 md:shrink-0">
        <p className="font-semibold">SIAP · SEDS/GO</p>
        <p className="text-xs text-slate-400">Chamamento 2026</p>
        <nav aria-label="Menu principal" className="mt-4">
          <ul className="flex gap-2 md:flex-col md:gap-1">
            {itens.map((item) => (
              <li key={item.caminho}>
                <NavLink
                  to={item.caminho}
                  end={item.caminho === '/'}
                  className={({ isActive }) =>
                    `block rounded-md px-3 py-2 text-sm ${isActive ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-800'}`
                  }
                >
                  {item.rotulo}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-6 py-3">
          <span className="text-sm text-slate-600">Avaliação de Planos de Ação — Comissão de Seleção</span>
          <div className="flex items-center gap-3 text-sm">
            <span>
              {usuario?.nome ?? usuario?.email} ·{' '}
              <strong>{usuario?.acesso?.admin ? 'Administrador' : 'Usuário'}</strong>
            </span>
            <button
              type="button"
              onClick={() => sair()}
              className="rounded-md border border-slate-300 px-3 py-1 hover:bg-slate-50"
            >
              Sair
            </button>
          </div>
        </header>
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
