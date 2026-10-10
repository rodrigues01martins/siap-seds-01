// Leitura dos tokens de design (src/styles/tokens.css) para os testes: resolve var(--x) e
// color-mix(in srgb, A p%, B) até chegar a uma cor HEX, e calcula o contraste WCAG 2.x.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export const CSS_TOKENS = readFileSync(join(process.cwd(), 'src', 'styles', 'tokens.css'), 'utf8')

/** Trechos do arquivo por nível (os comentários "Nível 1/2/3" separam os blocos). */
export function niveis(css = CSS_TOKENS): { primitivos: string; semanticos: string; componentes: string } {
  const i1 = css.indexOf('Nível 1 — Primitivos')
  const i2 = css.indexOf('Nível 2 — Semânticos')
  const i3 = css.indexOf('Nível 3 — Componentes')
  if (i1 < 0 || i2 < i1 || i3 < i2) throw new Error('tokens.css sem os três níveis na ordem')
  return { primitivos: css.slice(i1, i2), semanticos: css.slice(i2, i3), componentes: css.slice(i3) }
}

export function variaveis(css = CSS_TOKENS): Map<string, string> {
  const semComentarios = css.replace(/\/\*[\s\S]*?\*\//g, '')
  return new Map([...semComentarios.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()]))
}

type Rgb = [number, number, number]

const deHex = (hex: string): Rgb => {
  const h = hex.replace('#', '')
  const cheio = h.length === 3 ? [...h].map((c) => c + c).join('') : h
  return [0, 2, 4].map((i) => parseInt(cheio.slice(i, i + 2), 16)) as Rgb
}
const paraHex = (rgb: Rgb) => '#' + rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('').toUpperCase()

/** Resolve um token (nome sem "--") até a cor final em HEX maiúsculo. */
export function cor(nome: string, mapa = variaveis()): string {
  const valor = mapa.get(nome)
  if (valor === undefined) throw new Error(`Token inexistente: --${nome}`)
  return resolver(valor, mapa)
}

function resolver(valor: string, mapa: Map<string, string>): string {
  const v = valor.trim()
  if (/^#[0-9a-fA-F]{3,6}$/.test(v)) return paraHex(deHex(v))
  const ref = /^var\(--([\w-]+)\)$/.exec(v)
  if (ref) return cor(ref[1]!, mapa)
  const mix = /^color-mix\(in srgb,\s*(.+?)\s+(\d+(?:\.\d+)?)%,\s*(.+)\)$/.exec(v)
  if (mix) {
    const a = deHex(resolver(mix[1]!, mapa))
    const b = deHex(resolver(mix[3]!, mapa))
    const p = Number(mix[2]) / 100
    return paraHex([0, 1, 2].map((i) => a[i]! * p + b[i]! * (1 - p)) as Rgb)
  }
  throw new Error(`Valor de cor não suportado: ${valor}`)
}

const luminancia = (hex: string) => {
  const [r, g, b] = deHex(hex).map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}

/** Razão de contraste WCAG entre duas cores HEX (1 a 21). */
export function contraste(a: string, b: string): number {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return (l1! + 0.05) / (l2! + 0.05)
}
