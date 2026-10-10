// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { Breadcrumb } from './Breadcrumb'
import { ConfirmDialog } from './ConfirmDialog'
import { Dialog } from './Dialog'
import { Drawer } from './Drawer'
import { Tabs } from './Tabs'

function ComDialog({ aoFechar = () => {} }: { aoFechar?: () => void }) {
  const [aberto, setAberto] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setAberto(true)}>
        Abrir
      </button>
      <Dialog
        aberto={aberto}
        titulo="Editar proposta"
        descricao="Altere o protocolo."
        onFechar={() => {
          aoFechar()
          setAberto(false)
        }}
        rodape={<button type="button">Salvar</button>}
      >
        <label>
          Protocolo <input />
        </label>
      </Dialog>
    </>
  )
}

describe('Dialog', () => {
  it('fechado não renderiza; aberto é um diálogo modal com título e descrição', async () => {
    render(<ComDialog />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }))
    const dialogo = screen.getByRole('dialog', { name: 'Editar proposta' })
    expect(dialogo).toHaveAttribute('aria-modal', 'true')
    expect(dialogo).toHaveAccessibleDescription('Altere o protocolo.')
  })

  it('foco entra no diálogo, fica preso (Tab e Shift+Tab circulam) e volta ao botão ao fechar com Esc', async () => {
    const fechar = vi.fn()
    render(<ComDialog aoFechar={fechar} />)
    const abrir = screen.getByRole('button', { name: 'Abrir' })
    await userEvent.click(abrir)
    const dialogo = screen.getByRole('dialog')
    const [fecharX, campo, salvar] = [
      within(dialogo).getByRole('button', { name: 'Fechar' }),
      within(dialogo).getByRole('textbox', { name: 'Protocolo' }),
      within(dialogo).getByRole('button', { name: 'Salvar' }),
    ]
    expect(campo).toHaveFocus() // primeiro campo, não o botão fechar
    await userEvent.tab()
    expect(salvar).toHaveFocus()
    await userEvent.tab()
    expect(fecharX).toHaveFocus() // circula
    await userEvent.tab({ shift: true })
    expect(salvar).toHaveFocus()
    await userEvent.keyboard('{Escape}')
    expect(fechar).toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(abrir).toHaveFocus()
  })

  it('clique no fundo escurecido fecha; clique dentro não', async () => {
    const fechar = vi.fn()
    render(<ComDialog aoFechar={fechar} />)
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }))
    await userEvent.click(screen.getByRole('textbox'))
    expect(fechar).not.toHaveBeenCalled()
    await userEvent.click(screen.getByTestId('overlay'))
    expect(fechar).toHaveBeenCalled()
  })
})

describe('ConfirmDialog (destrutivo)', () => {
  it('foco começa em Cancelar; confirmar chama a ação; Esc cancela', async () => {
    const confirmar = vi.fn()
    const cancelar = vi.fn()
    render(
      <ConfirmDialog
        aberto
        titulo="Desativar conta?"
        mensagem="A pessoa perde o acesso na hora."
        rotuloConfirmar="Desativar"
        onConfirmar={confirmar}
        onCancelar={cancelar}
      />,
    )
    const dialogo = screen.getByRole('alertdialog', { name: 'Desativar conta?' })
    expect(within(dialogo).getByRole('button', { name: 'Cancelar' })).toHaveFocus()
    expect(within(dialogo).getByRole('button', { name: 'Desativar' })).toHaveClass('bg-button-destructive-bg')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Desativar' }))
    expect(confirmar).toHaveBeenCalled()
    await userEvent.keyboard('{Escape}')
    expect(cancelar).toHaveBeenCalled()
  })

  it('confirmando: botão em carregamento', () => {
    render(<ConfirmDialog aberto confirmando titulo="Excluir?" mensagem="x" rotuloConfirmar="Excluir" onConfirmar={() => {}} onCancelar={() => {}} />)
    expect(screen.getByRole('button', { name: /Excluir/ })).toHaveAttribute('aria-busy', 'true')
  })
})

describe('Drawer', () => {
  it('painel lateral modal com o mesmo foco preso e Esc', async () => {
    const fechar = vi.fn()
    render(
      <Drawer aberto titulo="Gerenciar usuário" onFechar={fechar}>
        <button type="button">Tornar administrador</button>
      </Drawer>,
    )
    const painel = screen.getByRole('dialog', { name: 'Gerenciar usuário' })
    expect(within(painel).getByRole('button', { name: 'Tornar administrador' })).toHaveFocus()
    await userEvent.keyboard('{Escape}')
    expect(fechar).toHaveBeenCalled()
  })
})

describe('Tabs', () => {
  const ABAS = [
    { id: 'adm', rotulo: 'Admissibilidade', conteudo: <p>Checklist 28.1</p> },
    { id: 'd1', rotulo: 'Dimensão 1', conteudo: <p>Subcritérios</p> },
    { id: 'd2', rotulo: 'Dimensão 2', conteudo: <p>Experiências</p> },
  ]

  it('tablist com aria-selected, painel ligado à aba e só a aba ativa no Tab', () => {
    render(<Tabs rotulo="Etapas da avaliação" abas={ABAS} />)
    expect(screen.getByRole('tablist', { name: 'Etapas da avaliação' })).toBeInTheDocument()
    const ativa = screen.getByRole('tab', { name: 'Admissibilidade' })
    expect(ativa).toHaveAttribute('aria-selected', 'true')
    expect(ativa).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('tab', { name: 'Dimensão 1' })).toHaveAttribute('tabindex', '-1')
    expect(screen.getByRole('tabpanel', { name: 'Admissibilidade' })).toHaveTextContent('Checklist 28.1')
  })

  it('setas, Home e End trocam de aba (e circulam)', async () => {
    render(<Tabs rotulo="Etapas" abas={ABAS} />)
    screen.getByRole('tab', { name: 'Admissibilidade' }).focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Dimensão 1' })).toHaveFocus()
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Subcritérios')
    await userEvent.keyboard('{End}')
    expect(screen.getByRole('tab', { name: 'Dimensão 2' })).toHaveAttribute('aria-selected', 'true')
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Admissibilidade' })).toHaveFocus()
    await userEvent.keyboard('{ArrowLeft}{Home}')
    expect(screen.getByRole('tab', { name: 'Admissibilidade' })).toHaveAttribute('aria-selected', 'true')
  })
})

describe('Breadcrumb', () => {
  it('nav com trilha; o último item é a página atual', () => {
    render(
      <MemoryRouter>
        <Breadcrumb itens={[{ rotulo: 'Chamamentos', para: '/' }, { rotulo: 'Lote L1', para: '/chamamentos/ch1' }, { rotulo: 'Classificação' }]} />
      </MemoryRouter>,
    )
    const trilha = screen.getByRole('navigation', { name: 'Trilha de navegação' })
    expect(within(trilha).getByRole('link', { name: 'Chamamentos' })).toHaveAttribute('href', '/')
    expect(within(trilha).getByText('Classificação')).toHaveAttribute('aria-current', 'page')
    expect(within(trilha).getAllByRole('listitem')).toHaveLength(3)
  })
})
