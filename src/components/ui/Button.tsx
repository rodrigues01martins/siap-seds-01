// Botão do DS (§13): primary, secondary, tertiary e destructive; 32/40/48 px (padrão 40); estados default,
// hover, focus (anel global, nunca removido), active, disabled e loading (spinner + aria-busy).
// Carregando: continua focável (aria-disabled) para o foco não se perder, mas não dispara a ação.

import type { LucideIcon } from 'lucide-react'
import { forwardRef, type ButtonHTMLAttributes, type MouseEvent, type ReactNode } from 'react'
import { cx } from './cx'
import { Icone } from './Icone'
import { Spinner } from './Spinner'

export type VarianteBotao = 'primary' | 'secondary' | 'tertiary' | 'destructive'
export type TamanhoBotao = 'sm' | 'md' | 'lg'

export interface PropsBotao extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'> {
  variante?: VarianteBotao
  tamanho?: TamanhoBotao
  carregando?: boolean
  desabilitado?: boolean
  icone?: LucideIcon
  children: ReactNode
}

const VARIANTES: Record<VarianteBotao, string> = {
  primary:
    'bg-button-primary-bg text-button-primary-fg hover:bg-button-primary-bg-hover active:bg-button-primary-bg-active',
  secondary:
    'border border-button-secondary-border bg-button-secondary-bg text-button-secondary-fg hover:bg-button-secondary-bg-hover active:bg-action-subtle-strong',
  tertiary: 'bg-transparent text-button-tertiary-fg hover:bg-button-tertiary-bg-hover active:bg-action-subtle-strong',
  destructive:
    'bg-button-destructive-bg text-button-destructive-fg hover:bg-button-destructive-bg-hover active:bg-button-destructive-bg-active',
}

const TAMANHOS: Record<TamanhoBotao, string> = {
  sm: 'h-(--sds-button-height-sm) px-(--sds-button-padding-x-sm) text-body-sm font-semibold',
  md: 'h-(--sds-button-height-md) px-(--sds-button-padding-x-md) text-label-md',
  lg: 'h-(--sds-button-height-lg) px-(--sds-button-padding-x-lg) text-body-md font-semibold',
}

export const Button = forwardRef<HTMLButtonElement, PropsBotao>(function Button(
  { variante = 'primary', tamanho = 'md', carregando = false, desabilitado = false, icone, type = 'button', className, onClick, children, ...resto },
  ref,
) {
  const bloqueado = carregando || desabilitado
  return (
    <button
      ref={ref}
      type={type}
      disabled={desabilitado}
      aria-disabled={carregando || undefined}
      aria-busy={carregando || undefined}
      onClick={(evento: MouseEvent<HTMLButtonElement>) => {
        if (bloqueado) {
          evento.preventDefault()
          return
        }
        onClick?.(evento)
      }}
      className={cx(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-button whitespace-nowrap',
        'transition-colors duration-fast ease-standard',
        VARIANTES[variante],
        TAMANHOS[tamanho],
        'disabled:cursor-not-allowed disabled:border-transparent disabled:bg-button-disabled-bg disabled:text-button-disabled-fg',
        carregando && 'cursor-progress',
        className,
      )}
      {...resto}
    >
      {carregando ? <Spinner rotulo="Processando" tamanho={tamanho === 'lg' ? 20 : 16} /> : icone && <Icone icone={icone} tamanho={tamanho === 'lg' ? 20 : 16} />}
      {children}
    </button>
  )
})
