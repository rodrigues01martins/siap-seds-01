// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { RegistroAuditoria } from '../../relatorios/auditoria'
import { FiltrosAuditoria, TabelaAuditoria } from './TabelaAuditoria'

const REGISTROS: RegistroAuditoria[] = [
  {
    id: 'r1',
    caminho: 'chamamentos/ch1/propostas/p1',
    acao: 'editar',
    antes: { bloqueada: false },
    depois: { bloqueada: true },
    uid: 'u-pres',
    email: 'presidente@seds.go.gov.br',
    perfil: 'presidente',
    dataHora: new Date('2026-11-10T13:00:00Z'),
  },
]

describe('TabelaAuditoria', () => {
  it('mostra quem, quando, ação, objeto e o antes/depois dos campos alterados', async () => {
    render(<TabelaAuditoria registros={REGISTROS} />)
    const linha = screen.getByRole('row', { name: /presidente@seds.go.gov.br/ })
    expect(within(linha).getByText('10/11/2026 10:00:00')).toBeInTheDocument()
    expect(within(linha).getByText('Proposta p1')).toBeInTheDocument()
    expect(within(linha).getByText('editar')).toBeInTheDocument()

    await userEvent.click(within(linha).getByRole('button', { name: 'Ver antes/depois' }))
    const detalhe = screen.getByRole('table', { name: 'Antes e depois — Proposta p1' })
    expect(within(detalhe).getByRole('row', { name: 'bloqueada false true' })).toBeInTheDocument()
  })

  it('é somente leitura: nenhum campo editável na tabela', () => {
    render(<TabelaAuditoria registros={REGISTROS} />)
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.queryByRole('button', { name: /excluir|editar|salvar/i })).toBeNull()
  })

  it('lista vazia', () => {
    render(<TabelaAuditoria registros={[]} />)
    expect(screen.getByText('Nenhum registro para os filtros escolhidos.')).toBeInTheDocument()
  })
})

describe('FiltrosAuditoria', () => {
  it('aplica proposta, usuário, ação e período', async () => {
    const onAplicar = vi.fn()
    render(<FiltrosAuditoria inicial={{ de: '2026-11-01', ate: '2026-11-10' }} onAplicar={onAplicar} />)
    await userEvent.type(screen.getByLabelText('Proposta'), 'p1')
    await userEvent.type(screen.getByLabelText('Usuário (e-mail ou uid)'), 'relator')
    await userEvent.selectOptions(screen.getByLabelText('Ação'), 'editar')
    await userEvent.click(screen.getByRole('button', { name: 'Filtrar' }))
    expect(onAplicar).toHaveBeenCalledWith({ proposta: 'p1', usuario: 'relator', acao: 'editar', de: '2026-11-01', ate: '2026-11-10' })
  })
})
