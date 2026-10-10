// Lista de termos e valores (dl), para resumos de detalhes (ex.: dados do chamamento).

import type { ReactNode } from 'react'
import { cx } from './cx'

export function ListaDescricao({ itens, className }: { itens: { termo: string; valor: ReactNode }[]; className?: string }) {
  return (
    <dl className={cx('grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-4', className)}>
      {itens.map((item) => (
        <div key={item.termo}>
          <dt className="text-label-md text-text-secondary">{item.termo}</dt>
          <dd className="mt-1 text-body-md text-text-primary">{item.valor}</dd>
        </div>
      ))}
    </dl>
  )
}
