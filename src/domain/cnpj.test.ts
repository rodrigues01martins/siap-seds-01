import { describe, expect, it } from 'vitest'
import { cnpjValido, normalizarCnpj } from './cnpj'

describe('normalizarCnpj', () => {
  it('remove pontuação e espaços e põe letras em maiúsculas', () => {
    expect(normalizarCnpj(' 11.222.333/0001-81 ')).toBe('11222333000181')
    expect(normalizarCnpj('12.abc.345/01de-35')).toBe('12ABC34501DE35')
  })
})

describe('cnpjValido', () => {
  it.each(['11.222.333/0001-81', '11222333000181', '11.444.777/0001-61'])('numérico válido: %s', (cnpj) => {
    expect(cnpjValido(cnpj)).toBe(true)
  })

  it('alfanumérico válido (IN RFB 2.229/2024, exemplo oficial da Receita)', () => {
    expect(cnpjValido('12.ABC.345/01DE-35')).toBe(true)
    expect(cnpjValido('12abc34501de35')).toBe(true)
  })

  it.each([
    ['dígito verificador errado', '11.222.333/0001-82'],
    ['segundo dígito errado', '11.222.333/0001-80'],
    ['alfanumérico com DV errado', '12.ABC.345/01DE-36'],
    ['todos os dígitos iguais', '00.000.000/0000-00'],
    ['todos iguais (outro)', '11111111111111'],
    ['curto', '1122233300018'],
    ['longo', '112223330001811'],
    ['letra nos dígitos verificadores', '12ABC34501DE3A'],
    ['caractere inválido', '11.222.333/0001-8#'],
    ['vazio', ''],
  ])('inválido: %s', (_motivo, cnpj) => {
    expect(cnpjValido(cnpj)).toBe(false)
  })
})
