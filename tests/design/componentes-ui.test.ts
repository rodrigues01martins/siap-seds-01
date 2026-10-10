// Regra 6 do CLAUDE.md na biblioteca de componentes (e no catálogo /ui): só tokens semânticos
// (classes do tema ligadas a src/styles/tokens.css) — nenhum HEX e nenhuma cor da paleta padrão do Tailwind.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const PASTAS = [join('src', 'components', 'ui'), join('src', 'components', 'templates'), join('src', 'features', 'catalogo')]
const arquivos = PASTAS.flatMap((pasta) =>
  readdirSync(join(process.cwd(), pasta))
    .filter((a) => /\.(ts|tsx)$/.test(a) && !a.includes('.test.'))
    .map((a) => join(pasta, a)),
)
const PALETA =
  /\b(?:bg|text|border|ring|outline|fill|stroke|from|to|via|divide|placeholder|accent|decoration|shadow)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white)(?:-\d{2,3})?(?:\/\d+)?\b/

describe('src/components/ui e o catálogo só usam tokens semânticos', () => {
  it('existem componentes para conferir', () => {
    expect(arquivos.length).toBeGreaterThan(10)
  })

  it.each(arquivos)('%s: sem HEX, sem rgb() e sem cor da paleta padrão do Tailwind', (arquivo) => {
    const codigo = readFileSync(join(process.cwd(), arquivo), 'utf8')
    expect(codigo).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(codigo).not.toMatch(/\brgba?\(/)
    expect(codigo.match(PALETA)?.[0] ?? null).toBeNull()
  })
})
