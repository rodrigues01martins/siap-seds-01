import { describe, expect, it } from 'vitest'
import { calcularAdmissibilidade } from '../domain/admissibilidade'
import { formatarNumero } from '../domain/formatacao'
import { MATRIZ_2026 } from '../domain/matriz'
import { consolidarProposta } from '../domain/proposta'
import { renderizarPdf } from '../testes/renderizarPdf'
import { marcaDagua, textoDoPdf, textoDoRodape } from '../testes/textoPdf'
import type { Rodape } from './documento'
import { dadosVerificadosEspelho, linhasDoEspelho, montarEspelho, type DadosEspelho } from './espelho'

const PLANOS = MATRIZ_2026.dimensao1.planos
const SUBCRITERIOS = PLANOS.flatMap((p) => p.subcriterios)
const CODIGOS = SUBCRITERIOS.map((s) => s.codigo)
const PENDENTE = '6.4'

const RODAPE: Rodape = { geradoEm: new Date('2026-11-10T17:00:00Z'), geradoPor: 'relator@seds.go.gov.br', versaoMatriz: '2026', codigo: 'f'.repeat(64) }

const experiencia = {
  id: 'expAlfa',
  descricao: 'Contrato 12/2019 — CASE Anápolis',
  categorias: ['A' as const],
  internacao: true,
  unidades: 1,
  vagas: 40,
  inicio: '2019-01-01',
  fim: null,
  execucaoSatisfatoria: true,
}

function dados(ajustes: Partial<DadosEspelho['proposta']> = {}): DadosEspelho {
  const avaliados = CODIGOS.filter((c) => c !== PENDENTE)
  const { totais, resultadoD2 } = consolidarProposta({
    niveis: Object.fromEntries(avaliados.map((c) => [c, 3])),
    experiencias: [experiencia],
    dataLimite: '2026-10-31',
  })
  return {
    chamamento: { numero: '001/2026', titulo: 'Chamamento Público SEDS/GO 2026' },
    lote: { codigo: 'L1', descricao: 'CASE Goiânia' },
    osc: { cnpj: '11222333000181', razaoSocial: 'Instituto Alfa' },
    proposta: { id: 'p1', numeroSEI: '95570001', protocolo: 'PROT-7', bloqueada: false, status: 'pendente', totais, ...ajustes },
    admissibilidade: calcularAdmissibilidade({
      requisitos: Object.fromEntries(MATRIZ_2026.admissibilidade.requisitosEssenciais.map((r) => [r.codigo, true])),
      irregularidadesFormais: [],
      planos: PLANOS.map((p, i) => ({ codigo: p.codigo, ausente: false, paginaInicial: i * 20 + 1, paginaFinal: i * 20 + 10 })),
      resultado: 'admitida',
    }),
    avaliacoes: Object.fromEntries(
      avaliados.map((c) => [
        c,
        c === '1.1'
          ? { nivel: 3, decisao: 'maioria' as const, votoDivergente: 'Membro B votou pelo nível 2.', justificativa: 'Metodologia coerente com o PIA.', paginas: [2, 4] }
          : { nivel: 3, decisao: 'unanimidade' as const, justificativa: `Justificativa do subcritério ${c}.`, paginas: [1] },
      ]),
    ),
    d2: resultadoD2,
    experiencias: { expAlfa: experiencia.descricao },
  }
}

describe('espelho de avaliação — conteúdo', () => {
  it('lista os 28 subcritérios da matriz, na ordem, com o pendente marcado', () => {
    const linhas = linhasDoEspelho(dados())
    expect(linhas).toHaveLength(28)
    expect(linhas.map((l) => l.codigo)).toEqual(CODIGOS)
    expect(linhas.find((l) => l.codigo === PENDENTE)).toMatchObject({ nivel: null, plano: 'PA6' })
    expect(linhas.find((l) => l.codigo === '1.1')).toMatchObject({
      plano: 'PA1',
      nivel: 3,
      decisao: 'maioria',
      votoDivergente: 'Membro B votou pelo nível 2.',
      justificativa: 'Metodologia coerente com o PIA.',
      paginas: [2, 4],
    })
  })

  it('o PDF traz todos os 28 subcritérios com nível, decisão, voto divergente, justificativa e páginas', () => {
    const texto = textoDoPdf(montarEspelho(dados(), RODAPE))
    for (const s of SUBCRITERIOS) {
      expect(texto).toContain(`${s.codigo} ${s.titulo}`)
      if (s.codigo !== PENDENTE && s.codigo !== '1.1') expect(texto).toContain(`Justificativa do subcritério ${s.codigo}.`)
    }
    expect(texto).toContain('Metodologia coerente com o PIA.')
    expect(texto).toContain('Maioria')
    expect(texto).toContain('Voto divergente: Membro B votou pelo nível 2.')
    expect(texto).toContain('Páginas citadas: 2, 4')
    expect(texto).toContain('Não avaliado')
  })

  it('identificação: OSC, CNPJ, lote, nº SEI e protocolo', () => {
    const texto = textoDoPdf(montarEspelho(dados(), RODAPE))
    expect(texto).toContain('Instituto Alfa')
    expect(texto).toContain('11.222.333/0001-81')
    expect(texto).toContain('L1 — CASE Goiânia')
    expect(texto).toContain('95570001')
    expect(texto).toContain('PROT-7')
    expect(texto).toContain('Chamamento Público nº 001/2026')
  })

  it('admissibilidade, totais por PA, D1, memória da D2 com o nome da experiência, NF e status', () => {
    const d = dados()
    const texto = textoDoPdf(montarEspelho(d, RODAPE))
    expect(texto).toContain('Admitida')
    for (const pa of PLANOS) expect(texto).toContain(pa.codigo)
    expect(texto).toContain(MATRIZ_2026.dimensao2.criterios['C2.1'].titulo)
    expect(texto).toContain('Categoria A: comprovada por “Contrato 12/2019 — CASE Anápolis” → 4 pt')
    expect(texto).toContain('Pendente')
    const totais = d.proposta.totais!
    expect(texto).toContain(`D1: ${formatarNumero(totais.d1)}`)
    expect(texto).toContain(`NF: ${formatarNumero(totais.nf)}`)
  })

  it('rodapé com o código de verificação', () => {
    expect(textoDoRodape(montarEspelho(dados(), RODAPE))).toContain('f'.repeat(64))
  })

  it('os dados verificados não dependem da ordem em que as avaliações chegaram', () => {
    const a = dados()
    const b = { ...dados(), avaliacoes: Object.fromEntries(Object.entries(dados().avaliacoes).reverse()) }
    expect(JSON.stringify(dadosVerificadosEspelho(a))).toBe(JSON.stringify(dadosVerificadosEspelho(b)))
  })
})

describe('espelho — marca "MINUTA"', () => {
  it('proposta não homologada leva a marca d’água MINUTA', () => {
    expect(marcaDagua(montarEspelho(dados({ bloqueada: false }), RODAPE))).toBe('MINUTA')
  })

  it('proposta homologada sai sem a marca', () => {
    expect(marcaDagua(montarEspelho(dados({ bloqueada: true, status: 'homologada' }), RODAPE))).toBeNull()
  })
})

it('gera um PDF válido (pdfmake)', async () => {
  const pdf = await renderizarPdf(montarEspelho(dados(), RODAPE))
  expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
}, 20_000)
