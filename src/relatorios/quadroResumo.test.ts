import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import { formatarNumero } from '../domain/formatacao'
import { MATRIZ_2026 } from '../domain/matriz'
import { consolidarProposta } from '../domain/proposta'
import { renderizarPdf } from '../testes/renderizarPdf'
import { marcaDagua, textoDoPdf, textoDoRodape } from '../testes/textoPdf'
import type { Rodape } from './documento'
import { montarQuadro, quadroPdf, type PropostaQuadro } from './quadroResumo'
import { quadroXlsx } from './xlsx'

const CODIGOS = MATRIZ_2026.dimensao1.planos.flatMap((p) => p.subcriterios.map((s) => s.codigo))
const RODAPE: Rodape = { geradoEm: new Date('2026-11-10T17:00:00Z'), geradoPor: 'presidente@seds.go.gov.br', versaoMatriz: '2026', codigo: 'c'.repeat(64) }
const CABECALHO = { chamamento: { numero: '001/2026', titulo: 'Chamamento Público SEDS/GO 2026' }, lote: { codigo: 'L1', descricao: 'CASE Goiânia' } }

function totais(n: number, omitidos: string[] = []) {
  const niveis = Object.fromEntries(CODIGOS.filter((c) => !omitidos.includes(c)).map((c) => [c, n]))
  return consolidarProposta({ niveis, experiencias: [], dataLimite: '2026-10-31' }).totais
}

const linha = (id: string, nome: string, dados: Partial<PropostaQuadro> = {}): PropostaQuadro => ({
  id,
  nomeOsc: nome,
  totais: totais(3),
  bloqueada: false,
  ...dados,
})

const PROPOSTAS: PropostaQuadro[] = [
  linha('a', 'Instituto Alfa', { totais: totais(4), bloqueada: true }),
  linha('b', 'Associação Beta'),
  linha('c', 'Centro Gama'),
  linha('d', 'Fundação Delta', { totais: totais(3, ['6.4']) }),
  linha('e', 'Obra Épsilon', { totais: totais(2) }),
  linha('f', 'Grupo Zeta', { totais: undefined, admissibilidade: { situacao: 'nao_admitida', motivos: ['Requisito 28.1.IV não atendido.'] } }),
]

