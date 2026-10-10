// Ícone único do sistema (lucide-react): tamanhos 16/20/24, traço 1,75 (entre 1,5 e 2).
// Decorativo por padrão (aria-hidden); com `rotulo`, vira imagem acessível.

import type { LucideIcon } from 'lucide-react'

export type TamanhoIcone = 16 | 20 | 24

export interface PropsIcone {
  icone: LucideIcon
  tamanho?: TamanhoIcone
  rotulo?: string
  className?: string
}

export const TRACO_ICONE = 1.75

export function Icone({ icone: Svg, tamanho = 20, rotulo, className }: PropsIcone) {
  return (
    <Svg
      width={tamanho}
      height={tamanho}
      strokeWidth={TRACO_ICONE}
      className={className}
      focusable="false"
      {...(rotulo ? { role: 'img', 'aria-label': rotulo } : { 'aria-hidden': true })}
    />
  )
}
