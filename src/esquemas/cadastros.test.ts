import { describe, expect, it } from 'vitest'
import { camposDoErro } from './base'
import { esquemaCriarChamamento, esquemaEditarChamamento } from './cadastros'

const VALIDO = {
  numero: '001/2026',
  titulo: 'Chamamento Público SEDS/GO 2026',
  processoSei: '00000.000001/2026-01',
  dataLimitePropostas: '2026-10-31',
  lotes: [{ codigo: 'L1', descricao: 'CASE Goiânia' }],
}

describe('chamamento sem índice de correção nem data-base (Manutenção 1)', () => {
  it('cadastro válido sem os campos de correção', () => {
    expect(esquemaCriarChamamento.safeParse(VALIDO).success).toBe(true)
  })

  it.each([
    ['criar', esquemaCriarChamamento, VALIDO],
    ['editar', esquemaEditarChamamento, { id: 'ch1', titulo: 'Novo título' }],
  ] as const)('%s: índice e data-base de correção são recusados (campo não permitido)', (_, esquema, base) => {
    const r = esquema.safeParse({ ...base, indiceCorrecao: 'IPCA', dataBaseCorrecao: '2026-01-01' })
    expect(r.success).toBe(false)
    expect(camposDoErro(r.error!)).toMatchObject({ indiceCorrecao: 'Campo não permitido.', dataBaseCorrecao: 'Campo não permitido.' })
  })
})
