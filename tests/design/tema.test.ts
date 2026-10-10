// Tema do Tailwind (src/index.css) ligado aos tokens: tipografia do DS §9, foco visível e movimento (§11).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { variaveis } from './tokens'

const CSS = readFileSync(join(process.cwd(), 'src', 'index.css'), 'utf8')
const DS = readFileSync(join(process.cwd(), 'docs', 'DESIGN-SYSTEM-SEDS.md'), 'utf8')
const TEMA = variaveis(CSS)

/** "display-lg 40/700/48 | ..." (§9) → [nome, tamanho, peso, altura de linha] */
const ESCALA = [...DS.matchAll(/([a-z]+(?:-[a-z0-9]+)?) (\d+)\/(\d+)\/(\d+)/g)].map((m) => [m[1]!, Number(m[2]), m[3]!, Number(m[4])] as const)
const rem = (px: number) => `${px / 16}rem`

describe('tipografia (§9)', () => {
  it('escala completa do DS: 11 estilos', () => {
    expect(ESCALA.map((e) => e[0])).toEqual([
      'display-lg', 'display-md', 'heading-1', 'heading-2', 'heading-3', 'heading-4',
      'body-lg', 'body-md', 'body-sm', 'label-md', 'caption',
    ])
  })

  it.each(ESCALA)('text-%s: %i px, peso %s, linha %i px', (nome, tamanho, peso, linha) => {
    expect(TEMA.get(`text-${nome}`)).toBe(rem(tamanho))
    expect(TEMA.get(`text-${nome}--line-height`)).toBe(rem(linha))
    expect(TEMA.get(`text-${nome}--font-weight`)).toBe(peso)
  })

  it('fonte do app: Gotham com fallback obrigatório (via token)', () => {
    expect(TEMA.get('font-sans')).toBe('var(--sds-font-family)')
    expect(variaveis().get('sds-font-family')).toBe(`'Gotham', 'Helvetica Neue', Arial, sans-serif`)
  })

  it('Gotham não vem de fonte externa (nenhuma URL http em @font-face ou @import)', () => {
    expect(CSS).not.toMatch(/url\(\s*['"]?https?:/)
    expect(CSS).not.toMatch(/@import\s+url\(/)
  })
})

describe('base global', () => {
  it('foco visível: 2 px sólido na cor action.primary, afastado 2 px', () => {
    expect(CSS).toMatch(/:focus-visible\s*\{[^}]*outline:\s*var\(--sds-border-medium\) solid var\(--sds-focus-ring\);[^}]*outline-offset:\s*2px/)
  })

  it('campos de data e hora também mostram o anel (o Chrome não aplica :focus-visible nas partes dia/mês/ano)', () => {
    expect(CSS).toMatch(/input:is\(\[type='date'\], \[type='time'\], \[type='datetime-local'\], \[type='month'\]\):focus-within\s*\{[^}]*outline:\s*var\(--sds-border-medium\) solid var\(--sds-focus-ring\);/)
  })

  it('movimento: 100/150/250 ms com a curva do DS e transição padrão do Tailwind ligada a eles', () => {
    expect(TEMA.get('default-transition-duration')).toBe('var(--sds-motion-default)')
    expect(TEMA.get('default-transition-timing-function')).toBe('var(--sds-motion-easing)')
    expect(TEMA.get('ease-standard')).toBe('var(--sds-motion-easing)')
    for (const nome of ['fast', 'default', 'moderate']) {
      expect(CSS).toMatch(new RegExp(`@utility duration-${nome} \\{\\s*transition-duration: var\\(--sds-motion-${nome}\\);`))
    }
  })

  it('respeita prefers-reduced-motion (zera durações dos tokens e das animações)', () => {
    const bloco = /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/.exec(CSS)?.[1] ?? ''
    expect(bloco).toMatch(/--sds-motion-fast:\s*0ms/)
    expect(bloco).toMatch(/--sds-motion-default:\s*0ms/)
    expect(bloco).toMatch(/--sds-motion-moderate:\s*0ms/)
    expect(bloco).toMatch(/transition-duration:\s*0\.01ms !important/)
    expect(bloco).toMatch(/animation-duration:\s*0\.01ms !important/)
  })

  it('fundo global = background.default', () => {
    expect(CSS).toMatch(/body\s*\{[^}]*background-color:\s*var\(--sds-background-default\)/)
  })
})

describe('cores no Tailwind: só tokens semânticos e de componente', () => {
  const cores = [...TEMA].filter(([nome]) => nome.startsWith('color-'))

  it('toda cor do tema aponta para um token --sds- semântico ou de componente (nenhum HEX, nenhum primitivo)', () => {
    expect(cores.length).toBeGreaterThan(40)
    for (const [nome, valor] of cores) {
      expect(valor, nome).toMatch(/^var\(--sds-[\w-]+\)$/)
      expect(valor, nome).not.toMatch(/--sds-(brand|primary|green|teal|neutral|functional)-/)
      expect(variaveis().has(valor.slice(6, -1)), `${nome} → ${valor}`).toBe(true)
    }
  })

  it('raio, sombra e altura dos componentes vêm dos tokens', () => {
    for (const [nome, token] of [
      ['radius-input', 'sds-input-radius'],
      ['radius-button', 'sds-button-radius'],
      ['radius-card', 'sds-card-radius'],
      ['radius-modal', 'sds-radius-lg'],
      ['radius-badge', 'sds-badge-radius'],
      ['shadow-card', 'sds-shadow-card'],
      ['shadow-dropdown', 'sds-shadow-dropdown'],
      ['shadow-tooltip', 'sds-shadow-tooltip'],
      ['shadow-modal', 'sds-shadow-modal'],
    ]) {
      expect(TEMA.get(nome), nome).toBe(`var(--${token})`)
    }
  })
})
