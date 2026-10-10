// Plano Hobby da Vercel: no máximo 12 Serverless Functions por deploy. Cada arquivo .ts em api/ (fora de
// _lib e dos testes) vira uma função; o 13º arquivo faz o deploy falhar em "Deploying outputs".

import { readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const LIMITE_HOBBY = 12

describe('funções da /api', () => {
  it(`no máximo ${LIMITE_HOBBY} (limite do plano Hobby da Vercel)`, () => {
    const funcoes = readdirSync(new URL('..', import.meta.url)).filter(
      (nome) => nome.endsWith('.ts') && !nome.endsWith('.test.ts') && !nome.startsWith('_'),
    )
    expect(funcoes.length, funcoes.join(', ')).toBeLessThanOrEqual(LIMITE_HOBBY)
  })
})
