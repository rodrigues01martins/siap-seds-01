import { describe, expect, it } from 'vitest'
import { JUSTIFICATIVA_MINIMA_PADRAO, planoDoSubcriterio, problemasDoRegistro, type RegistroAvaliacao } from './avaliacao'

const valido = (dados: Partial<RegistroAvaliacao> = {}): RegistroAvaliacao => ({
  codigo: '3.1',
  nivel: 3,
  justificativa: 'Metodologia descrita com fluxos e responsáveis.',
  paginas: [2, 5],
  decisao: 'unanimidade',
  ...dados,
})

describe('planoDoSubcriterio', () => {
  it('encontra o PA do subcritério na matriz', () => {
    expect(planoDoSubcriterio('3.1')?.codigo).toBe('PA3')
    expect(planoDoSubcriterio('6.4')?.codigo).toBe('PA6')
  })

  it('código inexistente → null', () => {
    expect(planoDoSubcriterio('9.9')).toBeNull()
    expect(planoDoSubcriterio('1')).toBeNull()
  })
})

describe('problemasDoRegistro (C2)', () => {
  it('registro válido → sem problemas', () => {
    expect(problemasDoRegistro(valido())).toEqual({})
  })

  it('subcritério inexistente na matriz', () => {
    expect(problemasDoRegistro(valido({ codigo: '7.1' }))).toEqual({ codigo: 'Subcritério inexistente na matriz.' })
  })

  it.each([5, -1, 2.5])('nível %s fora da escala 0–4', (nivel) => {
    expect(problemasDoRegistro(valido({ nivel }))).toEqual({ nivel: 'O nível deve ser um inteiro de 0 a 4.' })
  })

  it('justificativa abaixo do mínimo padrão (espaços não contam)', () => {
    const curta = 'x'.repeat(JUSTIFICATIVA_MINIMA_PADRAO - 1)
    expect(problemasDoRegistro(valido({ justificativa: `  ${curta}  ` }))).toEqual({
      justificativa: `A justificativa deve ter ao menos ${JUSTIFICATIVA_MINIMA_PADRAO} caracteres.`,
    })
    expect(problemasDoRegistro(valido({ justificativa: 'x'.repeat(JUSTIFICATIVA_MINIMA_PADRAO) }))).toEqual({})
  })

  it('mínimo da justificativa é configurável', () => {
    const texto = 'x'.repeat(30)
    expect(problemasDoRegistro(valido({ justificativa: texto }), { justificativaMinima: 50 })).toEqual({
      justificativa: 'A justificativa deve ter ao menos 50 caracteres.',
    })
    expect(problemasDoRegistro(valido({ justificativa: texto }), { justificativaMinima: 30 })).toEqual({})
  })

  it('página acima do limite do PA (PA3 = 8 páginas; 8 aceita, 9 recusa)', () => {
    expect(problemasDoRegistro(valido({ paginas: [8] }))).toEqual({})
    expect(problemasDoRegistro(valido({ paginas: [3, 9] }))).toEqual({
      paginas: 'Página 9 acima do limite de 8 páginas do PA3.',
    })
  })

  it('o limite segue o PA do subcritério (PA4 = 12 páginas)', () => {
    expect(problemasDoRegistro(valido({ codigo: '4.1', paginas: [12] }))).toEqual({})
    expect(problemasDoRegistro(valido({ codigo: '4.1', paginas: [13] }))).toEqual({
      paginas: 'Página 13 acima do limite de 12 páginas do PA4.',
    })
  })

  it('páginas precisam ser inteiros a partir de 1', () => {
    expect(problemasDoRegistro(valido({ paginas: [0] }))).toEqual({
      paginas: 'As páginas devem ser números inteiros a partir de 1.',
    })
  })

  it('sem páginas é aceito (ex.: nível 0, conteúdo não apresentado)', () => {
    expect(problemasDoRegistro(valido({ nivel: 0, paginas: [] }))).toEqual({})
  })

  it('voto divergente só com decisão por maioria', () => {
    expect(problemasDoRegistro(valido({ decisao: 'unanimidade', votoDivergente: 'Membro X: nível 2.' }))).toEqual({
      votoDivergente: 'Voto divergente só se aplica a decisão por maioria.',
    })
    expect(problemasDoRegistro(valido({ decisao: 'maioria', votoDivergente: 'Membro X: nível 2.' }))).toEqual({})
  })
})
