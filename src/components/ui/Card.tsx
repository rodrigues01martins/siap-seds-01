// Card (§13): fundo branco, raio 12, padding 24, borda 1 px. Com título, vira uma região nomeada
// (section + heading) com descrição e ações opcionais.

import { useId, type ReactNode } from 'react'
import { cx } from './cx'

export interface PropsCard {
  titulo?: string
  descricao?: ReactNode
  acoes?: ReactNode
  /** Nível do título (2 nas seções da página; 3 dentro de outra seção). */
  nivel?: 2 | 3
  className?: string
  children?: ReactNode
}

export function Card({ titulo, descricao, acoes, nivel = 2, className, children }: PropsCard) {
  const id = useId()
  const Titulo = nivel === 2 ? 'h2' : 'h3'
  return (
    <section
      aria-labelledby={titulo ? `${id}-titulo` : undefined}
      className={cx('rounded-card border border-card-border bg-card-bg p-(--sds-card-padding) shadow-card', className)}
    >
      {(titulo || acoes) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {titulo && (
              <Titulo id={`${id}-titulo`} className={nivel === 2 ? 'text-heading-3 text-text-primary' : 'text-heading-4 text-text-primary'}>
                {titulo}
              </Titulo>
            )}
            {descricao && <p className="mt-1 text-body-sm text-text-secondary">{descricao}</p>}
          </div>
          {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
        </div>
      )}
      {children}
    </section>
  )
}
