// Indicador de carregamento. Com movimento reduzido (prefers-reduced-motion) fica parado; o texto
// para leitor de tela continua.

import { LoaderCircle } from 'lucide-react'
import { cx } from './cx'
import { Icone, type TamanhoIcone } from './Icone'

export function Spinner({ rotulo = 'Carregando', tamanho = 20, className }: { rotulo?: string; tamanho?: TamanhoIcone; className?: string }) {
  return (
    <span role="status" aria-label={rotulo} data-testid="spinner" className={cx('inline-flex', className)}>
      <Icone icone={LoaderCircle} tamanho={tamanho} className="animate-spin" />
    </span>
  )
}
