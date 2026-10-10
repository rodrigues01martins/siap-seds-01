// Lista de navegação por domínio. Tema "sidebar" (fundo teal, desktop) ou "claro" (gaveta do menu em telas
// pequenas). Item atual: aria-current="page", fundo de selecionado e marcador amarelo (nunca só cor: há o
// marcador e o peso do texto). Recolhida: só ícones, com o nome acessível e o title preservados.

import { NavLink } from 'react-router'
import { Icone } from '../ui/Icone'
import { cx } from '../ui/cx'
import type { GrupoNavegacao } from './navegacao'

export function NavegacaoLateral({
  grupos,
  tema = 'sidebar',
  recolhida = false,
  id,
}: {
  grupos: GrupoNavegacao[]
  tema?: 'sidebar' | 'claro'
  recolhida?: boolean
  id?: string
}) {
  const sidebar = tema === 'sidebar'
  return (
    <nav id={id} aria-label="Menu principal" className="flex-1 overflow-y-auto py-4">
      {grupos.map((grupo) => (
        <div key={grupo.id} className="mb-4 last:mb-0">
          <p
            id={`${id ?? 'nav'}-${grupo.id}`}
            className={cx(
              'px-4 pb-1 text-caption font-semibold tracking-wide uppercase',
              recolhida && 'sr-only',
              sidebar ? 'text-sidebar-fg-muted' : 'text-text-secondary',
            )}
          >
            {grupo.rotulo}
          </p>
          <ul aria-labelledby={`${id ?? 'nav'}-${grupo.id}`} className="space-y-0.5 px-2">
            {grupo.itens.map((item) => (
              <li key={item.caminho}>
                <NavLink
                  to={item.caminho}
                  end={item.exato}
                  title={recolhida ? item.rotulo : undefined}
                  className={({ isActive }) =>
                    cx(
                      'relative flex min-h-10 items-center gap-3 rounded-button px-3 py-2 text-body-sm transition-colors duration-fast ease-standard',
                      recolhida && 'justify-center px-0',
                      sidebar
                        ? cx('focus-visible:outline-focus-ring-inverse', isActive ? 'bg-sidebar-item-bg-active font-semibold text-sidebar-item-fg-active' : 'text-sidebar-fg hover:bg-sidebar-item-bg-hover')
                        : isActive
                          ? 'bg-action-subtle-strong font-semibold text-text-link'
                          : 'text-text-primary hover:bg-action-subtle',
                      isActive &&
                        cx(
                          'before:absolute before:inset-y-1.5 before:left-0 before:w-1 before:rounded-badge',
                          sidebar ? 'before:bg-sidebar-item-indicator' : 'before:bg-action-primary',
                        ),
                    )
                  }
                >
                  <Icone icone={item.icone} tamanho={20} className="shrink-0" />
                  <span className={cx(recolhida && 'sr-only')}>{item.rotulo}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}
