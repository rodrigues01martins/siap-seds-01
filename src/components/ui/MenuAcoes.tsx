// Menu de ações da linha (padrão "menu button" da WAI-ARIA): botão "⋯" com aria-haspopup="menu"; o menu abre
// com clique, Enter, Espaço ou seta para baixo, com foco no primeiro item. Setas, Home e End movem o foco
// (circular); Enter escolhe; Esc fecha e devolve o foco ao botão; Tab ou clique fora fecham.
// Fica num portal com posição fixa, para não ser cortado pela rolagem horizontal da DataTable.
// Uso: ações secundárias e destrutivas (ex.: "Excluir"), nunca a ação primária da tela.

import { EllipsisVertical, type LucideIcon } from 'lucide-react'
import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { classesBotao } from './Button'
import { cx } from './cx'
import { Icone } from './Icone'

export interface ItemMenuAcoes {
  rotulo: string
  icone?: LucideIcon
  /** Ação que apaga ou desfaz: texto e ícone no tom de erro. */
  destrutivo?: boolean
  onSelecionar: () => void
}

export interface PropsMenuAcoes {
  /** Nome acessível do botão e do menu, com o registro da linha (ex.: "Mais ações — Chamamento 001/2026"). */
  rotulo: string
  itens: ItemMenuAcoes[]
}

export function MenuAcoes({ rotulo, itens }: PropsMenuAcoes) {
  const [aberto, setAberto] = useState(false)
  const [posicao, setPosicao] = useState<{ top: number; right: number } | null>(null)
  const gatilho = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const refsItens = useRef<(HTMLButtonElement | null)[]>([])
  const id = useId()

  const fechar = (devolverFoco: boolean) => {
    setAberto(false)
    if (devolverFoco) gatilho.current?.focus()
  }

  // Posição junto ao botão, alinhada à direita (as ações ficam na última coluna); acompanha rolagem e
  // redimensionamento (fechar ao rolar faria o menu sumir quando o navegador rola o botão para a vista).
  useLayoutEffect(() => {
    if (!aberto) return
    const posicionar = () => {
      const r = gatilho.current?.getBoundingClientRect()
      if (r) setPosicao({ top: r.bottom + 4, right: window.innerWidth - r.right })
    }
    posicionar()
    refsItens.current[0]?.focus({ preventScroll: true })
    window.addEventListener('resize', posicionar)
    window.addEventListener('scroll', posicionar, true)
    return () => {
      window.removeEventListener('resize', posicionar)
      window.removeEventListener('scroll', posicionar, true)
    }
  }, [aberto])

  // Clique fora fecha (sem roubar o foco de quem foi clicado).
  useEffect(() => {
    if (!aberto) return
    const aoClicar = (evento: MouseEvent) => {
      const alvo = evento.target as Node
      if (!menu.current?.contains(alvo) && !gatilho.current?.contains(alvo)) fechar(false)
    }
    document.addEventListener('mousedown', aoClicar)
    return () => document.removeEventListener('mousedown', aoClicar)
  }, [aberto])

  const aoTeclarGatilho = (evento: KeyboardEvent<HTMLButtonElement>) => {
    if (evento.key === 'ArrowDown') {
      evento.preventDefault()
      setAberto(true)
    }
  }

  const aoTeclarMenu = (evento: KeyboardEvent<HTMLDivElement>) => {
    const atual = refsItens.current.findIndex((el) => el === document.activeElement)
    const ultimo = itens.length - 1
    const destino = { ArrowDown: atual >= ultimo ? 0 : atual + 1, ArrowUp: atual <= 0 ? ultimo : atual - 1, Home: 0, End: ultimo }[evento.key]
    if (destino !== undefined) {
      evento.preventDefault()
      refsItens.current[destino]?.focus({ preventScroll: true })
    } else if (evento.key === 'Escape') {
      evento.preventDefault()
      evento.stopPropagation()
      fechar(true)
    } else if (evento.key === 'Tab') {
      evento.preventDefault()
      fechar(true)
    }
  }

  return (
    <>
      <button
        ref={gatilho}
        type="button"
        aria-label={rotulo}
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-controls={aberto ? `${id}-menu` : undefined}
        onClick={() => setAberto((a) => !a)}
        onKeyDown={aoTeclarGatilho}
        className={cx(classesBotao({ variante: 'tertiary', tamanho: 'sm' }), 'w-(--sds-button-height-sm) px-0')}
      >
        <Icone icone={EllipsisVertical} tamanho={16} />
      </button>
      {aberto &&
        createPortal(
          <div
            ref={menu}
            id={`${id}-menu`}
            role="menu"
            aria-label={rotulo}
            onKeyDown={aoTeclarMenu}
            style={posicao ? { top: posicao.top, right: posicao.right } : { visibility: 'hidden' }}
            className="fixed z-30 min-w-44 rounded-card border border-border-default bg-background-surface py-1 shadow-modal"
          >
            {itens.map((item, i) => (
              <button
                key={item.rotulo}
                ref={(el) => {
                  refsItens.current[i] = el
                }}
                type="button"
                role="menuitem"
                tabIndex={-1}
                onClick={() => {
                  fechar(true)
                  item.onSelecionar()
                }}
                className={cx(
                  'flex h-(--sds-button-height-md) w-full items-center gap-2 px-4 text-left text-body-sm font-semibold hover:bg-action-subtle focus-visible:bg-action-subtle',
                  item.destrutivo ? 'text-status-error-text' : 'text-text-primary',
                )}
              >
                {item.icone && <Icone icone={item.icone} tamanho={16} />}
                {item.rotulo}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  )
}
