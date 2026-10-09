import { describe, expect, it } from 'vitest'
import { codigoVerificacao, serializarCanonico } from './verificacao'

const DADOS = {
  proposta: { id: 'p1', numeroSEI: '95570001', totais: { d1: 84, d2: 12, nf: 96 } },
  avaliacoes: [
    { codigo: '1.1', nivel: 3, paginas: [2, 4] },
    { codigo: '1.2', nivel: 4, paginas: [] },
  ],
}

describe('código de verificação (SHA-256 dos dados usados)', () => {
  it('mesmos dados → mesmo código, em 64 dígitos hexadecimais', async () => {
    const a = await codigoVerificacao(DADOS)
    const b = await codigoVerificacao(structuredClone(DADOS))
    expect(a).toMatch(/^[0-9a-f]{64}$/)
    expect(b).toBe(a)
  })

  it('a ordem das chaves não muda o código (serialização canônica)', async () => {
    const reordenado = {
      avaliacoes: [
        { paginas: [2, 4], nivel: 3, codigo: '1.1' },
        { nivel: 4, codigo: '1.2', paginas: [] },
      ],
      proposta: { totais: { nf: 96, d2: 12, d1: 84 }, numeroSEI: '95570001', id: 'p1' },
    }
    expect(await codigoVerificacao(reordenado)).toBe(await codigoVerificacao(DADOS))
  })

  it('qualquer mudança nos dados muda o código (inclusive a ordem de listas)', async () => {
    const original = await codigoVerificacao(DADOS)
    const nivel = structuredClone(DADOS)
    nivel.avaliacoes[0]!.nivel = 2
    const ordem = { ...DADOS, avaliacoes: [...DADOS.avaliacoes].reverse() }
    expect(await codigoVerificacao(nivel)).not.toBe(original)
    expect(await codigoVerificacao(ordem)).not.toBe(original)
  })

  it('confere com o SHA-256 conhecido da serialização', async () => {
    // printf '%s' '{"a":1}' | sha256sum
    expect(await codigoVerificacao({ a: 1 })).toBe('015abd7f5cc57a2dd94b7590f04ad8084273905ee33ec5cebeae62276a97f862')
  })

  it('normaliza datas e Timestamps (toDate) para ISO e ignora campos undefined', () => {
    const data = new Date('2026-11-10T13:00:00.000Z')
    const timestamp = { toDate: () => data, seconds: 1, nanoseconds: 2 }
    expect(serializarCanonico({ b: undefined, a: data, c: timestamp })).toBe(
      '{"a":"2026-11-10T13:00:00.000Z","c":"2026-11-10T13:00:00.000Z"}',
    )
    expect(serializarCanonico([1, undefined, 'x'])).toBe('[1,null,"x"]')
  })
})
