// @vitest-environment jsdom
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ListaDiligencias, type DiligenciaGravada } from './ListaDiligencias'

const ABERTA: DiligenciaGravada = { id: 'd1', objeto: 'Esclarecer a assinatura do representante legal.', prazo: '2099-12-31', status: 'aberta' }

function montar(props: Partial<Parameters<typeof ListaDiligencias>[0]> = {}) {
  const acoes = {
    onCriar: vi.fn().mockResolvedValue(undefined),
    onResponder: vi.fn().mockResolvedValue(undefined),
    onEncerrar: vi.fn().mockResolvedValue(undefined),
  }
  render(<ListaDiligencias diligencias={[ABERTA]} somenteLeitura={false} {...acoes} {...props} />)
  return acoes
}

describe('Diligências (RF-28)', () => {
  it('aviso fixo do Anexo III, 29.3', () => {
    montar({ somenteLeitura: true })
    expect(screen.getByRole('note')).toHaveTextContent('Diligência não admite inclusão de conteúdo técnico novo (Anexo III, 29.3)')
  })

  it('cria com objeto e prazo; registra resposta e encerra', async () => {
    const { onCriar, onResponder, onEncerrar } = montar()
    await userEvent.type(screen.getByLabelText('Objeto'), 'Apresentar procuração do signatário.')
    await userEvent.type(screen.getByLabelText('Prazo'), '2099-12-31')
    await userEvent.click(screen.getByRole('button', { name: 'Abrir diligência' }))
    await waitFor(() => expect(onCriar).toHaveBeenCalledWith({ objeto: 'Apresentar procuração do signatário.', prazo: '2099-12-31' }))

    const item = screen.getByRole('article', { name: /Esclarecer a assinatura/ })
    await userEvent.type(within(item).getByLabelText('Resposta'), 'Procuração juntada (SEI 95579999).')
    await userEvent.click(within(item).getByRole('button', { name: 'Registrar resposta' }))
    await waitFor(() => expect(onResponder).toHaveBeenCalledWith('d1', 'Procuração juntada (SEI 95579999).'))
    await userEvent.type(within(item).getByLabelText('Conclusão'), 'Atendida; sem conteúdo técnico novo.')
    await userEvent.click(within(item).getByRole('button', { name: 'Encerrar diligência' }))
    await waitFor(() => expect(onEncerrar).toHaveBeenCalledWith('d1', 'Atendida; sem conteúdo técnico novo.'))
  })

  it('somente leitura e diligência encerrada: sem formulários', () => {
    montar({
      somenteLeitura: true,
      diligencias: [{ ...ABERTA, status: 'encerrada', conclusao: 'Atendida.', resposta: { texto: 'Juntado.' } }],
    })
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.getByRole('article', { name: /Esclarecer/ })).toHaveTextContent('Encerrada')
  })
})
