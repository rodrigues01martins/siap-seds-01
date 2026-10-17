// @vitest-environment jsdom
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ErroApi } from '../../lib/api'
import { DialogoResetSessao } from './DialogoResetSessao'

const simulado = vi.hoisted(() => ({ chamarApi: vi.fn() }))
vi.mock('../../lib/api', async (original) => ({ ...(await original<object>()), chamarApi: simulado.chamarApi }))

const PREVIA = {
  sessaoId: 's1',
  status: 'aberta',
  propostas: [{ propostaId: 'p1', protocolo: 'PROT-1', reverter: ['Nível 1.1 da D1'], apagar: ['Nível 1.2 da D1', 'Experiência “Gestão do CASE”'] }],
  desempates: { reverter: [], apagar: ['Desempate do lote L1'] },
  total: 4,
  bloqueios: [],
}
const MOTIVO = 'Conflito de interesse declarado: a Comissão decidiu refazer.'

function montar(aberto = true) {
  const onConcluido = vi.fn()
  const onFechar = vi.fn()
  render(<DialogoResetSessao aberto={aberto} chamamentoId="ch1" sessaoId="s1" rotuloSessao="sessão de 10/11/2026" nomeProposta={(id) => (id === 'p1' ? 'Instituto Alfa' : id)} onFechar={onFechar} onConcluido={onConcluido} />)
  return { onConcluido, onFechar }
}
const dialogo = () => screen.getByRole('alertdialog')
const botao = () => within(dialogo()).getByRole('button', { name: 'Resetar sessão' })

beforeEach(() => {
  simulado.chamarApi.mockReset().mockImplementation(async (_c: string, { metodo }: { metodo: string }) =>
    metodo === 'GET' ? PREVIA : { revertidos: 1, apagados: 3, propostas: ['p1'], resets: 1 },
  )
})

describe('DialogoResetSessao', () => {
  it('fechado não consulta a /api', () => {
    montar(false)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(simulado.chamarApi).not.toHaveBeenCalled()
  })

  it('mostra a prévia por proposta (revertido e apagado) e os desempates', async () => {
    montar()
    expect(screen.getByRole('alertdialog', { name: 'Resetar a sessão de 10/11/2026?' })).toBeInTheDocument()
    expect(simulado.chamarApi).toHaveBeenCalledWith('/api/sessao?chamamentoId=ch1&sessaoId=s1&simular=true', { metodo: 'GET' })
    const proposta = await within(dialogo()).findByRole('region', { name: 'Instituto Alfa (PROT-1)' })
    expect(within(proposta).getByRole('list', { name: 'Volta ao valor anterior' })).toHaveTextContent('Nível 1.1 da D1')
    expect(within(proposta).getByRole('list', { name: 'Será apagado' })).toHaveTextContent('Experiência “Gestão do CASE”')
    expect(within(dialogo()).getByRole('region', { name: 'Desempates' })).toHaveTextContent('Desempate do lote L1')
    expect(dialogo()).toHaveTextContent('4 registros')
    expect(dialogo()).toHaveAccessibleDescription(/Diligências não são afetadas/)
  })

  it('"Resetar sessão" só habilita com justificativa (mín. 20) e a palavra RESETAR', async () => {
    const { onConcluido } = montar()
    await within(dialogo()).findByRole('region', { name: 'Instituto Alfa (PROT-1)' })
    expect(botao()).toBeDisabled()
    await userEvent.type(within(dialogo()).getByLabelText(/Justificativa do reset/), MOTIVO)
    await userEvent.type(within(dialogo()).getByLabelText(/Para confirmar, digite RESETAR/), 'resetar')
    expect(botao()).toBeDisabled()
    await userEvent.clear(within(dialogo()).getByLabelText(/Para confirmar, digite RESETAR/))
    await userEvent.type(within(dialogo()).getByLabelText(/Para confirmar, digite RESETAR/), 'RESETAR')
    expect(botao()).toBeEnabled()

    await userEvent.click(botao())
    await waitFor(() => expect(onConcluido).toHaveBeenCalledWith(expect.objectContaining({ resets: 1 })))
    expect(simulado.chamarApi).toHaveBeenLastCalledWith('/api/sessao', {
      metodo: 'PATCH',
      corpo: { acao: 'resetar', chamamentoId: 'ch1', sessaoId: 's1', justificativa: MOTIVO },
    })
  })

  it('bloqueio: Alert de erro com o motivo e os itens; sem campos; botão desabilitado', async () => {
    simulado.chamarApi.mockResolvedValue({
      ...PREVIA,
      bloqueios: [{ mensagem: 'Há proposta homologada entre as afetadas pela sessão. Reabra antes de resetar:', itens: ['protocolo PROT-1'] }],
    })
    montar()
    const alerta = await within(dialogo()).findByRole('alert')
    expect(alerta).toHaveTextContent('Reset bloqueado')
    expect(alerta).toHaveTextContent('Reabra antes de resetar')
    expect(within(alerta).getByRole('listitem')).toHaveTextContent('protocolo PROT-1')
    expect(within(dialogo()).queryByLabelText(/Justificativa do reset/)).not.toBeInTheDocument()
    expect(botao()).toBeDisabled()
  })

  it('nada a reverter: avisa (a sessão é marcada como reiniciada mesmo assim)', async () => {
    simulado.chamarApi.mockResolvedValue({ ...PREVIA, propostas: [], desempates: { reverter: [], apagar: [] }, total: 0 })
    montar()
    expect(await within(dialogo()).findByText(/Nenhum registro desta sessão para desfazer/)).toBeInTheDocument()
  })

  it('erro da /api no reset aparece como Alert de erro', async () => {
    montar()
    await within(dialogo()).findByRole('region', { name: 'Instituto Alfa (PROT-1)' })
    simulado.chamarApi.mockRejectedValueOnce(new ErroApi(503, 'O reset foi iniciado, mas não terminou. Repita a operação para concluir.'))
    await userEvent.type(within(dialogo()).getByLabelText(/Justificativa do reset/), MOTIVO)
    await userEvent.type(within(dialogo()).getByLabelText(/Para confirmar, digite RESETAR/), 'RESETAR')
    await userEvent.click(botao())
    expect(await within(dialogo()).findByRole('alert')).toHaveTextContent('Repita a operação')
  })
})
