import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PERGUNTAS_SUS, TAREFAS_USABILIDADE, notaSus } from './usabilidade'

const ROTEIRO = readFileSync(join(process.cwd(), 'docs', 'TESTE-USABILIDADE.md'), 'utf8')

describe('teste de usabilidade', () => {
  it('5 tarefas, cada uma no roteiro com perfil, tempo-alvo e critério de sucesso', () => {
    expect(TAREFAS_USABILIDADE).toHaveLength(5)
    for (const t of TAREFAS_USABILIDADE) {
      const titulo = `### ${t.codigo} — ${t.titulo} (${t.perfil}; tempo-alvo: ${t.tempoAlvoMin} min)`
      expect(ROTEIRO).toContain(titulo)
      const secao = ROTEIRO.slice(ROTEIRO.indexOf(titulo)).split('\n### ')[0]!
      expect(secao).toContain('**Critério de sucesso:**')
    }
  })

  it('as 10 perguntas do SUS estão no roteiro, na ordem', () => {
    expect(PERGUNTAS_SUS).toHaveLength(10)
    PERGUNTAS_SUS.forEach((q, i) => expect(ROTEIRO).toContain(`| ${i + 1} | ${q} |`))
  })

  it('nota SUS: ímpares (r − 1), pares (5 − r), soma × 2,5', () => {
    expect(notaSus([5, 1, 5, 1, 5, 1, 5, 1, 5, 1])).toBe(100)
    expect(notaSus([1, 5, 1, 5, 1, 5, 1, 5, 1, 5])).toBe(0)
    expect(notaSus([4, 2, 4, 2, 4, 2, 4, 2, 4, 2])).toBe(75)
    expect(() => notaSus([3, 3, 3])).toThrow(RangeError)
  })
})
