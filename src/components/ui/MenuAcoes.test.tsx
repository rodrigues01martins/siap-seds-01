// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SquarePen, Trash2 } from 'lucide-react'
import { describe, expect, it, vi } from 'vitest'
import { MenuAcoes } from './MenuAcoes'

function montar() {
  const editar = vi.fn()
  const excluir = vi.fn()
  render(
    <>
      <MenuAcoes
        rotulo="Mais ações — Chamamento 001/2026"
        itens={[
          { rotulo: 'Editar', icone: SquarePen, onSelecionar: editar },
          { rotulo: 'Excluir', icone: Trash2, destrutivo: true, onSelecionar: excluir },
        ]}
      />
      <button type="button">Fora</button>
    </>,
  )
  return { editar, excluir, gatilho: screen.getByRole('button', { name: 'Mais ações — Chamamento 001/2026' }) }
}

describe('MenuAcoes (menu de ações da linha)', () => {
  it('botão com aria-haspopup="menu"; abre um menu com itens e foco no primeiro', async () => {
    const { gatilho } = montar()
    expect(gatilho).toHaveAttribute('aria-haspopup', 'menu')
    expect(gatilho).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    await userEvent.click(gatilho)
    expect(gatilho).toHaveAttribute('aria-expanded', 'true')
    const menu = screen.getByRole('menu', { name: 'Mais ações — Chamamento 001/2026' })
    expect(menu).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Editar' })).toHaveFocus()
    expect(screen.getAllByRole('menuitem')).toHaveLength(2)
  })

  it('setas, Home e End movem o foco (circular); Esc fecha e devolve o foco ao botão', async () => {
    const { gatilho } = montar()
    await userEvent.click(gatilho)
    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitem', { name: 'Excluir' })).toHaveFocus()
    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitem', { name: 'Editar' })).toHaveFocus()
    await userEvent.keyboard('{ArrowUp}')
    expect(screen.getByRole('menuitem', { name: 'Excluir' })).toHaveFocus()
    await userEvent.keyboard('{Home}')
    expect(screen.getByRole('menuitem', { name: 'Editar' })).toHaveFocus()
    await userEvent.keyboard('{End}')
    expect(screen.getByRole('menuitem', { name: 'Excluir' })).toHaveFocus()

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(gatilho).toHaveFocus()
  })

  it('abre pelo teclado (Enter e seta para baixo)', async () => {
    const { gatilho } = montar()
    gatilho.focus()
    await userEvent.keyboard('{Enter}')
    expect(screen.getByRole('menu')).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitem', { name: 'Editar' })).toHaveFocus()
  })

  it('escolher um item executa a ação e fecha o menu', async () => {
    const { excluir, editar } = montar()
    await userEvent.click(screen.getByRole('button', { name: /Mais ações/ }))
    await userEvent.keyboard('{End}{Enter}')
    expect(excluir).toHaveBeenCalledTimes(1)
    expect(editar).not.toHaveBeenCalled()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('clique fora ou Tab fecham o menu', async () => {
    const { gatilho } = montar()
    await userEvent.click(gatilho)
    await userEvent.click(screen.getByRole('button', { name: 'Fora' }))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    await userEvent.click(gatilho)
    await userEvent.tab()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})
