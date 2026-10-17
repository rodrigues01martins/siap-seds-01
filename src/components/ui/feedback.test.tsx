// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Alert } from './Alert'
import { EmptyState } from './EmptyState'
import { ErrorState } from './ErrorState'
import { Skeleton } from './Skeleton'
import { MAPA_STATUS, StatusBadge } from './StatusBadge'
import { ToastProvider, useToast } from './Toast'

describe('StatusBadge: ponto + texto, nunca só cor', () => {
  it('mapeamento de cor documentado de cada status da proposta', () => {
    expect(MAPA_STATUS).toEqual({
      apta: { tom: 'success', rotulo: 'Apta' },
      concluida: { tom: 'info', rotulo: 'Concluída' },
      inapta: { tom: 'warning', rotulo: 'Inapta' },
      empatada: { tom: 'warning', rotulo: 'Empatada' },
      desclassificada: { tom: 'error', rotulo: 'Desclassificada' },
      nao_admitida: { tom: 'error', rotulo: 'Não admitida' },
      pendente: { tom: 'neutral', rotulo: 'Pendente' },
    })
  })

  it.each(Object.entries(MAPA_STATUS))('%s: texto visível, ponto decorativo e cores do token', (status, { tom, rotulo }) => {
    const { container } = render(<StatusBadge status={status as keyof typeof MAPA_STATUS} />)
    const selo = screen.getByText(rotulo).closest('span[data-status]')!
    expect(selo).toHaveClass(`bg-badge-${tom}-bg`, `text-badge-${tom}-fg`, 'rounded-badge')
    const ponto = container.querySelector('[data-ponto]')!
    expect(ponto).toHaveAttribute('aria-hidden', 'true')
    expect(ponto).toHaveClass(`bg-badge-${tom}-dot`)
  })
})

describe('Alert', () => {
  it.each([
    ['error', 'alert'],
    ['warning', 'alert'],
    ['success', 'status'],
    ['info', 'status'],
  ] as const)('%s: ícone + título + mensagem, papel %s', (tom, papel) => {
    render(
      <Alert tom={tom} titulo="Título">
        Mensagem
      </Alert>,
    )
    const alerta = screen.getByRole(papel)
    expect(alerta).toHaveClass(`bg-status-${tom}-surface`)
    expect(alerta).toHaveTextContent('TítuloMensagem')
    expect(alerta.querySelector('svg')).toBeInTheDocument()
  })

  it('ação opcional e fechar pelo teclado', async () => {
    const fechar = vi.fn()
    render(
      <Alert tom="info" titulo="Sessão aberta" acao={<button type="button">Ver sessão</button>} onFechar={fechar}>
        A pauta tem 3 propostas.
      </Alert>,
    )
    expect(screen.getByRole('button', { name: 'Ver sessão' })).toBeInTheDocument()
    screen.getByRole('button', { name: 'Fechar aviso' }).focus()
    await userEvent.keyboard('{Enter}')
    expect(fechar).toHaveBeenCalled()
  })
})

describe('Toast', () => {
  afterEach(() => vi.useRealTimers())

  function Disparar() {
    const { mostrar } = useToast()
    return (
      <button type="button" onClick={() => mostrar({ tom: 'success', titulo: 'Avaliação salva', mensagem: 'Nível 3 no subcritério 1.1.' })}>
        Salvar
      </button>
    )
  }

  it('aparece numa região aria-live, pode ser fechado e some sozinho em 6 s', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    render(
      <ToastProvider>
        <Disparar />
      </ToastProvider>,
    )
    const regiao = screen.getByRole('region', { name: 'Notificações' })
    expect(regiao).toHaveAttribute('aria-live', 'polite')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(regiao).toHaveTextContent('Avaliação salva')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await userEvent.click(screen.getAllByRole('button', { name: 'Fechar notificação' })[0]!)
    expect(screen.getAllByText('Avaliação salva')).toHaveLength(1)
    act(() => vi.advanceTimersByTime(6000))
    expect(screen.queryByText('Avaliação salva')).not.toBeInTheDocument()
  })
})

describe('Skeleton, EmptyState, ErrorState', () => {
  it('Skeleton é decorativo (aria-hidden) e tem rótulo para leitor de tela quando é bloco de carregamento', () => {
    const { container } = render(<Skeleton linhas={3} rotulo="Carregando propostas" />)
    expect(screen.getByRole('status', { name: 'Carregando propostas' })).toBeInTheDocument()
    expect(container.querySelectorAll('[data-skeleton-linha]')).toHaveLength(3)
  })

  it('EmptyState: título, descrição e ação', () => {
    render(<EmptyState titulo="Nenhuma proposta" descricao="Cadastre a primeira proposta do lote." acao={<button type="button">Nova proposta</button>} />)
    expect(screen.getByRole('heading', { name: 'Nenhuma proposta' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nova proposta' })).toBeInTheDocument()
  })

  it('ErrorState: alerta com tentar novamente', async () => {
    const tentar = vi.fn()
    render(<ErrorState mensagem="Sem conexão com o servidor." onTentarNovamente={tentar} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Sem conexão com o servidor.')
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(tentar).toHaveBeenCalled()
  })
})
