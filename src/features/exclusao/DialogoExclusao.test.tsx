// @vitest-environment jsdom
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ErroApi } from '../../lib/api'
import { BotaoExcluir, DialogoExclusao, type AlvoDialogoExclusao } from './DialogoExclusao'

const simulado = vi.hoisted(() => ({ chamarApi: vi.fn() }))
vi.mock('../../lib/api', async (original) => ({ ...(await original<object>()), chamarApi: simulado.chamarApi }))

const PROPOSTA: AlvoDialogoExclusao = {
  rota: '/api/propostas',
  ids: { chamamentoId: 'ch1', propostaId: 'p1' },
  nome: 'proposta PROT-2026-0001 (Instituto Esperança)',
}
const PREVIA = { itens: { proposta: 1, avaliacao: 28, experiencia: 4 }, total: 33, resumo: '1 proposta, 28 avaliações, 4 experiências' }

function montar(alvo: AlvoDialogoExclusao = PROPOSTA) {
  const onExcluido = vi.fn()
  const onFechar = vi.fn()
  render(<DialogoExclusao alvo={alvo} onFechar={onFechar} onExcluido={onExcluido} />)
  return { onExcluido, onFechar }
}

const dialogo = () => screen.getByRole('alertdialog')
const botaoExcluir = () => within(dialogo()).getByRole('button', { name: 'Excluir' })

beforeEach(() => {
  simulado.chamarApi.mockReset().mockResolvedValue(PREVIA)
})

describe('DialogoExclusao: um único ConfirmDialog destrutivo com a prévia', () => {
  it('fechado (alvo nulo) não renderiza nem consulta a /api', () => {
    render(<DialogoExclusao alvo={null} onFechar={vi.fn()} onExcluido={vi.fn()} />)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(simulado.chamarApi).not.toHaveBeenCalled()
  })

  it('busca a prévia (GET ?simular=true) e mostra "Serão apagados: …"; sem justificativa e sem digitação', async () => {
    montar()
    expect(screen.getByRole('alertdialog', { name: 'Excluir proposta PROT-2026-0001 (Instituto Esperança)' })).toBeInTheDocument()
    expect(simulado.chamarApi).toHaveBeenCalledWith('/api/propostas?chamamentoId=ch1&propostaId=p1&simular=true', { metodo: 'GET' })
    expect(await within(dialogo()).findByText('Serão apagados: 1 proposta, 28 avaliações, 4 experiências.')).toBeInTheDocument()
    expect(within(dialogo()).queryByRole('textbox')).not.toBeInTheDocument()
    // Foco inicial no caminho seguro.
    expect(within(dialogo()).getByRole('button', { name: 'Cancelar' })).toHaveFocus()
  })

  it('"Excluir" só habilita com a prévia carregada; confirma com DELETE e devolve o resultado', async () => {
    simulado.chamarApi.mockImplementation(async (_c: string, { metodo }: { metodo: string }) => (metodo === 'GET' ? PREVIA : PREVIA))
    const { onExcluido } = montar()
    expect(botaoExcluir()).toBeDisabled()
    await within(dialogo()).findByText(/Serão apagados/)
    await userEvent.click(botaoExcluir())
    await waitFor(() => expect(onExcluido).toHaveBeenCalledWith(PREVIA))
    expect(simulado.chamarApi).toHaveBeenLastCalledWith('/api/propostas', { metodo: 'DELETE', corpo: { chamamentoId: 'ch1', propostaId: 'p1' } })
  })

  it('índice do documento vai como número no DELETE e como texto na prévia', async () => {
    montar({ rota: '/api/experiencia', ids: { chamamentoId: 'ch1', propostaId: 'p1', id: 'e1', documento: 0 }, nome: 'documento 1' })
    expect(simulado.chamarApi).toHaveBeenCalledWith('/api/experiencia?chamamentoId=ch1&propostaId=p1&id=e1&documento=0&simular=true', { metodo: 'GET' })
    await within(dialogo()).findByText(/Serão apagados/)
    await userEvent.click(botaoExcluir())
    await waitFor(() =>
      expect(simulado.chamarApi).toHaveBeenLastCalledWith('/api/experiencia', { metodo: 'DELETE', corpo: { chamamentoId: 'ch1', propostaId: 'p1', id: 'e1', documento: 0 } }),
    )
  })

  it('erro da prévia ou da exclusão aparece no próprio diálogo (alerta)', async () => {
    simulado.chamarApi.mockRejectedValueOnce(new ErroApi(404, 'Registro não encontrado.'))
    montar()
    expect(await within(dialogo()).findByText('Registro não encontrado.')).toBeInTheDocument()
    expect(botaoExcluir()).toBeDisabled()
  })

  it('Cancelar fecha sem apagar', async () => {
    const { onFechar } = montar()
    await userEvent.click(within(dialogo()).getByRole('button', { name: 'Cancelar' }))
    expect(onFechar).toHaveBeenCalled()
    expect(simulado.chamarApi).toHaveBeenCalledTimes(1)
  })
})

describe('BotaoExcluir: ícone de lixeira com nome acessível', () => {
  it('rótulo "Excluir <nome>" e clique', async () => {
    const onClick = vi.fn()
    render(<BotaoExcluir nome="OSC Instituto Esperança" onClick={onClick} />)
    await userEvent.click(screen.getByRole('button', { name: 'Excluir OSC Instituto Esperança' }))
    expect(onClick).toHaveBeenCalled()
  })
})
