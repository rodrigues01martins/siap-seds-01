// Diálogo modal (§11: raio 12, elevação 3): título, descrição, conteúdo e rodapé de ações.
// Foco preso, Esc e clique no fundo fecham, foco volta a quem abriu (useFocoPreso).

import { X } from 'lucide-react'
import { useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cx } from './cx'
import { Icone } from './Icone'
import { useFocoPreso } from './useFocoPreso'

export interface PropsDialog {
  aberto: boolean
  titulo: string
  descricao?: ReactNode
  onFechar: () => void
  children?: ReactNode
  rodape?: ReactNode
  /** alertdialog para confirmações (ConfirmDialog). */
  papel?: 'dialog' | 'alertdialog'
  largura?: 'sm' | 'md' | 'lg'
}

const LARGURAS = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-3xl' }

export function Dialog({ aberto, titulo, descricao, onFechar, children, rodape, papel = 'dialog', largura = 'md' }: PropsDialog) {
  const ref = useRef<HTMLDivElement>(null)
  const id = useId()
  const aoTeclar = useFocoPreso(aberto, ref, onFechar)
  if (!aberto) return null
  return createPortal(
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div data-testid="overlay" aria-hidden="true" className="absolute inset-0 bg-overlay" onClick={onFechar} />
      <div
        ref={ref}
        role={papel}
        aria-modal="true"
        aria-labelledby={`${id}-titulo`}
        aria-describedby={descricao ? `${id}-descricao` : undefined}
        onKeyDown={aoTeclar}
        tabIndex={-1}
        className={cx('relative flex max-h-[calc(100vh-2rem)] w-full flex-col rounded-modal bg-background-surface shadow-modal', LARGURAS[largura])}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-6">
          <h2 id={`${id}-titulo`} className="text-heading-3 text-text-primary">
            {titulo}
          </h2>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="-mt-1 -mr-2 h-10 w-10 shrink-0 rounded-button text-text-secondary hover:bg-action-subtle">
            <Icone icone={X} tamanho={20} className="mx-auto" />
          </button>
        </div>
        {descricao && (
          <div id={`${id}-descricao`} className="px-6 pt-2 text-body-md text-text-secondary">
            {descricao}
          </div>
        )}
        <div data-conteudo className="overflow-y-auto px-6 py-4 text-body-md text-text-primary">
          {children}
        </div>
        {rodape && <div className="flex flex-wrap justify-end gap-3 border-t border-border-default px-6 py-4">{rodape}</div>}
      </div>
    </div>,
    document.body,
  )
}
