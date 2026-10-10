// Meta da auditoria de design: nenhuma cor HEX solta no código fora de src/styles/tokens.css
// (primitivos do DS). Telas, componentes e relatórios só usam tokens.
import { describe, expect, it } from 'vitest'
import { hexSoltos } from '../e2e/inventario'

describe('cores HEX só em src/styles/tokens.css', () => {
  it('nenhum HEX (nem ARGB do exceljs) em outro arquivo de src/ ou index.html', () => {
    const fora = hexSoltos()
      .filter((o) => o.arquivo !== 'src/styles/tokens.css')
      .map((o) => `${o.arquivo}:${o.linha} ${o.valor}`)
    expect(fora).toEqual([])
  })
})
