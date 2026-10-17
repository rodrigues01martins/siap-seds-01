// @vitest-environment jsdom
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ErroApi } from '../../lib/api'
import { DialogoExclusao, type AlvoDialogoExclusao } from './DialogoExclusao'

const simulado = vi.hoisted(() => ({ chamarApi: vi.fn() }))
vi.mock('../../lib/api', async (original) => ({ ...(await original<object>()), chamarApi: simulado.chamarApi }))

const PROPOSTA: AlvoDialogoExclusao = {
  tipo: 'proposta',
  ids: { chamamentoId: 'ch1', propostaId: 'p1' },
  identificador: 'PROT-2026-0001',
  nome: 'proposta PROT-2026-0001 (Instituto Esperança)',
}
const OSC: AlvoDialogoExclusao = { tipo: 'osc', ids: { cnpj: '11222333000181' }, identificador: '11.222.333/0001-81', nome: 'OSC Instituto Esperança' }

const PREVIA = {
  caminho: 'chamamentos/ch1/propostas/p1',
  existe: true,
  emExclusao: false,
  subcolecoes: { avaliacoes: 28, experiencias: 3, resultadoD2: 1 },
  total: 33,
  bloqueios: [],
}
const JUSTIFICATIVA = 'Cadastro em duplicidade (despacho SEI 95574999).'

function montar(alvo: AlvoDialogoExclusao = PROPOSTA) {
  const onExcluido = vi.fn()
  const onFechar = vi.fn()
  render(<DialogoExclusao alvo={alvo} onFechar={onFechar} onExcluido={onExcluido} />)
  return { onExcluido, onFechar }
}

const dialogo = () => screen.getByRole('alertdialog')
const botaoExcluir = () => within(dialogo()).getByRole('button', { name: 'Excluir definitivamente' })

beforeEach(() => {
  simulado.chamarApi.mockReset().mockImplementation(async (_caminho: string, { metodo }: { metodo: string }) =>
    metodo === 'GET' ? PREVIA : { caminho: PREVIA.caminho, subcolecoes: PREVIA.subcolecoes, total: PREVIA.total },
  )
})

