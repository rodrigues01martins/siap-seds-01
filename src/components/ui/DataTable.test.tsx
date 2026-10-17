// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DataTable, type ColunaTabela } from './DataTable'

interface Linha {
  id: string
  osc: string
  lote: string
  nf: number
}

const LINHAS: Linha[] = [
  { id: 'a', osc: 'Instituto Alfa', lote: 'L1', nf: 94 },
  { id: 'b', osc: 'Associação Beta', lote: 'L1', nf: 110.5 },
  { id: 'c', osc: 'Centro Gama', lote: 'L2', nf: 72 },
  { id: 'd', osc: 'Obra Épsilon', lote: 'L2', nf: 88 },
  { id: 'e', osc: 'Fundação Delta', lote: 'L1', nf: 101 },
]

const COLUNAS: ColunaTabela<Linha>[] = [
  { id: 'osc', titulo: 'OSC', celula: (l) => l.osc, ordenar: (l) => l.osc },
  { id: 'lote', titulo: 'Lote', celula: (l) => l.lote },
  { id: 'nf', titulo: 'NF', celula: (l) => String(l.nf), ordenar: (l) => l.nf, alinhar: 'direita' },
]

const nomes = () => screen.getAllByRole('row').slice(1).map((r) => within(r).getAllByRole('cell')[0]!.textContent)

function montar(props: Partial<Parameters<typeof DataTable<Linha>>[0]> = {}) {
  return render(
    <DataTable
      rotulo="Propostas"
      colunas={COLUNAS}
      linhas={LINHAS}
      chave={(l) => l.id}
      busca={{ texto: (l) => l.osc }}
      filtros={[{ id: 'lote', rotulo: 'Lote', opcoes: [{ valor: 'L1', rotulo: 'L1' }, { valor: 'L2', rotulo: 'L2' }], aplicar: (l, v) => l.lote === v }]}
      acoes={(l) => <button type="button">Abrir {l.osc}</button>}
      {...props}
    />,
  )
}

describe('DataTable', () => {
  it('tabela com legenda, cabeçalho 48 px e linhas confortáveis (56 px) por padrão; ações por linha', () => {
    montar()
    const tabela = screen.getByRole('table', { name: 'Propostas' })
    expect(within(tabela).getAllByRole('columnheader')[0]).toHaveClass('h-(--sds-table-header-height)')
    expect(within(tabela).getAllByRole('row')).toHaveLength(6)
    expect(within(tabela).getAllByRole('cell')[0]).toHaveClass('h-(--sds-table-row-height-comfortable)')
    expect(screen.getByRole('button', { name: 'Abrir Centro Gama' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Ações' })).toBeInTheDocument()
  })

  it('contêiner com rolagem posicionado: texto sr-only (absoluto) das células não escapa e não cria rolagem na página', () => {
    montar()
    const conteiner = screen.getByRole('table', { name: 'Propostas' }).parentElement!
    expect(conteiner).toHaveClass('overflow-x-auto')
    expect(conteiner).toHaveClass('relative')
  })

  it('ordenação pelo cabeçalho (aria-sort), crescente e decrescente, também pelo teclado', async () => {
    montar()
    const nf = screen.getByRole('columnheader', { name: /NF/ })
    expect(nf).toHaveAttribute('aria-sort', 'none')
    await userEvent.click(within(nf).getByRole('button'))
    expect(nf).toHaveAttribute('aria-sort', 'ascending')
    expect(nomes()).toEqual(['Centro Gama', 'Obra Épsilon', 'Instituto Alfa', 'Fundação Delta', 'Associação Beta'])
    within(nf).getByRole('button').focus()
    await userEvent.keyboard('{Enter}')
    expect(nf).toHaveAttribute('aria-sort', 'descending')
    expect(nomes()[0]).toBe('Associação Beta')
    expect(screen.getByRole('columnheader', { name: 'Lote' })).not.toHaveAttribute('aria-sort')
  })

  it('busca (sem diferenciar acentos) e filtro, com o total anunciado', async () => {
    montar()
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar' }), 'epsilon')
    expect(nomes()).toEqual(['Obra Épsilon'])
    expect(screen.getByText('1 de 1 registro')).toBeInTheDocument()
    await userEvent.clear(screen.getByRole('searchbox'))
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Lote' }), 'L2')
    expect(nomes()).toEqual(['Centro Gama', 'Obra Épsilon'])
  })

  it('paginação: anterior/próxima, faixa exibida e botões bloqueados nas pontas', async () => {
    montar({ porPagina: 2 })
    const paginacao = screen.getByRole('navigation', { name: 'Paginação de Propostas' })
    expect(within(paginacao).getByText('1–2 de 5 registros')).toBeInTheDocument()
    expect(within(paginacao).getByRole('button', { name: 'Página anterior' })).toBeDisabled()
    await userEvent.click(within(paginacao).getByRole('button', { name: 'Próxima página' }))
    await userEvent.click(within(paginacao).getByRole('button', { name: 'Próxima página' }))
    expect(within(paginacao).getByText('5–5 de 5 registros')).toBeInTheDocument()
    expect(within(paginacao).getByRole('button', { name: 'Próxima página' })).toBeDisabled()
    expect(nomes()).toEqual(['Fundação Delta'])
  })

  it('densidade compacta (48 px)', async () => {
    montar()
    await userEvent.click(screen.getByRole('button', { name: 'Compacta' }))
    expect(screen.getByRole('button', { name: 'Compacta' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getAllByRole('cell')[0]).toHaveClass('h-(--sds-table-row-height-compact)')
  })

  it('teclado nas linhas: só a primeira no Tab; setas, Home e End movem o foco', async () => {
    montar()
    const linhas = screen.getAllByRole('row').slice(1)
    expect(linhas[0]).toHaveAttribute('tabindex', '0')
    expect(linhas[1]).toHaveAttribute('tabindex', '-1')
    linhas[0]!.focus()
    await userEvent.keyboard('{ArrowDown}')
    expect(linhas[1]).toHaveFocus()
    await userEvent.keyboard('{End}')
    expect(linhas[4]).toHaveFocus()
    await userEvent.keyboard('{ArrowUp}{Home}')
    expect(linhas[0]).toHaveFocus()
  })

  it('estados: carregando, vazio e erro (com tentar novamente)', async () => {
    const tentar = vi.fn()
    const { rerender } = montar({ carregando: true })
    expect(screen.getByRole('status', { name: 'Carregando Propostas' })).toBeInTheDocument()
    rerender(<DataTable rotulo="Propostas" colunas={COLUNAS} linhas={[]} chave={(l) => l.id} vazio={{ titulo: 'Nenhuma proposta' }} />)
    expect(screen.getByRole('heading', { name: 'Nenhuma proposta' })).toBeInTheDocument()
    rerender(<DataTable rotulo="Propostas" colunas={COLUNAS} linhas={[]} chave={(l) => l.id} erro="Sem conexão." onTentarNovamente={tentar} />)
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(tentar).toHaveBeenCalled()
  })
})
