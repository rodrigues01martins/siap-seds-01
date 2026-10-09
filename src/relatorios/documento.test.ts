import { describe, expect, it } from 'vitest'
import { marcaDagua, textoDoPdf, textoDoRodape } from '../testes/textoPdf'
import { MARCA_MINUTA, formatarDataHora, linhasRodape, montarPdf, precisaMinuta, type Rodape } from './documento'

const RODAPE: Rodape = {
  geradoEm: new Date('2026-11-10T17:05:09.000Z'),
  geradoPor: 'relator@seds.go.gov.br',
  versaoMatriz: '2026',
  codigo: 'a'.repeat(64),
}

describe('rodapé comum dos documentos', () => {
  it('data e hora no fuso de Goiás', () => {
    expect(formatarDataHora(RODAPE.geradoEm)).toBe('10/11/2026 14:05:09')
  })

  it('traz gerado em, por quem, versão da matriz e código de verificação', () => {
    const texto = linhasRodape(RODAPE).join('\n')
    expect(texto).toContain('Gerado em 10/11/2026 14:05:09 por relator@seds.go.gov.br')
    expect(texto).toContain('Matriz de avaliação versão 2026')
    expect(texto).toContain(`Código de verificação (SHA-256): ${'a'.repeat(64)}`)
  })

  it('montarPdf põe o rodapé em todas as páginas, com a numeração', () => {
    const definicao = montarPdf({ titulo: 'Teste', conteudo: ['Corpo'], rodape: RODAPE, minuta: false })
    expect(textoDoPdf(definicao)).toContain('Corpo')
    const pagina2 = textoDoRodape(definicao, 2, 3)
    expect(pagina2).toContain('relator@seds.go.gov.br')
    expect(pagina2).toContain('a'.repeat(64))
    expect(pagina2).toContain('Página 2 de 3')
    expect(definicao.info?.title).toBe('Teste')
  })
})

describe('marca d’água "MINUTA"', () => {
  it('vale quando alguma proposta do documento não está homologada', () => {
    expect(precisaMinuta([{ bloqueada: true }, { bloqueada: false }])).toBe(true)
    expect(precisaMinuta([{}])).toBe(true)
    expect(precisaMinuta([{ bloqueada: true }, { bloqueada: true }])).toBe(false)
    expect(precisaMinuta([])).toBe(false)
  })

  it('montarPdf aplica a marca só quando pedido', () => {
    expect(marcaDagua(montarPdf({ titulo: 'T', conteudo: [], rodape: RODAPE, minuta: true }))).toBe(MARCA_MINUTA)
    expect(MARCA_MINUTA).toBe('MINUTA')
    expect(marcaDagua(montarPdf({ titulo: 'T', conteudo: [], rodape: RODAPE, minuta: false }))).toBeNull()
  })
})
