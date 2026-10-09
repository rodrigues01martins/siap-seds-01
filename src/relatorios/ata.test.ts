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
      presentes: [
        { uid: 'u1', email: 'presidente@seds.go.gov.br', perfil: 'presidente' },
        { uid: 'u2', email: 'relator@seds.go.gov.br', perfil: 'relator' },
        { uid: 'u3', email: 'membro@seds.go.gov.br', perfil: 'membro' },
      ],
      declaracoes: [
        { uid: 'u1', semImpedimento: true },
        { uid: 'u3', semImpedimento: false, motivo: 'Parentesco com dirigente da OSC Beta.' },
      ],
    },
    propostas: [
      { id: 'p1', nomeOsc: 'Instituto Alfa', cnpj: '11222333000181', loteCodigo: 'L1', numeroSEI: '95570001', status: 'Apta', nf: 96.5, bloqueada: false },
      { id: 'p2', nomeOsc: 'Associação Beta', cnpj: '11444777000161', loteCodigo: 'L1', status: 'Homologada', nf: 90, bloqueada: true },
    ],
    decisoesPorMaioria: [
      { propostaId: 'p1', codigo: '1.1', titulo: 'Título do 1.1', nivel: 3, votoDivergente: 'Membro C votou pelo nível 2.', justificativa: 'Metodologia coerente.' },
    ],
    desempates: [{ loteCodigo: 'L1', nf: 90, ordem: ['Associação Beta', 'Centro Gama'], justificativa: 'Maior nota no PA1, conforme deliberação.' }],
    diligencias: [
      { propostaId: 'p1', objeto: 'Apresentar procuração do signatário.', prazo: '2026-11-20', status: 'encerrada', resposta: 'Procuração juntada.', conclusao: 'Atendida, sem conteúdo técnico novo.' },
    ],
    ...ajustes,
  }
}

describe('minuta de ata — texto gerado', () => {
  const texto = textoInicialAta(dados())

  it('data, chamamento e presentes', () => {
    expect(texto).toContain('10/11/2026')
    expect(texto).toContain('Chamamento Público nº 001/2026')
    expect(texto).toContain('presidente@seds.go.gov.br (Presidente)')
    expect(texto).toContain('relator@seds.go.gov.br (Relator)')
    expect(texto).toContain('membro@seds.go.gov.br (Membro)')
  })

  it('declarações de impedimento, inclusive a ausente', () => {
    expect(texto).toContain('presidente@seds.go.gov.br: declarou não haver impedimento.')
    expect(texto).toContain('membro@seds.go.gov.br: declarou impedimento — Parentesco com dirigente da OSC Beta.')
    expect(texto).toContain('relator@seds.go.gov.br: sem declaração registrada.')
  })

  it('propostas analisadas, decisões por maioria com voto divergente, desempates e diligências', () => {
    expect(texto).toContain('Instituto Alfa (CNPJ 11.222.333/0001-81) — Lote L1 — SEI 95570001 — NF 96,5 — Apta')
    expect(texto).toContain('Instituto Alfa — subcritério 1.1 (Título do 1.1): nível 3, por maioria. Voto divergente: Membro C votou pelo nível 2.')
    expect(texto).toContain('Lote L1, NF 90: Associação Beta > Centro Gama. Justificativa: Maior nota no PA1, conforme deliberação.')
    expect(texto).toContain('Instituto Alfa: Apresentar procuração do signatário. Prazo: 20/11/2026. Situação: Encerrada.')
    expect(texto).toContain('Resposta: Procuração juntada.')
    expect(texto).toContain('Conclusão: Atendida, sem conteúdo técnico novo.')
  })

  it('seções vazias dizem que não houve registro', () => {
    const vazio = textoInicialAta(dados({ decisoesPorMaioria: [], desempates: [], diligencias: [] }))
    expect(vazio).toContain('Todas as decisões desta sessão foram por unanimidade.')
    expect(vazio).toContain('Não houve decisão de desempate.')
    expect(vazio).toContain('Não houve diligência.')
  })
})

describe('minuta de ata — PDF', () => {
  it('usa o texto editado, não o gerado', () => {
    const editado = `${textoInicialAta(dados())}\nTexto acrescentado pelo relator.`
    const pdf = montarAtaPdf(editado, RODAPE, false)
    expect(textoDoPdf(pdf)).toContain('Texto acrescentado pelo relator.')
    expect(textoDoRodape(pdf)).toContain('d'.repeat(64))
  })

  it('MINUTA quando há proposta analisada não homologada', () => {
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
