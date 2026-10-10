// @vitest-environment jsdom
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { AvisoConteudoNovo, FormNovaDiligencia, ListaDiligencias, TratarDiligencia, type DiligenciaGravada } from './ListaDiligencias'

const ABERTA: DiligenciaGravada = { id: 'd1', objeto: 'Esclarecer a assinatura do representante legal.', prazo: '2099-12-31', status: 'aberta' }

describe('Diligências (RF-28)', () => {
  it('aviso fixo do Anexo III, 29.3 (nota com ícone e texto)', () => {
    render(<AvisoConteudoNovo />)
    expect(screen.getByRole('note')).toHaveTextContent('diligência não admite inclusão de conteúdo técnico novo (Anexo III, 29.3)')
  })

  it('lista: objeto, prazo e situação em selo; ação por linha leva à diligência', () => {
    render(
      <MemoryRouter>
        <ListaDiligencias diligencias={[ABERTA, { ...ABERTA, id: 'd2', objeto: 'Outra.', status: 'encerrada' }]} caminho={(id) => `/x/${id}`} somenteLeitura={false} />
      </MemoryRouter>,
    )
    const tabela = screen.getByRole('table', { name: 'Diligências da proposta' })
    const linha = within(tabela).getByText(ABERTA.objeto).closest('tr')!
    expect(linha).toHaveTextContent('31/12/2099')
    expect(linha).toHaveTextContent('Aberta')
    expect(within(linha).getByRole('link', { name: `Responder ou encerrar: ${ABERTA.objeto}` })).toHaveAttribute('href', '/x/d1')
    expect(within(tabela).getByRole('link', { name: 'Ver: Outra.' })).toBeInTheDocument()
  })

  it('cria com objeto e prazo', async () => {
    const onCriar = vi.fn().mockResolvedValue(undefined)
    render(<FormNovaDiligencia onCriar={onCriar} />)
    await userEvent.type(screen.getByLabelText('Objeto'), 'Apresentar procuração do signatário.')
    await userEvent.type(screen.getByLabelText('Prazo'), '2099-12-31')
    await userEvent.click(screen.getByRole('button', { name: 'Abrir diligência' }))
    await waitFor(() => expect(onCriar).toHaveBeenCalledWith({ objeto: 'Apresentar procuração do signatário.', prazo: '2099-12-31' }))
  })

  it('registra resposta e encerra', async () => {
    const onResponder = vi.fn().mockResolvedValue(undefined)
    const onEncerrar = vi.fn().mockResolvedValue(undefined)
    render(<TratarDiligencia diligencia={ABERTA} somenteLeitura={false} onResponder={onResponder} onEncerrar={onEncerrar} />)
    const item = screen.getByRole('article', { name: /Esclarecer a assinatura/ })
    await userEvent.type(within(item).getByLabelText('Resposta'), 'Procuração juntada (SEI 95579999).')
    await userEvent.click(within(item).getByRole('button', { name: 'Registrar resposta' }))
    await waitFor(() => expect(onResponder).toHaveBeenCalledWith('Procuração juntada (SEI 95579999).'))
    await userEvent.type(within(item).getByLabelText('Conclusão'), 'Atendida; sem conteúdo técnico novo.')
    await userEvent.click(within(item).getByRole('button', { name: 'Encerrar diligência' }))
    await waitFor(() => expect(onEncerrar).toHaveBeenCalledWith('Atendida; sem conteúdo técnico novo.'))
  })

  it('somente leitura e diligência encerrada: sem formulários', () => {
    render(
      <TratarDiligencia
        diligencia={{ ...ABERTA, status: 'encerrada', conclusao: 'Atendida.', resposta: { texto: 'Juntado.' } }}
        somenteLeitura
        onResponder={vi.fn()}
        onEncerrar={vi.fn()}
      />,
    )
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.getByRole('article', { name: /Esclarecer/ })).toHaveTextContent('Encerrada')
  })
})
