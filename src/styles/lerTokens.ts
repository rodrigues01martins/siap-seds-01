// Leitura dos tokens de src/styles/tokens.css como texto, para quem não usa CSS (pdfmake e exceljs nos
// relatórios): resolve var(--x) em cadeia até a cor HEX do nível primitivo. Código puro.

/** Mapa nome → valor das variáveis declaradas (sem comentários). */
export function variaveisCss(css: string): Map<string, string> {
  const semComentarios = css.replace(/\/\*[\s\S]*?\*\//g, '')
  return new Map([...semComentarios.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()]))
}

/** Cor final de um token ("sds-action-primary") em HEX maiúsculo de 6 dígitos. */
export function corDoToken(nome: string, mapa: Map<string, string>): string {
  const visitados = new Set<string>()
  let atual = nome
  for (;;) {
    if (visitados.has(atual)) throw new Error(`Token em ciclo: --${atual}`)
    visitados.add(atual)
    const valor = mapa.get(atual)
    if (valor === undefined) throw new Error(`Token inexistente: --${atual}`)
    const referencia = /^var\(--([\w-]+)\)$/.exec(valor)
    if (referencia) {
      atual = referencia[1]!
      continue
    }
    const hex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(valor)?.[1]
    if (!hex) throw new Error(`--${nome} não termina numa cor HEX simples (${valor})`)
    const cheio = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex
    return `#${cheio.toUpperCase()}`
  }
}
