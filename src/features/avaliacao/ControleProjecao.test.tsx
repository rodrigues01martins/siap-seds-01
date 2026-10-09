// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ControleProjecao } from './ControleProjecao'

function montar(props: Partial<Parameters<typeof ControleProjecao>[0]> = {}) {
  const acoes = { onSelecionar: vi.fn(), onProjetar: vi.fn().mockResolvedValue(undefined) }
  render(
    <ControleProjecao
      codigoAtual="1.5"
      foco={{ tipo: 'subcriterio', propostaId: 'p1', subcriterio: '1.2' }}
      propostaId="p1"
      podeProjetar
      linkTelao="/projecao/ch1/s1"
      {...acoes}
      {...props}
    />,
  )
  return acoes
}

const tecla = (key: string, code: string) => fireEvent.keyDown(window, { key, code, altKey: true })

describe('Controle da projeção na tela da D1', () => {
  it('indica o que está no telão agora', () => {
    montar()
    expect(screen.getByRole('status', { name: 'Projetando agora' })).toHaveTextContent('Subcritério 1.2')
  })

  it('indica quando o telão mostra outra proposta ou nada', () => {
    montar({ foco: { tipo: 'resumo', propostaId: 'outra' } })
    expect(screen.getByRole('status', { name: 'Projetando agora' })).toHaveTextContent('Outra proposta')
    montar({ foco: null })
    expect(screen.getAllByRole('status', { name: 'Projetando agora' }).at(-1)).toHaveTextContent('Nada projetado')
  })

  it('"Projetar" envia o subcritério atual', async () => {
    const { onProjetar } = montar()
    await userEvent.click(screen.getByRole('button', { name: 'Projetar 1.5' }))
    expect(onProjetar).toHaveBeenCalledWith({ tipo: 'subcriterio', subcriterio: '1.5' })
  })

  it('botões para admissibilidade, D2 e resumo', async () => {
    const { onProjetar } = montar()
    await userEvent.click(screen.getByRole('button', { name: 'Projetar admissibilidade' }))
    await userEvent.click(screen.getByRole('button', { name: 'Projetar D2' }))
    await userEvent.click(screen.getByRole('button', { name: 'Projetar resumo' }))
    expect(onProjetar.mock.calls.map((c) => c[0])).toEqual([{ tipo: 'admissibilidade' }, { tipo: 'd2' }, { tipo: 'resumo' }])
  })

  it('Alt+→ vai para o próximo subcritério (inclusive de um PA para o seguinte) e projeta', () => {
    const { onSelecionar, onProjetar } = montar({ codigoAtual: '1.5' })
    tecla('ArrowRight', 'ArrowRight')
    expect(onSelecionar).toHaveBeenCalledWith('2.1')
    expect(onProjetar).toHaveBeenCalledWith({ tipo: 'subcriterio', subcriterio: '2.1' })
  })

  it('Alt+← volta para o anterior, atravessando PAs', () => {
    const primeiro = montar({ codigoAtual: '2.1' })
    tecla('ArrowLeft', 'ArrowLeft')
    expect(primeiro.onSelecionar).toHaveBeenCalledWith('1.5')
    expect(primeiro.onProjetar).toHaveBeenCalledWith({ tipo: 'subcriterio', subcriterio: '1.5' })
  })

  it('Alt+← no 1.1 não chama nada', () => {
    const { onSelecionar, onProjetar } = montar({ codigoAtual: '1.1' })
    tecla('ArrowLeft', 'ArrowLeft')
    expect(onSelecionar).not.toHaveBeenCalled()
    expect(onProjetar).not.toHaveBeenCalled()
  })

  it('Alt+R projeta o resumo (pela tecla física, também no Mac)', () => {
    const { onProjetar } = montar()
    tecla('®', 'KeyR')
    expect(onProjetar).toHaveBeenCalledWith({ tipo: 'resumo' })
  })

  it('sem permissão de conduzir: só o indicador e o link do telão; atalhos desligados', () => {
    const { onProjetar } = montar({ podeProjetar: false })
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Abrir telão' })).toHaveAttribute('href', '/projecao/ch1/s1')
    tecla('ArrowRight', 'ArrowRight')
    expect(onProjetar).not.toHaveBeenCalled()
  })
})
