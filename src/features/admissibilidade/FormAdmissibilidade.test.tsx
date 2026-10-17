// @vitest-environment jsdom
// Admissibilidade simplificada (Simplificação 2/4): admitida (sim/não), motivo (obrigatório se "não") e páginas
// inicial/final por PA com página de corte. Sem checklist 28.1 nem de formatação (28.5).
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FormAdmissibilidade } from './FormAdmissibilidade'

const LIMITES = [12, 12, 8, 12, 10, 8]

function montar(props: Partial<Parameters<typeof FormAdmissibilidade>[0]> = {}) {
  const onSalvar = vi.fn().mockResolvedValue(undefined)
  render(<FormAdmissibilidade somenteLeitura={false} onSalvar={onSalvar} {...props} />)
  return onSalvar
}

const linhaPA = (codigo: string) => screen.getByRole('row', { name: new RegExp(`^${codigo}\\b`) })

async function preencherPaginas() {
  let pagina = 3
  for (const [i, limite] of LIMITES.entries()) {
    const linha = linhaPA(`PA${i + 1}`)
    await userEvent.type(within(linha).getByLabelText(`Página inicial do PA${i + 1}`), String(pagina))
    await userEvent.type(within(linha).getByLabelText(`Página final do PA${i + 1}`), String(pagina + limite - 1))
    pagina += limite
  }
}

const registrar = () => userEvent.click(screen.getByRole('button', { name: 'Registrar admissibilidade' }))

describe('Admissibilidade simplificada (Anexo III, item 28)', () => {
  it('só duas seções: admitida (sim/não) com motivo e páginas por PA; sem checklist 28.1 nem 28.5', () => {
    montar()
    expect(screen.getByRole('region', { name: '1. Admissão' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '2. Páginas por Plano de Ação' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Sim, admitida' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Não admitida' })).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.queryByText(/28\.1|28\.5|Irregularidades/)).not.toBeInTheDocument()
  })

  it('tabela de páginas: calcula páginas e página de corte e alerta quando excede o limite', async () => {
    montar()
    const pa3 = linhaPA('PA3')
    await userEvent.type(within(pa3).getByLabelText('Página inicial do PA3'), '30')
    await userEvent.type(within(pa3).getByLabelText('Página final do PA3'), '39')
    expect(pa3).toHaveTextContent('10')
    expect(pa3).toHaveTextContent('37')
    expect(within(pa3).getByText('Excede o limite de 8 em 2 página(s)')).toBeInTheDocument()
    expect(pa3).toHaveAttribute('data-excede', 'true')
    expect(screen.getByRole('alert', { name: 'Limite de páginas' })).toHaveTextContent('PA3 excede o limite de 8 em 2 página(s)')
  })

  it('não admitida exige motivo (o campo só aparece com "Não admitida")', async () => {
    const onSalvar = montar()
    expect(screen.queryByRole('textbox', { name: /^Motivo/ })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: 'Não admitida' }))
    await registrar()
    expect(await screen.findByText('Informe o motivo da não admissão (ao menos 10 caracteres).')).toBeInTheDocument()
    expect(onSalvar).not.toHaveBeenCalled()
    await userEvent.type(screen.getByRole('textbox', { name: /^Motivo/ }), 'Caderno entregue fora do prazo.')
    await registrar()
    await waitFor(() => expect(onSalvar).toHaveBeenCalledTimes(1))
    expect(onSalvar.mock.calls[0]![0]).toMatchObject({ admitida: false, motivo: 'Caderno entregue fora do prazo.' })
  })

  it('admitida exige as páginas; envia no formato da /api', async () => {
    const onSalvar = montar()
    await userEvent.click(screen.getByRole('radio', { name: 'Sim, admitida' }))
    await registrar()
    expect(await screen.findAllByText('Informe a página inicial (inteiro a partir de 1).')).not.toHaveLength(0)
    expect(onSalvar).not.toHaveBeenCalled()
    await preencherPaginas()
    await registrar()
    await waitFor(() => expect(onSalvar).toHaveBeenCalledTimes(1))
    const corpo = onSalvar.mock.calls[0]![0] as { admitida: boolean; planos: unknown[] }
    expect(corpo).toEqual({ admitida: true, planos: expect.any(Array) })
    expect(corpo.planos[0]).toEqual({ codigo: 'PA1', paginaInicial: 3, paginaFinal: 14 })
    expect(corpo.planos).toHaveLength(6)
  })

  it('preenche com o registro gravado', () => {
    montar({
      valor: {
        admitida: false,
        motivo: 'Arquivo ilegível.',
        situacao: 'nao_admitida',
        planos: [{ codigo: 'PA1', paginaInicial: 3, paginaFinal: 14, limite: 12, paginas: 12, paginaCorte: 14, excede: 0 }],
      },
    })
    expect(screen.getByRole('radio', { name: 'Não admitida' })).toBeChecked()
    expect(screen.getByRole('textbox', { name: /^Motivo/ })).toHaveValue('Arquivo ilegível.')
    expect(within(linhaPA('PA1')).getByLabelText('Página inicial do PA1')).toHaveValue(3)
  })

  it('somente leitura: sem botão de registrar', () => {
    montar({ somenteLeitura: true, motivoSomenteLeitura: 'Nenhuma sessão aberta.' })
    expect(screen.queryByRole('button', { name: 'Registrar admissibilidade' })).not.toBeInTheDocument()
    expect(screen.getByText('Nenhuma sessão aberta.')).toBeInTheDocument()
  })
})