describe('quadro-resumo do lote — a mesma tabela da classificação', () => {
  it('ranking com empate sinalizado e propostas fora da classificação com o motivo', () => {
    const q = montarQuadro(PROPOSTAS, [])
    expect(q.linhas.map((l) => [l.posicao, l.nomeOsc, l.situacao, l.observacao])).toEqual([
      [1, 'Instituto Alfa', 'Homologada', ''],
      [2, 'Associação Beta', 'Apta', 'Empatada'],
      [2, 'Centro Gama', 'Apta', 'Empatada'],
      [null, 'Fundação Delta', 'Pendente', 'Falta 1 subcritério'],
      [null, 'Obra Épsilon', 'Inapta', expect.stringContaining('inferior ao corte de 67,2 pontos')],
      [null, 'Grupo Zeta', 'Não admitida', 'Requisito 28.1.IV não atendido.'],
    ])
    expect(q.definitiva).toBe(false)
    expect(q.aviso).toBe('Classificação não definitiva: 1 proposta pendente; 1 empate sem decisão.')
    expect(q.linhas[0]!.pas).toHaveLength(6)
    expect(q.linhas[5]!.nf).toBeNull()
  })

  it('empate de NF resolvido pelo Edital aparece com o critério (II: maior PA1)', () => {
    const q = montarQuadro(
      [linha('x', 'Alfa', { totais: totais(3, []) }), linha('y', 'Beta', { totais: { ...consolidarProposta({ niveis: Object.fromEntries(CODIGOS.map((c) => [c, c === '1.1' ? 4 : c === '3.1' ? 2 : 3])), experiencias: [], dataLimite: '2026-10-31' }).totais } })],
      [],
    )
    expect(q.linhas.map((l) => [l.posicao, l.nomeOsc, l.observacao])).toEqual([
      [1, 'Beta', 'Desempate pelo Edital (critério II)'],
      [2, 'Alfa', 'Desempate pelo Edital (critério II)'],
    ])
    expect(q.empates).toEqual([])
    expect(q.definitiva).toBe(true)
  })

  it('aplica a decisão de desempate da Comissão (RF-27)', () => {
    const nf = totais(3).nf
    const q = montarQuadro(PROPOSTAS, [{ propostas: ['b', 'c'], nf, ordem: ['c', 'b'], justificativa: 'Maior nota no PA1, conforme ata.' }])
    expect(q.linhas.slice(1, 3).map((l) => [l.posicao, l.nomeOsc, l.observacao])).toEqual([
      [2, 'Centro Gama', 'Desempate da Comissão'],
      [3, 'Associação Beta', 'Desempate da Comissão'],
    ])
    expect(q.empates).toEqual([{ nf, nomes: ['Associação Beta', 'Centro Gama'], decisao: { ordem: ['Centro Gama', 'Associação Beta'], justificativa: 'Maior nota no PA1, conforme ata.' } }])
  })

  it('PDF: cabeçalho, todas as linhas, aviso, empates e rodapé', () => {
    const q = montarQuadro(PROPOSTAS, [])
    const definicao = quadroPdf(CABECALHO, q, RODAPE, true)
    const texto = textoDoPdf(definicao)
    expect(texto).toContain('Lote L1 — CASE Goiânia')
    for (const p of PROPOSTAS) expect(texto).toContain(p.nomeOsc)
    expect(texto).toContain('Classificação não definitiva')
    expect(texto).toContain(formatarNumero(totais(4).nf))
    expect(texto).toContain('sem decisão registrada')
    expect(textoDoRodape(definicao)).toContain('c'.repeat(64))
    expect(marcaDagua(definicao)).toBe('MINUTA')
    expect(marcaDagua(quadroPdf(CABECALHO, q, RODAPE, false))).toBeNull()
  })

  it('XLSX: mesmas colunas e linhas, marca MINUTA e rodapé com o código', async () => {
    const q = montarQuadro(PROPOSTAS, [])
    const arquivo = await quadroXlsx(CABECALHO, q, RODAPE, true)
    const livro = new ExcelJS.Workbook()
    await livro.xlsx.load(arquivo)
    const planilha = livro.worksheets[0]!
    const valores = (n: number) => (planilha.getRow(n).values as unknown[]).slice(1)
    const todas = Array.from({ length: planilha.rowCount }, (_, i) => valores(i + 1))
    const cabecalho = todas.findIndex((r) => r[0] === 'Posição')
    expect(todas[cabecalho]).toEqual(['Posição', 'OSC', 'PA1', 'PA2', 'PA3', 'PA4', 'PA5', 'PA6', 'D1', 'D2', 'NF', 'Situação', 'Observação'])
    const dados = todas.slice(cabecalho + 1, cabecalho + 1 + PROPOSTAS.length)
    expect(dados.map((r) => r[1])).toEqual(['Instituto Alfa', 'Associação Beta', 'Centro Gama', 'Fundação Delta', 'Obra Épsilon', 'Grupo Zeta'])
    expect(dados[0]![0]).toBe(1)
    expect(dados[0]![10]).toBe(totais(4).nf)
    const texto = todas.flat().map(String).join('\n')
    expect(texto).toContain('MINUTA')
    expect(texto).toContain('c'.repeat(64))
    expect(texto).toContain('presidente@seds.go.gov.br')
    expect(texto).toContain('Classificação não definitiva')
  })
})

it('gera um PDF válido (pdfmake)', async () => {
  const pdf = await renderizarPdf(quadroPdf(CABECALHO, montarQuadro(PROPOSTAS, []), RODAPE, true))
  expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
}, 20_000)
