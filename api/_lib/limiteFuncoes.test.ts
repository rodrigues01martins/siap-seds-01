// Plano Hobby da Vercel: no máximo 12 Serverless Functions por deploy. Cada arquivo .ts em api/ (fora de
// _lib e dos testes), inclusive em subpastas (ex.: api/admin/limpar-base.ts), vira uma função; o 13º arquivo
// faz o deploy falhar em "Deploying outputs".

import { readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const LIMITE_HOBBY = 12

describe('funções da /api', () => {
  it(`no máximo ${LIMITE_HOBBY} (limite do plano Hobby da Vercel)`, () => {
    const funcoes = readdirSync(new URL('..', import.meta.url), { recursive: true })
      .map(String)
      .filter((caminho) => caminho.endsWith('.ts') && !caminho.endsWith('.test.ts') && !caminho.split(/[\\/]/).some((p) => p.startsWith('_')))
    expect(funcoes).toContain('admin/limpar-base.ts')
    expect(funcoes.length, funcoes.join(', ')).toBeLessThanOrEqual(LIMITE_HOBBY)
  })
})
