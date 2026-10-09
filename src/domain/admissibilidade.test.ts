import { describe, expect, it } from 'vitest'
import {
  calcularAdmissibilidade,
  problemasDaAdmissibilidade,
  type EntradaAdmissibilidade,
} from './admissibilidade'

const REQUISITOS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VIII', 'IX', 'X'].map((n) => `28.1.${n}`)
const LIMITES = [12, 12, 8, 12, 10, 8]

/** Caderno com os 6 PAs em sequência, cada um no limite de páginas, e todos os requisitos atendidos. */
function entrada(dados: Partial<EntradaAdmissibilidade> = {}): EntradaAdmissibilidade {
  let pagina = 3
  return {
    requisitos: Object.fromEntries(REQUISITOS.map((c) => [c, true])),
    irregularidadesFormais: [],
    planos: LIMITES.map((limite, i) => {
      const plano = { codigo: `PA${i + 1}`, ausente: false, paginaInicial: pagina, paginaFinal: pagina + limite - 1 }
      pagina += limite
      return plano
    }),
    resultado: 'admitida',
    ...dados,
  }
}

describe('calcularAdmissibilidade — páginas e página de corte (limite do JSON)', () => {
  it('página de corte = inicial + limite − 1; dentro do limite não excede', () => {
    const r = calcularAdmissibilidade(entrada())
    expect(r.planos[0]).toMatchObject({ codigo: 'PA1', paginaInicial: 3, paginaFinal: 14, paginas: 12, limite: 12, paginaCorte: 14, excede: 0 })
    expect(r.situacao).toBe('admitida')
    expect(r.motivos).toEqual([])
  })

  it('PA3 com 10 páginas (limite 8) excede em 2; corte na 8ª página do PA', () => {
    const e = entrada()
    e.planos[2] = { codigo: 'PA3', ausente: false, paginaInicial: 30, paginaFinal: 39 }
    const pa3 = calcularAdmissibilidade(e).planos[2]!
    expect(pa3).toMatchObject({ paginas: 10, limite: 8, paginaCorte: 37, excede: 2 })
  })
})

describe('calcularAdmissibilidade — situação', () => {
  it('ausência de qualquer PA → desclassificada (28.2) e 28.1.VII não atendido', () => {
    const e = entrada({ resultado: 'nao_admitida', motivacao: 'Ausência do PA4 no Caderno.' })
    e.planos[3] = { codigo: 'PA4', ausente: true, paginaInicial: null, paginaFinal: null }
    const r = calcularAdmissibilidade(e)
    expect(r.situacao).toBe('desclassificada')
    expect(r.requisitos['28.1.VII']).toBe(false)
    expect(r.planos[3]).toMatchObject({ ausente: true, paginas: null, paginaCorte: null, excede: 0 })
    expect(r.motivos).toContain('Ausência do PA4 (Anexo III, 28.2).')
  })

  it('não admitida pela Comissão, com motivação', () => {
    const e = entrada({ resultado: 'nao_admitida', motivacao: 'Arquivo não abre integralmente.' })
    e.requisitos['28.1.IV'] = false
    const r = calcularAdmissibilidade(e)
    expect(r.situacao).toBe('nao_admitida')
    expect(r.motivos).toContain('Requisito 28.1.IV não atendido: possibilidade de abertura e leitura integral do arquivo.')
  })

  it('irregularidades meramente formais não mudam a situação (28.4)', () => {
    const r = calcularAdmissibilidade(entrada({ irregularidadesFormais: ['28.5.II'], observacaoIrregularidades: 'Página 7 repetida.' }))
    expect(r.situacao).toBe('admitida')
    expect(r.irregularidadesFormais).toEqual(['28.5.II'])
  })
})

describe('problemasDaAdmissibilidade (mensagens por campo, para a /api e a tela)', () => {
  it('entrada válida → sem problemas', () => {
    expect(problemasDaAdmissibilidade(entrada())).toEqual({})
  })

  it('requisito não marcado ou inexistente', () => {
    const { ['28.1.III']: _, ...faltando } = entrada().requisitos
    expect(problemasDaAdmissibilidade(entrada({ requisitos: faltando }))).toEqual({
      requisitos: 'Marque cada requisito do item 28.1 como atendido ou não.',
    })
    expect(problemasDaAdmissibilidade(entrada({ requisitos: { ...entrada().requisitos, '28.1.XI': true } }))).toEqual({
      requisitos: 'Requisito inexistente: 28.1.XI.',
    })
  })

  it('os 6 PAs, cada um uma vez', () => {
    expect(problemasDaAdmissibilidade(entrada({ planos: entrada().planos.slice(0, 5) }))).toEqual({
      planos: 'Informe os 6 Planos de Ação (PA1 a PA6), cada um uma vez.',
    })
  })

  it('páginas: inteiras a partir de 1 e final ≥ inicial (PA presente)', () => {
    const e = entrada()
    e.planos[1] = { codigo: 'PA2', ausente: false, paginaInicial: 20, paginaFinal: 19 }
    e.planos[4] = { codigo: 'PA5', ausente: false, paginaInicial: null, paginaFinal: 50 }
    expect(problemasDaAdmissibilidade(e)).toEqual({
      'planos.1.paginaFinal': 'A página final não pode ser anterior à inicial.',
      'planos.4.paginaInicial': 'Informe a página inicial (inteiro a partir de 1).',
    })
  })

  it('admitida com requisito essencial não atendido → problema no resultado', () => {
    const e = entrada()
    e.requisitos['28.1.II'] = false
    expect(problemasDaAdmissibilidade(e)).toEqual({
      resultado: 'Requisito essencial 28.1.II não atendido: a proposta não pode ser admitida.',
    })
  })

  it('PA ausente → não pode ser admitida (28.1.VII)', () => {
    const e = entrada()
    e.planos[0] = { codigo: 'PA1', ausente: true, paginaInicial: null, paginaFinal: null }
    expect(problemasDaAdmissibilidade(e)).toEqual({
      resultado: 'Requisito essencial 28.1.VII não atendido: a proposta não pode ser admitida.',
    })
  })

  it('não admitida exige motivação', () => {
    expect(problemasDaAdmissibilidade(entrada({ resultado: 'nao_admitida', motivacao: '  ' }))).toEqual({
      motivacao: 'Informe a motivação da não admissão (ao menos 10 caracteres).',
    })
  })

  it('irregularidade formal inexistente', () => {
    expect(problemasDaAdmissibilidade(entrada({ irregularidadesFormais: ['28.5.IX'] }))).toEqual({
      irregularidadesFormais: 'Irregularidade inexistente: 28.5.IX.',
    })
  })
})
