// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Plus } from 'lucide-react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'
import { Icone } from './Icone'
import { Spinner } from './Spinner'

describe('Button', () => {
  it.each([
    ['primary', 'bg-button-primary-bg'],
    ['secondary', 'border-button-secondary-border'],
    ['tertiary', 'text-button-tertiary-fg'],
    ['destructive', 'bg-button-destructive-bg'],
  ] as const)('variante %s usa os tokens do componente', (variante, classe) => {
    render(<Button variante={variante}>Salvar</Button>)
    expect(screen.getByRole('button', { name: 'Salvar' })).toHaveClass(classe)
  })

  it.each([
    ['sm', 'h-(--sds-button-height-sm)'],
    ['md', 'h-(--sds-button-height-md)'],
    ['lg', 'h-(--sds-button-height-lg)'],
  ] as const)('tamanho %s (32/40/48 px)', (tamanho, classe) => {
    render(<Button tamanho={tamanho}>Ok</Button>)
    expect(screen.getByRole('button')).toHaveClass(classe)
  })

  it('padrão: primary, 40 px, type="button" (não envia formulário sem querer)', () => {
    render(<Button>Ok</Button>)
    const botao = screen.getByRole('button')
    expect(botao).toHaveClass('bg-button-primary-bg', 'h-(--sds-button-height-md)')
    expect(botao).toHaveAttribute('type', 'button')
  })

  it('clique e teclado (Enter e Espaço) disparam a ação', async () => {
    const acao = vi.fn()
    render(<Button onClick={acao}>Ok</Button>)
    await userEvent.click(screen.getByRole('button'))
    screen.getByRole('button').focus()
    await userEvent.keyboard('{Enter}')
    await userEvent.keyboard(' ')
    expect(acao).toHaveBeenCalledTimes(3)
  })

  it('desabilitado: não dispara e não recebe foco pelo Tab', async () => {
    const acao = vi.fn()
    render(
      <>
        <Button desabilitado onClick={acao}>
          Ok
        </Button>
        <Button>Outro</Button>
      </>,
    )
    expect(screen.getByRole('button', { name: 'Ok' })).toBeDisabled()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Outro' })).toHaveFocus()
    await userEvent.click(screen.getByRole('button', { name: 'Ok' }))
    expect(acao).not.toHaveBeenCalled()
  })

  it('carregando: spinner, aria-busy, continua focável, mantém o rótulo e não dispara de novo', async () => {
    const acao = vi.fn()
    render(
      <Button carregando onClick={acao}>
        Salvar
      </Button>,
    )
    const botao = screen.getByRole('button', { name: /Salvar/ })
    expect(botao).toHaveAttribute('aria-busy', 'true')
    expect(botao).toHaveAttribute('aria-disabled', 'true')
    expect(botao).not.toBeDisabled()
    expect(screen.getByTestId('spinner')).toBeInTheDocument()
    await userEvent.tab()
    expect(botao).toHaveFocus()
    await userEvent.click(botao)
    expect(acao).not.toHaveBeenCalled()
  })

  it('nunca remove o foco visível (sem outline-none)', () => {
    render(<Button>Ok</Button>)
    expect(screen.getByRole('button').className).not.toMatch(/outline-none|focus:outline-0/)
  })

  it('aceita ícone antes do texto e type="submit"', () => {
    render(
      <Button icone={Plus} type="submit">
        Novo
      </Button>,
    )
    expect(screen.getByRole('button', { name: 'Novo' })).toHaveAttribute('type', 'submit')
    expect(screen.getByRole('button').querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })
})

describe('Icone (lucide-react)', () => {
  it.each([16, 20, 24] as const)('tamanho %i e traço 1,75', (tamanho) => {
    const { container } = render(<Icone icone={Plus} tamanho={tamanho} />)
    const svg = container.querySelector('svg')!
    expect(svg).toHaveAttribute('width', String(tamanho))
    expect(svg).toHaveAttribute('stroke-width', '1.75')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
  })

  it('com rótulo vira imagem acessível', () => {
    render(<Icone icone={Plus} rotulo="Adicionar" />)
    expect(screen.getByRole('img', { name: 'Adicionar' })).toBeInTheDocument()
  })
})

describe('Spinner', () => {
  it('anuncia o carregamento para leitores de tela', () => {
    render(<Spinner rotulo="Carregando propostas" />)
    expect(screen.getByRole('status', { name: 'Carregando propostas' })).toBeInTheDocument()
  })
})
