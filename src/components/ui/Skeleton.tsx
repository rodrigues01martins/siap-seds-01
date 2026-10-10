// Esqueleto de carregamento: blocos cinza pulsando (parados com movimento reduzido). O bloco inteiro é
// um role="status" com rótulo; as linhas são decorativas.

import { cx } from './cx'

export function Skeleton({ linhas = 3, rotulo = 'Carregando', className }: { linhas?: number; rotulo?: string; className?: string }) {
  return (
    <div role="status" aria-label={rotulo} className={cx('space-y-2', className)}>
      {Array.from({ length: linhas }, (_, i) => (
        <div
          key={i}
          data-skeleton-linha
          aria-hidden="true"
          className={cx('h-4 animate-pulse rounded-input bg-background-disabled', i === linhas - 1 && linhas > 1 ? 'w-2/3' : 'w-full')}
        />
      ))}
    </div>
  )
}
