// Cabeçalho da página (§12): trilha, título (h1), descrição opcional e ações — [secundárias] [primária].
// Uma única ação primária por área: o tipo só aceita um elemento em acaoPrimaria.

import type { ReactElement, ReactNode } from 'react'
import { Breadcrumb, type ItemTrilha } from './Breadcrumb'

export interface PropsPageHeader {
  titulo: string
  trilha?: ItemTrilha[]
  descricao?: ReactNode
  /** No máximo UMA ação primária (Button ou ButtonLink com variante primary). */
  acaoPrimaria?: ReactElement
  /** Ações secundárias (variante secondary ou tertiary), à esquerda da primária. */
  acoesSecundarias?: ReactNode
}

export function PageHeader({ titulo, trilha, descricao, acaoPrimaria, acoesSecundarias }: PropsPageHeader) {
  return (
    <header className="mb-6 space-y-3">
      {trilha && trilha.length > 0 && <Breadcrumb itens={trilha} />}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-heading-2 text-text-primary">{titulo}</h1>
          {descricao && <div className="mt-1 max-w-3xl text-body-md text-text-secondary">{descricao}</div>}
        </div>
        {(acaoPrimaria || acoesSecundarias) && (
          <div role="group" aria-label="Ações da página" className="flex flex-wrap items-center gap-3">
            {acoesSecundarias}
            {acaoPrimaria}
          </div>
        )}
      </div>
    </header>
  )
}
