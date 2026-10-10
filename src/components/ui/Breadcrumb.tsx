// Trilha de navegação (§12): nav com rótulo, lista ordenada; o último item é a página atual (aria-current).

import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { Icone } from './Icone'

export interface ItemTrilha {
  rotulo: string
  /** Rota do item; ausente no último (página atual). */
  para?: string
}

export function Breadcrumb({ itens }: { itens: ItemTrilha[] }) {
  return (
    <nav aria-label="Trilha de navegação">
      <ol className="flex flex-wrap items-center gap-1 text-body-sm">
        {itens.map((item, i) => {
          const ultimo = i === itens.length - 1
          return (
            <li key={`${item.rotulo}-${i}`} className="flex items-center gap-1">
              {ultimo || !item.para ? (
                <span aria-current={ultimo ? 'page' : undefined} className="text-text-secondary">
                  {item.rotulo}
                </span>
              ) : (
                <Link to={item.para} className="text-text-link underline-offset-2 hover:underline">
                  {item.rotulo}
                </Link>
              )}
              {!ultimo && <Icone icone={ChevronRight} tamanho={16} className="text-text-muted" />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
