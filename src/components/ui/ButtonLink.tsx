// Link de navegação com aparência de botão (mesmas variantes e tamanhos do Button). Use quando a ação
// leva a outra tela; para executar algo na mesma tela, use Button.

import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { classesBotao, type TamanhoBotao, type VarianteBotao } from './Button'
import { cx } from './cx'
import { Icone } from './Icone'

export interface PropsButtonLink {
  para: string
  variante?: VarianteBotao
  tamanho?: TamanhoBotao
  icone?: LucideIcon
  className?: string
  children: ReactNode
  'aria-label'?: string
}

export function ButtonLink({ para, variante = 'primary', tamanho = 'md', icone, className, children, ...resto }: PropsButtonLink) {
  return (
    <Link to={para} className={cx(classesBotao({ variante, tamanho }), className)} {...resto}>
      {icone && <Icone icone={icone} tamanho={tamanho === 'lg' ? 20 : 16} />}
      {children}
    </Link>
  )
}
