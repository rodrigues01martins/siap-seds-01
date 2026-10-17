import { describe, expect, it } from 'vitest'
import { LINHA_VAZIA, paraLinha, validarLinha } from './linhaExperiencia'

const COMPLETA = {
  ...LINHA_VAZIA,
  descricao: 'Gestão do CASE Goiânia',
  categorias: ['D', 'A'],
  modalidade: 'internacao',
  mrosc: true,
  inicio: '2018-01-01',
  vagas: '90',
  valorAnual: '1.200.000,00',
}

describe('experiência editada na linha', () => {
  it('linha completa → campos da /api (números, centavos, fim nulo, categorias em ordem)', () => {
    const { campos, erros } = validarLinha(COMPLETA)
    expect(erros).toEqual({})
    expect(campos).toMatchObject({
      descricao: 'Gestão do CASE Goiânia',
      categorias: ['A', 'D'],
      modalidade: 'internacao',
      mrosc: true,
      inicio: '2018-01-01',
      fim: null,
      vagas: 90,
      unidades: null,
      valorAnualCentavos: 120_000_000,
      documentos: [],
    })
    expect(campos).not.toHaveProperty('desconsideracoes')
  })

  it('linha nova vazia ou incompleta: não envia e diz o que falta', () => {
    const vazia = validarLinha(LINHA_VAZIA)
    expect(vazia.campos).toBeNull()
    expect(Object.keys(vazia.erros)).toEqual(expect.arrayContaining(['descricao', 'categorias', 'modalidade', 'inicio']))
    expect(validarLinha({ ...COMPLETA, valorAnual: '12,3,4' }).erros.valorAnual).toBe('Use o formato 1.234,56.')
    expect(validarLinha({ ...COMPLETA, fim: '2010-01-01' }).campos).toBeNull()
  })

  it('gravada → linha (ida e volta sem perder dados)', () => {
    const { campos } = validarLinha(COMPLETA)
    const linha = paraLinha({ id: 'e1', ...campos!, fim: null })
    expect(validarLinha(linha).campos).toEqual(campos)
  })
})