describe('DialogoExclusao', () => {
  it('fechado (alvo nulo) não renderiza nem consulta a /api', () => {
    render(<DialogoExclusao alvo={null} onFechar={vi.fn()} onExcluido={vi.fn()} />)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(simulado.chamarApi).not.toHaveBeenCalled()
  })

  it('busca a prévia (GET ?simular=true) e mostra o que será apagado', async () => {
    montar()
    expect(screen.getByRole('alertdialog', { name: 'Excluir proposta PROT-2026-0001 (Instituto Esperança)' })).toBeInTheDocument()
    expect(simulado.chamarApi).toHaveBeenCalledWith('/api/propostas?chamamentoId=ch1&propostaId=p1&simular=true', { metodo: 'GET' })
    const lista = await within(dialogo()).findByRole('list', { name: 'O que será apagado' })
    expect(lista).toHaveTextContent('Avaliações da D1: 28')
    expect(lista).toHaveTextContent('Experiências da D2: 3')
    expect(lista).toHaveTextContent('Resultado da D2: 1')
    expect(dialogo()).toHaveTextContent('33 documentos')
    expect(dialogo()).toHaveAccessibleDescription(/não pode ser desfeita/)
  })

  it('"Excluir definitivamente" só habilita com justificativa (mín. 20) e o identificador digitado', async () => {
    const { onExcluido } = montar()
    await within(dialogo()).findByRole('list', { name: 'O que será apagado' })
    expect(botaoExcluir()).toBeDisabled()

    await userEvent.type(within(dialogo()).getByLabelText(/Justificativa da exclusão/), 'Curta demais')
    await userEvent.type(within(dialogo()).getByLabelText(/Para confirmar, digite o protocolo da proposta/), 'PROT-2026-0001')
    expect(botaoExcluir()).toBeDisabled()

    await userEvent.clear(within(dialogo()).getByLabelText(/Justificativa da exclusão/))
    await userEvent.type(within(dialogo()).getByLabelText(/Justificativa da exclusão/), JUSTIFICATIVA)
    await userEvent.clear(within(dialogo()).getByLabelText(/Para confirmar/))
    await userEvent.type(within(dialogo()).getByLabelText(/Para confirmar/), 'PROT-2026-0002')
    expect(botaoExcluir()).toBeDisabled()

    await userEvent.clear(within(dialogo()).getByLabelText(/Para confirmar/))
    await userEvent.type(within(dialogo()).getByLabelText(/Para confirmar/), 'prot-2026-0001 ')
    expect(botaoExcluir()).toBeEnabled()

    await userEvent.click(botaoExcluir())
    await waitFor(() => expect(onExcluido).toHaveBeenCalledWith(expect.objectContaining({ total: 33 })))
    expect(simulado.chamarApi).toHaveBeenLastCalledWith('/api/propostas', {
      metodo: 'DELETE',
      corpo: { chamamentoId: 'ch1', propostaId: 'p1', justificativa: JUSTIFICATIVA },
    })
  })

  it('CNPJ da OSC: aceita digitado com ou sem pontuação', async () => {
    simulado.chamarApi.mockImplementation(async (_c: string, { metodo }: { metodo: string }) =>
      metodo === 'GET' ? { ...PREVIA, caminho: 'oscs/11222333000181', subcolecoes: {}, total: 1 } : { caminho: 'oscs/11222333000181', subcolecoes: {}, total: 1 },
    )
    const { onExcluido } = montar(OSC)
    expect(simulado.chamarApi).toHaveBeenCalledWith('/api/oscs?cnpj=11222333000181&simular=true', { metodo: 'GET' })
    await within(dialogo()).findByText(/Só o próprio registro/)
    await userEvent.type(within(dialogo()).getByLabelText(/Justificativa da exclusão/), JUSTIFICATIVA)
    await userEvent.type(within(dialogo()).getByLabelText(/Para confirmar, digite o CNPJ da OSC/), '11222333000181')
    await userEvent.click(botaoExcluir())
    await waitFor(() => expect(onExcluido).toHaveBeenCalled())
  })

  it('bloqueio: Alert de erro com ícone, motivo e registros; sem campos e botão de excluir desabilitado', async () => {
    simulado.chamarApi.mockResolvedValue({
      ...PREVIA,
      caminho: 'oscs/11222333000181',
      bloqueios: [
        {
          mensagem: 'OSC com 2 propostas vinculadas; exclua as propostas antes de excluir a OSC:',
          itens: ['chamamento 001/2026, protocolo PROT-1 (lote L1)', 'chamamento 002/2026, protocolo PROT-2 (lote L1)'],
        },
      ],
    })
    montar(OSC)
    const alerta = await within(dialogo()).findByRole('alert')
    expect(alerta).toHaveTextContent('Exclusão bloqueada')
    expect(alerta).toHaveTextContent('OSC com 2 propostas vinculadas')
    expect(within(alerta).getAllByRole('listitem')).toHaveLength(2)
    expect(alerta.querySelector('svg')).not.toBeNull()
    expect(within(dialogo()).queryByLabelText(/Justificativa da exclusão/)).not.toBeInTheDocument()
    expect(botaoExcluir()).toBeDisabled()
  })

  it('exclusão interrompida ("excluindo"): avisa e permite concluir', async () => {
    simulado.chamarApi.mockImplementation(async (_c: string, { metodo }: { metodo: string }) => (metodo === 'GET' ? { ...PREVIA, emExclusao: true } : PREVIA))
    montar()
    expect(await within(dialogo()).findByText(/exclusão foi iniciada e não terminou/)).toBeInTheDocument()
    expect(within(dialogo()).getByLabelText(/Justificativa da exclusão/)).toBeInTheDocument()
  })

  it('erro da /api ao excluir (ex.: 409) aparece no diálogo como Alert de erro; nada é dado como excluído', async () => {
    const { onExcluido } = montar()
    await within(dialogo()).findByRole('list', { name: 'O que será apagado' })
    simulado.chamarApi.mockRejectedValueOnce(new ErroApi(409, 'Proposta homologada. Reabra a proposta antes de excluir.'))
    await userEvent.type(within(dialogo()).getByLabelText(/Justificativa da exclusão/), JUSTIFICATIVA)
    await userEvent.type(within(dialogo()).getByLabelText(/Para confirmar/), 'PROT-2026-0001')
    await userEvent.click(botaoExcluir())
    const alerta = await within(dialogo()).findByRole('alert')
    expect(alerta).toHaveTextContent('Reabra a proposta antes de excluir')
    expect(onExcluido).not.toHaveBeenCalled()
  })

  it('falha ao carregar a prévia → Alert de erro', async () => {
    simulado.chamarApi.mockRejectedValue(new ErroApi(403, 'Você não tem permissão para esta operação. Peça ao administrador.'))
    montar()
    expect(await within(dialogo()).findByRole('alert')).toHaveTextContent('Você não tem permissão')
  })
})
