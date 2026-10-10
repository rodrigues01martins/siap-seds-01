// Estado vazio: ícone, título, descrição e ação opcional (ex.: "Nova proposta").

import { Inbox, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Icone } from './Icone'

export function EmptyState({ titulo, descricao, acao, icone = Inbox }: { titulo: string; descricao?: string; acao?: ReactNode; icone?: LucideIcon }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <span className="text-text-muted">
        <Icone icone={icone} tamanho={24} />
      </span>
      <h3 className="text-heading-4 text-text-primary">{titulo}</h3>
      {descricao && <p className="max-w-md text-body-sm text-text-secondary">{descricao}</p>}
      {acao && <div className="mt-2">{acao}</div>}
    </div>
  )
}
