import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { PROJETO_PRODUCAO, ambienteDoProjeto } from './ambiente'

describe('ambiente da limpeza da base', () => {
  it('produção é o projects.prod do .firebaserc; dev e emuladores são DEV', () => {
    const firebaserc = JSON.parse(readFileSync(new URL('../../.firebaserc', import.meta.url), 'utf8')) as { projects: Record<string, string> }
    expect(PROJETO_PRODUCAO).toBe(firebaserc.projects.prod)
    expect(ambienteDoProjeto(firebaserc.projects.prod!)).toBe('PRODUÇÃO')
    expect(ambienteDoProjeto(firebaserc.projects.dev!)).toBe('DEV')
    expect(ambienteDoProjeto('demo-siap-seds')).toBe('DEV')
  })
})
