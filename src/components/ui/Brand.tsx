// Marca SEDS + Governo de Goiás (§2: marcas são elementos oficiais do Kit de Divulgação).
// Hierarquia do Kit: ... → Secretarias → Governo de Goiás (a marca do Governo fecha a assinatura).
// Variantes: light (fundo claro), dark (fundo escuro) e monochrome (uma cor, herda currentColor).
//
// Só usamos arquivos oficiais colocados em public/brand/. Enquanto não houver, a marca é escrita em texto.
// TODO (README, "Marcas"): ao receber os arquivos, preencher MARCAS com os caminhos (ex.: '/brand/seds-governo-light.svg').

import { cx } from './cx'

export type VarianteMarca = 'light' | 'dark' | 'monochrome'

/** Arquivos oficiais por variante (em public/brand/); null = ainda não fornecido. */
export const MARCAS: Record<VarianteMarca, string | null> = {
  light: null,
  dark: null,
  monochrome: null,
}

export const SECRETARIA = 'Secretaria de Estado de Desenvolvimento Social'
export const GOVERNO = 'Governo de Goiás'
const NOME_ACESSIVEL = `${SECRETARIA} — ${GOVERNO}`

const CORES: Record<VarianteMarca, { base: string; secundaria: string; divisor: string }> = {
  light: { base: 'text-text-primary', secundaria: 'text-text-secondary', divisor: 'bg-border-strong' },
  dark: { base: 'text-text-inverse', secundaria: 'text-text-inverse', divisor: 'bg-text-inverse' },
  monochrome: { base: 'text-current', secundaria: 'text-current', divisor: 'bg-current' },
}

export function Brand({ variante = 'light', completa = false, className }: { variante?: VarianteMarca; completa?: boolean; className?: string }) {
  const arquivo = MARCAS[variante]
  if (arquivo) return <img src={arquivo} alt={NOME_ACESSIVEL} className={cx('h-10 w-auto', className)} />
  const cores = CORES[variante]
  return (
    <span role="img" aria-label={NOME_ACESSIVEL} className={cx('inline-flex items-center gap-3', cores.base, className)}>
      <span data-nivel="secretaria" className={completa ? 'max-w-56 text-label-md leading-tight' : 'text-heading-4 tracking-wide'}>
        {completa ? SECRETARIA : 'SEDS'}
      </span>
      <span aria-hidden="true" className={cx('h-8 w-px', cores.divisor)} />
      <span data-nivel="governo" className={cx('text-body-sm font-semibold', cores.secundaria)}>
        {GOVERNO}
      </span>
    </span>
  )
}
