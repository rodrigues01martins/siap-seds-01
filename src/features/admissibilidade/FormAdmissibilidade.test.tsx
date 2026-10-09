// @vitest-environment jsdom
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MATRIZ_2026 } from '../../domain/matriz'
import { FormAdmissibilidade } from './FormAdmissibilidade'

const { requisitosEssenciais } = MATRIZ_2026.admissibilidade
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

async function marcarRequisitos() {
  for (const r of requisitosEssenciais) {
    if (r.codigo === '28.1.VII') continue
    await userEvent.click(screen.getByRole('checkbox', { name: new RegExp(`^${r.codigo.replace(/\./g, '\\.')} `) }))
  }
}

const registrar = () => userEvent.click(screen.getByRole('button', { name: 'Registrar admissibilidade' }))

describe('Tela de admissibilidade (Anexo III, item 28)', () => {
  it('checklist com os 10 requisitos do JSON; 28.1.VII vem da tabela de PAs (não editável)', () => {
    montar()
    for (const r of requisitosEssenciais) {
      expect(screen.getByRole('checkbox', { name: `${r.codigo} — ${r.descricao}` })).toBeInTheDocument()
    }
    expect(screen.getByRole('checkbox', { name: /^28\.1\.VII / })).toBeDisabled()
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
  })

  it('PA ausente: desclassificação automática (28.2) e 28.1.VII desmarcado; admitir é recusado', async () => {
    montar()
    await marcarRequisitos()
    await preencherPaginas()
    expect(screen.getByRole('checkbox', { name: /^28\.1\.VII / })).toBeChecked()
    await userEvent.click(within(linhaPA('PA4')).getByRole('checkbox', { name: 'PA4 ausente' }))
    expect(screen.getByRole('alert', { name: 'Desclassificação' })).toHaveTextContent('Ausência do PA4')
    expect(screen.getByRole('checkbox', { name: /^28\.1\.VII / })).not.toBeChecked()
    await userEvent.click(screen.getByRole('radio', { name: 'Admitida' }))
    await registrar()
    expect(await screen.findByText('Requisito essencial 28.1.VII não atendido: a proposta não pode ser admitida.')).toBeInTheDocument()
  })

  it('não admitida exige motivação', async () => {
    const onSalvar = montar()
    await preencherPaginas()
    await userEvent.click(screen.getByRole('radio', { name: 'Não admitida' }))
    await registrar()
    expect(await screen.findByText('Informe a motivação da não admissão (ao menos 10 caracteres).')).toBeInTheDocument()
    expect(onSalvar).not.toHaveBeenCalled()
  })

  it('envia no formato da /api, com irregularidades formais (28.5)', async () => {
    const onSalvar = montar()
    await marcarRequisitos()
    await preencherPaginas()
    await userEvent.click(screen.getByRole('checkbox', { name: /^28\.5\.II / }))
    await userEvent.type(screen.getByLabelText('Observação sobre as irregularidades'), 'Página 7 repetida.')
    await userEvent.click(screen.getByRole('radio', { name: 'Admitida' }))
    await registrar()
    await waitFor(() => expect(onSalvar).toHaveBeenCalledTimes(1))
    const corpo = onSalvar.mock.calls[0]![0] as Record<string, unknown>
    expect(corpo).toMatchObject({
      resultado: 'admitida',
      irregularidadesFormais: ['28.5.II'],
      observacaoIrregularidades: 'Página 7 repetida.',
    })
    expect(Object.values(corpo.requisitos as Record<string, boolean>).every(Boolean)).toBe(true)
    expect((corpo.planos as unknown[])[0]).toEqual({ codigo: 'PA1', ausente: false, paginaInicial: 3, paginaFinal: 14 })
  })

  it('somente leitura: sem botão de registrar', () => {
    montar({ somenteLeitura: true, motivoSomenteLeitura: 'Seu perfil consulta a admissibilidade.' })
    expect(screen.queryByRole('button', { name: 'Registrar admissibilidade' })).not.toBeInTheDocument()
    expect(screen.getByText('Seu perfil consulta a admissibilidade.')).toBeInTheDocument()
  })
})
