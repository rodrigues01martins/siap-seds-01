// Salvamento automático da D1 (Simplificação 3/4): a /api e a tela aceitam rascunhos — só o nível, só a
// justificativa (ainda curta) ou só as páginas —, mas recusam o que nunca vale: subcritério fora da matriz, nível
// fora da escala e página fora da numeração do PA (página de corte).
import { describe, expect, it } from 'vitest'
import { esquemaSalvarAvaliacao, pendenciasDoRegistro, problemasDoRascunho } from './avaliacao'

const ALVO = { chamamentoId: 'ch', propostaId: 'p', sessaoId: 's', codigo: '3.1' }

describe('rascunho da avaliação de um subcritério', () => {
  it.each([
    ['só o nível', { nivel: 3 }],
    ['nível desmarcado (null)', { nivel: null }],
    ['só a justificativa, curta', { justificativa: 'Fluxos' }],
    ['só as páginas', { paginas: [1, 8] }],
  ])('%s: sem problemas', (_caso, campos) => {
    expect(esquemaSalvarAvaliacao.safeParse({ ...ALVO, ...campos }).success).toBe(true)
    expect(problemasDoRascunho({ codigo: '3.1', ...campos })).toEqual({})
  })

  it('recusa subcritério fora da matriz, nível fora da escala e página acima do corte do PA', () => {
    expect(problemasDoRascunho({ codigo: '7.1', nivel: 2 })).toEqual({ codigo: 'Subcritério inexistente na matriz.' })
    expect(problemasDoRascunho({ codigo: '3.1', nivel: 5 })).toEqual({ nivel: 'O nível deve ser um inteiro de 0 a 4.' })
    expect(problemasDoRascunho({ codigo: '3.1', nivel: 1.5 })).toEqual({ nivel: 'O nível deve ser um inteiro de 0 a 4.' })
    expect(problemasDoRascunho({ codigo: '3.1', paginas: [9] })).toEqual({ paginas: 'Página 9 acima do limite de 8 páginas do PA3.' })
    expect(problemasDoRascunho({ codigo: '3.1', paginas: [0] })).toEqual({ paginas: 'As páginas devem ser números inteiros a partir de 1.' })
  })

  it('esquema: nível em texto e campos removidos (decisão) são recusados', () => {
    const texto = esquemaSalvarAvaliacao.safeParse({ ...ALVO, nivel: '3' })
    expect(texto.success).toBe(false)
    expect(texto.error?.issues[0]?.message).toBe('O nível deve ser um inteiro de 0 a 4.')
    expect(esquemaSalvarAvaliacao.safeParse({ ...ALVO, decisao: 'maioria' }).success).toBe(false)
  })
})

describe('pendências de um subcritério (indicador da linha e "Ir para o próximo pendente")', () => {
  it('nível e justificativa (com o mínimo) — o que falta, em palavras', () => {
    expect(pendenciasDoRegistro(undefined)).toEqual(['nível', 'justificativa'])
    expect(pendenciasDoRegistro({ nivel: 2, justificativa: 'curta' })).toEqual(['justificativa'])
    expect(pendenciasDoRegistro({ nivel: null, justificativa: 'Fundamentação suficiente da Comissão.' })).toEqual(['nível'])
    expect(pendenciasDoRegistro({ nivel: 0, justificativa: 'Fundamentação suficiente da Comissão.' })).toEqual([])
    expect(pendenciasDoRegistro({ nivel: 4, justificativa: 'Fundamentação suficiente da Comissão.' }, 60)).toEqual(['justificativa'])
  })
})
