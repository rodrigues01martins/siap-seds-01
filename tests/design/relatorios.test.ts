// As cores dos relatórios (pdfmake e exceljs precisam de HEX) são os mesmos valores dos tokens do DS.
import { describe, expect, it } from 'vitest'
import { CORES_DOCUMENTO } from '../../src/relatorios/documento'
import { cor } from './tokens'

describe('cores dos documentos = tokens do DS', () => {
  it.each([
    ['azulInstitucional', 'sds-action-primary'],
    ['zebra', 'sds-neutral-100'],
    ['cabecalhoTabela', 'sds-neutral-200'],
    ['texto', 'sds-text-primary'],
    ['textoSecundario', 'sds-text-secondary'],
    ['borda', 'sds-border-default'],
    ['atencao', 'sds-status-warning-text'],
    ['erro', 'sds-status-error'],
  ] as const)('%s = %s', (chave, token) => {
    expect(CORES_DOCUMENTO[chave]).toBe(cor(token))
  })
})
