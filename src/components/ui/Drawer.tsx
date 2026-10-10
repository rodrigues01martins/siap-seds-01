// Painel lateral modal (ex.: Gerenciar usuário; menu em telas pequenas): mesmas regras de foco do Dialog.

import { X } from 'lucide-react'
import { useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cx } from './cx'
import { Icone } from './Icone'
import { useFocoPreso } from './useFocoPreso'

export interface PropsDrawer {
  aberto: boolean
  titulo: string
  descricao?: ReactNode
  onFechar: () => void
  children?: ReactNode
  rodape?: ReactNode
  /** Lado de onde o painel entra (esquerda: menu de navegação em telas pequenas). */
  lado?: 'direita' | 'esquerda'
  /** Largura máxima: md (448 px, padrão) ou lg (672 px, formulários com mais campos). */
  largura?: 'md' | 'lg'
}

export function Drawer({ aberto, titulo, descricao, onFechar, children, rodape, lado = 'direita', largura = 'md' }: PropsDrawer) {
  const ref = useRef<HTMLDivElement>(null)
  const id = useId()
  const aoTeclar = useFocoPreso(aberto, ref, onFechar)
  if (!aberto) return null
  return createPortal(
    <div className="fixed inset-0 z-40 flex">
      <div data-testid="overlay" aria-hidden="true" className="absolute inset-0 bg-overlay" onClick={onFechar} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-titulo`}
        aria-describedby={descricao ? `${id}-descricao` : undefined}
        onKeyDown={aoTeclar}
        tabIndex={-1}
        className={cx('relative flex h-full w-full flex-col bg-background-surface shadow-modal', largura === 'lg' ? 'max-w-2xl' : 'max-w-md', lado === 'esquerda' ? 'mr-auto' : 'ml-auto')}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border-default px-6 py-4">
          <div>
            <h2 id={`${id}-titulo`} className="text-heading-3 text-text-primary">
              {titulo}
            </h2>
            {descricao && (
              <div id={`${id}-descricao`} className="mt-1 text-body-sm text-text-secondary">
                {descricao}
              </div>
            )}
          </div>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="-mr-2 h-10 w-10 shrink-0 rounded-button text-text-secondary hover:bg-action-subtle">
            <Icone icone={X} tamanho={20} className="mx-auto" />
          </button>
        </div>
        <div data-conteudo className="flex-1 overflow-y-auto px-6 py-4">
          {children}
        </div>
        {rodape && <div className="flex flex-wrap justify-end gap-3 border-t border-border-default px-6 py-4">{rodape}</div>}
      </div>
    </div>,
    document.body,
  )
}
