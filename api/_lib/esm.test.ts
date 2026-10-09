// A Vercel roda cada função da /api como ESM no Node, sem bundler: um import relativo
// precisa nomear o arquivo (.js) e JSON precisa de `with { type: 'json' }`. Vite, Vitest
// e tsx toleram a forma curta, então só este teste pega o erro antes do deploy.

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const RAIZ = resolve(import.meta.dirname, '../..')

function arquivosTs(pasta: string): string[] {
  return readdirSync(join(RAIZ, pasta), { recursive: true, encoding: 'utf8' })
    .filter((nome) => nome.endsWith('.ts') && !nome.endsWith('.test.ts') && !nome.endsWith('.d.ts'))
    .map((nome) => join(pasta, nome))
}

/** Código que vai para as funções: a /api e o que ela importa (domínio e esquemas compartilhados). */
const ARQUIVOS = [...arquivosTs('api'), ...arquivosTs('src/domain'), ...arquivosTs('src/esquemas')]

function problemasDeImport(arquivo: string): string[] {
  const codigo = readFileSync(join(RAIZ, arquivo), 'utf8')
  const problemas: string[] = []
  for (const [, especificador, atributos] of codigo.matchAll(
    /(?:from|import)\s+'(\.{1,2}\/[^']*)'(\s+with\s*\{\s*type:\s*'json'\s*\})?/g,
  )) {
    const alvo = resolve(dirname(join(RAIZ, arquivo)), especificador!)
    if (especificador!.endsWith('.json')) {
      if (!atributos) problemas.push(`${especificador}: falta with { type: 'json' }`)
      if (!existsSync(alvo)) problemas.push(`${especificador}: arquivo inexistente`)
    } else if (!especificador!.endsWith('.js')) {
      problemas.push(`${especificador}: use a extensão .js (ex.: './modulo.js' ou './pasta/index.js')`)
    } else if (!existsSync(alvo.replace(/\.js$/, '.ts'))) {
      problemas.push(`${especificador}: não há ${relative(RAIZ, alvo.replace(/\.js$/, '.ts'))}`)
    }
  }
  return problemas
}

describe('imports compatíveis com ESM no Node (funções da Vercel)', () => {
  it('encontra os arquivos da /api e do domínio', () => {
    expect(ARQUIVOS).toContain(join('api', 'avaliacao.ts'))
    expect(ARQUIVOS).toContain(join('src', 'domain', 'matriz', 'index.ts'))
    expect(ARQUIVOS).toContain(join('src', 'esquemas', 'sessao.ts'))
  })

  it.each(ARQUIVOS)('%s', (arquivo) => {
    expect(problemasDeImport(arquivo)).toEqual([])
  })
})
