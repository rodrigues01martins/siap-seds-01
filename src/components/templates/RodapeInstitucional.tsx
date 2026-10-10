// Rodapé com a assinatura institucional na hierarquia do Kit (Secretaria → Governo de Goiás).

import { Brand } from '../ui/Brand'

export function RodapeInstitucional() {
  return (
    <footer className="border-t border-border-default bg-background-surface">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-6 xl:px-8">
        <Brand variante="light" completa />
        <p className="text-caption text-text-muted">Avaliação de Planos de Ação — Chamamento SEDS/GO 2026</p>
      </div>
    </footer>
  )
}
