// AuthPage: telas fora do app (login, acesso não autorizado). Marca no topo e assinatura institucional
// no rodapé, na hierarquia do Kit (Secretaria → Governo de Goiás); conteúdo num card central.

import type { ReactNode } from 'react'
import { Brand } from '../ui/Brand'
import { LinkPularConteudo } from './AppShell'
import { RodapeInstitucional } from './RodapeInstitucional'

export function AuthPage({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children: ReactNode }) {
  return (
    <div data-template="AuthPage" className="flex min-h-screen flex-col bg-background-default text-text-primary">
      <LinkPularConteudo />
      <header className="flex h-16 items-center border-b border-border-secao bg-background-surface px-4 md:px-6">
        <Brand variante="light" />
      </header>
      <main id="conteudo" tabIndex={-1} className="flex flex-1 items-start justify-center px-4 py-10 focus:outline-none md:py-16">
        <div className="w-full max-w-md rounded-card border border-card-border bg-card-bg p-(--sds-card-padding) shadow-card">
          <h1 className="text-heading-2 text-text-primary">{titulo}</h1>
          {subtitulo && <p className="mt-1 text-body-md text-text-secondary">{subtitulo}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </main>
      <RodapeInstitucional />
    </div>
  )
}
