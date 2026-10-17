import { describe, expect, it } from 'vitest'
import { renderizarPdf } from '../testes/renderizarPdf'
import { marcaDagua, textoDoPdf, textoDoRodape } from '../testes/textoPdf'
import { dadosVerificadosAta, montarAtaPdf, textoInicialAta, type DadosAta } from './ata'
import { codigoVerificacao } from './verificacao'
import type { Rodape } from './documento'

const RODAPE: Rodape = { geradoEm: new Date('2026-11-10T20:00:00Z'), geradoPor: 'relator@seds.go.gov.br', versaoMatriz: '2026', codigo: 'd'.repeat(64) }

function dados(ajustes: Partial<DadosAta> = {}): DadosAta {
  return {
    chamamento: { numero: '001/2026', titulo: 'Chamamento Público SEDS/GO 2026' },
    sessao: {
      id: 's1',
      data: '2026-11-10',
      lotes: ['L1'],
      presentes: [
        { nome: 'Ana Lima', papel: 'presidente' },
        { nome: 'Bruno Reis', papel: 'membro' },
        { nome: 'Carla Dias', papel: 'membro' },
      ],
    },
    propostas: [
      { id: 'p1', nomeOsc: 'Instituto Alfa', cnpj: '11222333000181', loteCodigo: 'L1', numeroSEI: '95570001', status: 'Apta', nf: 96.5, concluida: false },
      { id: 'p2', nomeOsc: 'Associação Beta', cnpj: '11444777000161', loteCodigo: 'L1', status: 'Apta', nf: 90, concluida: true },
    ],
    desempates: [{ loteCodigo: 'L1', nf: 90, ordem: ['Associação Beta', 'Centro Gama'], justificativa: 'Maior nota no PA1, conforme deliberação.' }],
    ...ajustes,
  }
}

describe('minuta de ata — texto gerado', () => {
  const texto = textoInicialAta(dados())

  it('data, chamamento, lote(s) em pauta e presentes com os papéis (só nomes)', () => {
    expect(texto).toContain('10/11/2026')
    expect(texto).toContain('Chamamento Público nº 001/2026')
    expect(texto).toContain('Lote(s) em pauta: L1')
    expect(texto).toContain('- Ana Lima (Presidente)')
    expect(texto).toContain('- Bruno Reis (Membro)')
    expect(texto).toContain('- Carla Dias (Membro)')
  })

  it('sem declarações de impedimento; assinaturas pelos nomes dos presentes', () => {
    expect(texto).not.toMatch(/impedimento/i)
    expect(texto).toMatch(/_+\nAna Lima \(Presidente\)/)
    expect(texto).toMatch(/_+\nCarla Dias \(Membro\)/)
  })

  it('propostas analisadas (com a conclusão) e desempates', () => {
    expect(texto).toContain('Instituto Alfa (CNPJ 11.222.333/0001-81) — Lote L1 — SEI 95570001 — NF 96,5 — Apta')
    expect(texto).toContain('Associação Beta (CNPJ 11.444.777/0001-61) — Lote L1 — NF 90 — Apta (concluída)')
    expect(texto).toContain('Lote L1, NF 90: Associação Beta > Centro Gama. Justificativa: Maior nota no PA1, conforme deliberação.')
  })

  it('sem decisões por maioria, diligências nem reset (removidos na Simplificação 2/4)', () => {
    expect(texto).not.toMatch(/maioria|unanimidade/i)
    expect(texto).not.toMatch(/dilig/i)
    expect(texto).not.toMatch(/RESET/)
    expect(texto).toMatch(/1\. PRESENTES[\s\S]*2\. PROPOSTAS ANALISADAS[\s\S]*3\. DESEMPATES \(RF-27\)[\s\S]*4\. ENCERRAMENTO/)
  })

  it('seção de desempates vazia diz que não houve decisão', () => {
    expect(textoInicialAta(dados({ desempates: [] }))).toContain('Não houve decisão de desempate.')
  })
})

describe('minuta de ata — PDF', () => {
  it('usa o texto editado, não o gerado', () => {
    const editado = `${textoInicialAta(dados())}\nTexto acrescentado pelo relator.`
    const pdf = montarAtaPdf(editado, RODAPE, false)
    expect(textoDoPdf(pdf)).toContain('Texto acrescentado pelo relator.')
    expect(textoDoRodape(pdf)).toContain('d'.repeat(64))
  })

  it('MINUTA quando há proposta analisada não concluída', () => {
    expect(marcaDagua(montarAtaPdf('x', RODAPE, true))).toBe('MINUTA')
    expect(marcaDagua(montarAtaPdf('x', RODAPE, false))).toBeNull()
  })

  it('o código de verificação cobre os dados e o texto final', async () => {
    const d = dados()
    const base = await codigoVerificacao(dadosVerificadosAta(d, 'texto A'))
    expect(await codigoVerificacao(dadosVerificadosAta(dados(), 'texto A'))).toBe(base)
    expect(await codigoVerificacao(dadosVerificadosAta(d, 'texto B'))).not.toBe(base)
  })
})

it('gera um PDF válido (pdfmake)', async () => {
  const pdf = await renderizarPdf(montarAtaPdf(textoInicialAta(dados()), RODAPE, true))
  expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
}, 20_000)
