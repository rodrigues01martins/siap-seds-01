// O tokens.css segue o Sistema de Design (docs/DESIGN-SYSTEM-SEDS.md), que é a fonte de verdade:
// primitivos com os mesmos HEX do documento, semânticos com os valores das seções 6–8, e nenhum HEX
// fora do nível primitivo (componentes só consomem tokens semânticos).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { cor, niveis, variaveis } from './tokens'

const DS = readFileSync(join(process.cwd(), 'docs', 'DESIGN-SYSTEM-SEDS.md'), 'utf8')
const linha = (inicio: string) => DS.split('\n').find((l) => l.startsWith(inicio))!

/** "Primary: 900 #003D6E | 800 #004B87 ..." → [['900', '#003D6E'], ...] */
const escala = (inicio: string) => [...linha(inicio).matchAll(/(\d+) (#[0-9A-F]{6})/g)].map((m) => [m[1]!, m[2]!] as const)
/** "brand.blue #005FAA | ..." → [['brand.blue', '#005FAA'], ...] */
const pares = (inicio: string) => [...linha(inicio).matchAll(/([\w.-]+) (#[0-9A-F]{6})/g)].map((m) => [m[1]!, m[2]!] as const)

describe('primitivos = escalas do DS (§3 e §5)', () => {
  it.each(pares('brand.blue'))('%s %s', (nome, hex) => {
    expect(cor(`sds-${nome.replace('.', '-')}`)).toBe(hex)
  })

  for (const [prefixo, token] of [
    ['Primary:', 'primary'],
    ['Green:', 'green'],
    ['Teal:', 'teal'],
    ['Neutral:', 'neutral'],
  ] as const) {
    it.each(escala(prefixo))(`${token} %s %s`, (grau, hex) => {
      expect(cor(`sds-${token}-${grau}`)).toBe(hex)
    })
  }
})

describe('semânticos = §6 e §7 (com os ajustes de contraste do §8)', () => {
  const semanticos = [...pares('background.default'), ...pares('text.primary'), ...pares('border.default'), ...pares('action.primary'), ...pares('focus-ring')]
  it.each(semanticos)('%s %s', (nome, hex) => {
    expect(cor(`sds-${nome.replace(/\./g, '-')}`)).toBe(hex)
  })

  it.each([
    ['status-success', '#1D7A35'],
    ['status-info', '#005FAA'],
    ['status-warning', '#B77900'],
    ['status-warning-text', '#8F5F00'],
    ['status-error', '#B42318'],
    ['text-muted', '#707070'],
  ])('%s %s', (nome, hex) => {
    expect(cor(`sds-${nome}`)).toBe(hex)
  })

  it('texto verde usa Green 700; sobre amarelo, texto #030505 (§8)', () => {
    expect(cor('sds-text-positive')).toBe('#146B23')
    expect(cor('sds-on-accent')).toBe('#030505')
  })
})

describe('níveis', () => {
  const { semanticos, componentes } = niveis()
  const semComentarios = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '')

  it('nenhum HEX nos níveis semântico e de componente (só var() dos níveis abaixo)', () => {
    expect(semComentarios(semanticos).match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull()
    expect(semComentarios(componentes).match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull()
  })

  it('componentes só referenciam tokens semânticos ou de componente (nunca primitivos de cor)', () => {
    const PRIMITIVO_DE_COR = /var\(--sds-(?:brand|primary|green|teal|neutral)-/
    const linhas = semComentarios(componentes)
      .split('\n')
      .filter((l) => PRIMITIVO_DE_COR.test(l))
    expect(linhas).toEqual([])
  })

  it('escala de espaço, raios, elevação e movimento do DS (§10 e §11)', () => {
    const v = variaveis()
    expect(['0', '1', '2', '3', '4', '5', '6', '8', '10', '12', '16', '20'].map((n) => v.get(`sds-space-${n}`))).toEqual([
      '0px', '4px', '8px', '12px', '16px', '20px', '24px', '32px', '40px', '48px', '64px', '80px',
    ])
    expect(['xs', 'sm', 'md', 'lg', 'xl', 'full'].map((r) => v.get(`sds-radius-${r}`))).toEqual(['2px', '4px', '8px', '12px', '16px', '9999px'])
    expect(v.get('sds-elevation-1')).toBe('0 1px 2px rgba(0, 0, 0, 0.06)')
    expect(v.get('sds-elevation-2')).toBe('0 2px 8px rgba(0, 0, 0, 0.08)')
    expect(v.get('sds-elevation-3')).toBe('0 8px 24px rgba(0, 0, 0, 0.12)')
    expect([v.get('sds-motion-fast'), v.get('sds-motion-default'), v.get('sds-motion-moderate')]).toEqual(['100ms', '150ms', '250ms'])
    expect(v.get('sds-motion-easing')).toBe('cubic-bezier(0.2, 0, 0, 1)')
  })

  it('componentes conforme §11 e §13 (alturas, raios, card, tabela, sidebar)', () => {
    const v = variaveis()
    expect([v.get('sds-button-height-sm'), v.get('sds-button-height-md'), v.get('sds-button-height-lg')]).toEqual(['32px', '40px', '48px'])
    expect(v.get('sds-button-radius')).toBe('var(--sds-radius-md)')
    expect(v.get('sds-input-radius')).toBe('var(--sds-radius-md)')
    expect(v.get('sds-card-radius')).toBe('var(--sds-radius-lg)')
    expect(v.get('sds-card-padding')).toBe('var(--sds-space-6)')
    expect(v.get('sds-badge-radius')).toBe('var(--sds-radius-full)')
    expect(v.get('sds-table-header-height')).toBe('48px')
    expect([v.get('sds-table-row-height-compact'), v.get('sds-table-row-height-comfortable')]).toEqual(['48px', '56px'])
    expect(v.get('sds-sidebar-width')).toBe('240px')
    expect(v.get('sds-sidebar-width-collapsed')).toBe('72px')
  })
})
