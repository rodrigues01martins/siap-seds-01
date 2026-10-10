// AppShell (§12): link "Pular para o conteúdo"; header de 64 px (marca, nome do sistema, perfil e sair);
// sidebar de 240 px recolhível para 72 px (desktop, ≥ 1024 px) com a navegação por domínio; em telas
// menores a sidebar vira o botão "Menu" (gaveta). Landmarks: header (banner), nav, main e footer.
// Conteúdo em container de até 1440 px com padding 16/24/32 (celular/tablet/desktop).

import { LogOut, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { useUsuario } from '../../features/auth/useUsuario'
import { Brand } from '../ui/Brand'
import { Button } from '../ui/Button'
import { Drawer } from '../ui/Drawer'
import { Icone } from '../ui/Icone'
import { Badge } from '../ui/StatusBadge'
import { cx } from '../ui/cx'
import { gruposDeNavegacao } from './navegacao'
import { NavegacaoLateral } from './NavegacaoLateral'
import { RodapeInstitucional } from './RodapeInstitucional'
import { useContextoNavegacao } from './useContextoNavegacao'

const CHAVE_RECOLHIDA = 'siap:menu-recolhido'

function lerPreferencia(): boolean {
  try {
    return localStorage.getItem(CHAVE_RECOLHIDA) === 'sim'
  } catch {
    return false
  }
}

export function LinkPularConteudo() {
  return (
    <a
      href="#conteudo"
      className="sr-only rounded-button bg-button-primary-bg px-4 py-2 text-label-md text-button-primary-fg focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50"
    >
      Pular para o conteúdo
    </a>
  )
}

export function AppShell() {
  const { usuario, sair } = useUsuario()
  const grupos = gruposDeNavegacao(usuario?.acesso ?? null, useContextoNavegacao())
  const [recolhida, setRecolhida] = useState(lerPreferencia)
  const [menuAberto, setMenuAberto] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => setMenuAberto(false), [pathname])

  const alternar = () => {
    setRecolhida((atual) => {
      try {
        localStorage.setItem(CHAVE_RECOLHIDA, atual ? 'nao' : 'sim')
      } catch {
        /* sem armazenamento local: só vale nesta página */
      }
      return !atual
    })
  }

  return (
    <div className="flex min-h-screen flex-col bg-background-default text-text-primary">
      <LinkPularConteudo />
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border-default bg-background-surface px-4 md:px-6">
        <Button
          variante="tertiary"
          tamanho="md"
          icone={Menu}
          className="lg:hidden"
          aria-expanded={menuAberto}
          aria-controls="menu-movel"
          onClick={() => setMenuAberto(true)}
        >
          Menu
        </Button>
        <Link to="/" className="shrink-0 rounded-input" aria-label="Início — Avaliação de Planos de Ação">
          <Brand variante="light" />
        </Link>
        <span aria-hidden="true" className="hidden h-8 w-px bg-border-default md:block" />
        <p className="hidden min-w-0 md:block">
          <span className="block truncate text-label-md text-text-primary">Avaliação de Planos de Ação</span>
          <span className="block truncate text-caption text-text-muted">Chamamento SEDS/GO 2026 — Comissão de Seleção</span>
        </p>
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="max-w-56 truncate text-body-sm text-text-primary">{usuario?.nome ?? usuario?.email}</p>
            <Badge tom={usuario?.acesso?.admin ? 'info' : 'neutral'}>{usuario?.acesso?.admin ? 'Administrador' : 'Usuário'}</Badge>
          </div>
          <Button variante="secondary" tamanho="sm" icone={LogOut} onClick={() => void sair()}>
            Sair
          </Button>
        </div>
      </header>

      <div className="flex flex-1">
        <aside
          className={cx(
            'sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 flex-col bg-sidebar-bg text-sidebar-fg transition-[width] duration-moderate ease-standard lg:flex',
            recolhida ? 'w-(--sds-sidebar-width-collapsed)' : 'w-(--sds-sidebar-width)',
          )}
        >
          <NavegacaoLateral id="menu-principal" grupos={grupos} recolhida={recolhida} />
          <button
            type="button"
            onClick={alternar}
            aria-expanded={!recolhida}
            aria-controls="menu-principal"
            title={recolhida ? 'Expandir menu' : 'Recolher menu'}
            className={cx(
              'flex h-12 items-center gap-3 border-t border-sidebar-item-bg-hover px-5 text-body-sm text-sidebar-fg hover:bg-sidebar-item-bg-hover focus-visible:outline-focus-ring-inverse',
              recolhida && 'justify-center px-0',
            )}
          >
            <Icone icone={recolhida ? PanelLeftOpen : PanelLeftClose} tamanho={20} />
            <span className={cx(recolhida && 'sr-only')}>{recolhida ? 'Expandir menu' : 'Recolher menu'}</span>
          </button>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <main id="conteudo" tabIndex={-1} className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 focus:outline-none md:px-6 xl:px-8">
            <Outlet />
          </main>
          <RodapeInstitucional />
        </div>
      </div>

      <Drawer aberto={menuAberto} lado="esquerda" titulo="Menu" onFechar={() => setMenuAberto(false)}>
        <div id="menu-movel">
          <NavegacaoLateral id="menu-movel-nav" grupos={grupos} tema="claro" />
        </div>
      </Drawer>
    </div>
  )
}
