// @vitest-environment jsdom
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MATRIZ_2026 } from '../../domain/matriz'
import { ErroApi } from '../../lib/api'
import { PainelSubcriterio } from './PainelSubcriterio'

const PLANOS = MATRIZ_2026.dimensao1.planos
const subcriterio = (codigo: string) => PLANOS.flatMap((p) => p.subcriterios).find((s) => s.codigo === codigo)!

function montar(codigo = '3.1', props: Partial<Parameters<typeof PainelSubcriterio>[0]> = {}) {
  const onSalvar = vi.fn().mockResolvedValue(undefined)
  render(<PainelSubcriterio codigo={codigo} somenteLeitura={false} onSalvar={onSalvar} {...props} />)
  return onSalvar
}

const salvar = () => userEvent.click(screen.getByRole('button', { name: 'Salvar avaliação' }))

async function preencher({ nivel = 3, justificativa = 'Metodologia descrita com fluxos e responsáveis.', paginas = '2, 5' } = {}) {
  await userEvent.click(screen.getByRole('radio', { name: new RegExp(`^Nível ${nivel}\\b`) }))
  await userEvent.click(screen.getByRole('radio', { name: 'Unanimidade' }))
  await userEvent.type(screen.getByLabelText(/^Justificativa/), justificativa)
  if (paginas) await userEvent.type(screen.getByLabelText('Páginas citadas'), paginas)
}

describe('Painel do subcritério', () => {
  it('mostra código, título, elementos (apoio) e a escala 0–4 com todos os descritores visíveis', () => {
    montar('3.1')
    const s = subcriterio('3.1')
    expect(screen.getByRole('heading', { name: `${s.codigo} — ${s.titulo}` })).toBeInTheDocument()
    for (const elemento of s.elementos) expect(screen.getByText(elemento)).toBeInTheDocument()
    expect(screen.getByText(/apoio à discussão — não gera nota/i)).toBeInTheDocument()
    for (const { nivel, descritor } of MATRIZ_2026.dimensao1.escala) {
      expect(screen.getByRole('radio', { name: new RegExp(`^Nível ${nivel}\\b`) })).toBeInTheDocument()
      expect(screen.getByText(descritor)).toBeVisible()
    }
  })

  it('checklist de elementos: presente/parcial/ausente por elemento, sem enviar nada', async () => {
    const onSalvar = montar('3.1')
    const primeiro = screen.getAllByRole('group', { name: /^Elemento 1/ })[0]!
    await userEvent.click(within(primeiro).getByRole('radio', { name: 'Parcial' }))
    expect(within(primeiro).getByRole('radio', { name: 'Parcial' })).toBeChecked()
    expect(onSalvar).not.toHaveBeenCalled()
  })

  it('envia nível, decisão, justificativa e páginas no formato da /api', async () => {
    const onSalvar = montar('3.1')
    await preencher()
    await salvar()
    await waitFor(() => expect(onSalvar).toHaveBeenCalledTimes(1))
    expect(onSalvar).toHaveBeenCalledWith({
      codigo: '3.1',
      nivel: 3,
      justificativa: 'Metodologia descrita com fluxos e responsáveis.',
      paginas: [2, 5],
      decisao: 'unanimidade',
    })
  })

  it('voto divergente só aparece com decisão por maioria e vai junto', async () => {
    const onSalvar = montar('3.1')
    expect(screen.queryByLabelText('Voto divergente')).not.toBeInTheDocument()
    await preencher()
    await userEvent.click(screen.getByRole('radio', { name: 'Maioria' }))
    await userEvent.type(screen.getByLabelText('Voto divergente'), 'Membro X: nível 2.')
    await salvar()
    await waitFor(() => expect(onSalvar).toHaveBeenCalled())
    expect(onSalvar.mock.calls[0]![0]).toMatchObject({ decisao: 'maioria', votoDivergente: 'Membro X: nível 2.' })
  })

  it('contador da justificativa com o mínimo do chamamento; curta não envia', async () => {
    const onSalvar = montar('3.1', { justificativaMinima: 30 })
    await preencher({ justificativa: 'Curta demais.' })
    expect(screen.getByText('13 / mín. 30 caracteres')).toBeInTheDocument()
    await salvar()
    expect(await screen.findByText('A justificativa deve ter ao menos 30 caracteres.')).toBeInTheDocument()
    expect(onSalvar).not.toHaveBeenCalled()
  })

  it('página de corte: avisa ANTES de enviar e não envia', async () => {
    const onSalvar = montar('3.1')
    await preencher({ paginas: '2, 9' })
    expect(screen.getByRole('status', { name: 'Aviso de página de corte' })).toHaveTextContent(
      'Página 9 acima do limite de 8 páginas do PA3',
    )
    await salvar()
    expect(screen.getByLabelText('Páginas citadas')).toHaveAccessibleDescription('Página 9 acima do limite de 8 páginas do PA3.')
    expect(onSalvar).not.toHaveBeenCalled()
  })

  it('página inválida no texto → mensagem do domínio', async () => {
    const onSalvar = montar('3.1')
    await preencher({ paginas: '2, x' })
    await salvar()
    expect(screen.getByLabelText('Páginas citadas')).toHaveAccessibleDescription('As páginas devem ser números inteiros a partir de 1.')
    expect(onSalvar).not.toHaveBeenCalled()
  })

  it.each(['1.1', '1.2'])('nível 0 em %s → alerta de desclassificação', async (codigo) => {
    montar(codigo)
    await userEvent.click(screen.getByRole('radio', { name: /^Nível 0\b/ }))
    expect(screen.getByRole('alert', { name: 'Subcritério eliminatório' })).toHaveTextContent(
      `Nível 0 no subcritério ${codigo} implica desclassificação da proposta`,
    )
  })

  it('nível 0 em subcritério não eliminatório não alerta', async () => {
    montar('2.1')
    await userEvent.click(screen.getByRole('radio', { name: /^Nível 0\b/ }))
    expect(screen.queryByRole('alert', { name: 'Subcritério eliminatório' })).not.toBeInTheDocument()
  })

  it('preenche com o registro já gravado', () => {
    montar('3.1', {
      registro: { nivel: 2, justificativa: 'Registro anterior da Comissão.', paginas: [3, 4], decisao: 'maioria', votoDivergente: 'Y' },
    })
    expect(screen.getByRole('radio', { name: /^Nível 2\b/ })).toBeChecked()
    expect(screen.getByLabelText('Páginas citadas')).toHaveValue('3, 4')
    expect(screen.getByLabelText('Voto divergente')).toHaveValue('Y')
  })

  it('somente leitura (homologada ou sem permissão): sem botão de salvar e com o motivo', () => {
    montar('3.1', { somenteLeitura: true, motivoSomenteLeitura: 'Proposta homologada: somente leitura.' })
    expect(screen.queryByRole('button', { name: 'Salvar avaliação' })).not.toBeInTheDocument()
    expect(screen.getByText('Proposta homologada: somente leitura.')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /^Nível 3\b/ })).toBeDisabled()
  })

  it('erro da /api (409) aparece no alerta', async () => {
    const onSalvar = vi.fn().mockRejectedValue(new ErroApi(409, 'Avaliação só pode ser registrada em sessão aberta da Comissão.'))
    render(<PainelSubcriterio codigo="3.1" somenteLeitura={false} onSalvar={onSalvar} />)
    await preencher()
    await salvar()
    expect(await screen.findByText('Avaliação só pode ser registrada em sessão aberta da Comissão.')).toBeInTheDocument()
  })
})
