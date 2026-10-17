import { describe, expect, it } from 'vitest'
import { FilaSalvamento } from '../../lib/salvamento'
import { CODIGOS_D1, chaveD1, proximoPendente, resumirD1, valoresD1 } from './valores'

const JUST = 'Fundamentação suficiente da Comissão.'

describe('valores da D1 na tela (rascunho otimista ou gravado)', () => {
  it('o rascunho vence o gravado; nível desmarcado (null) também conta', () => {
    const fila = new FilaSalvamento()
    fila.guardar(chaveD1('p', '1.1', 'nivel'), 4, 'x')
    fila.guardar(chaveD1('p', '1.2', 'nivel'), null, 'x')
    const valores = valoresD1(fila, 'p', [
      { id: '1.1', nivel: 2, justificativa: JUST },
      { id: '1.2', nivel: 3, justificativa: JUST },
      { id: '2.1', nivel: 1, justificativa: 'curta' },
    ])
    expect(valores.get('1.1')).toEqual({ nivel: 4, justificativa: JUST })
    expect(valores.get('1.2')).toEqual({ nivel: null, justificativa: JUST })
    expect(valores.get('3.1')).toEqual({ nivel: null, justificativa: '' })

    const resumo = resumirD1(valores)
    expect(resumo.previa.d1).toBe(5)
    expect(resumo.completos).toBe(1)
    expect(resumo.pendentes[0]).toBe('1.2')
    expect(resumo.pendentes).toContain('2.1')
  })

  it('"Ir para o próximo pendente": depois do atual, circulando', () => {
    expect(proximoPendente(['1.2', '3.1', '6.4'], null)).toBe('1.2')
    expect(proximoPendente(['1.2', '3.1', '6.4'], '1.2')).toBe('3.1')
    expect(proximoPendente(['1.2', '3.1', '6.4'], '6.4')).toBe('1.2')
    expect(proximoPendente([], '1.1')).toBeNull()
    expect(CODIGOS_D1).toHaveLength(28)
  })
})
