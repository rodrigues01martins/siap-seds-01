// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ErroApi } from '../../lib/api'
import { FormAberturaSessao, type MembroComissao, type PropostaPauta } from './FormAberturaSessao'

const MEMBROS: MembroComissao[] = [
  { uid: 'u1', email: 'presidente@seds.go.gov.br', perfil: 'presidente' },
  { uid: 'u2', email: 'membro@seds.go.gov.br', perfil: 'membro' },
]
const PROPOSTAS: PropostaPauta[] = [
  { id: 'p1', rotulo: 'Instituto Esperança — Lote L1' },
  { id: 'p2', rotulo: 'Associação Futuro — Lote L1' },
]

function montar(onAbrir = vi.fn().mockResolvedValue(undefined)) {
  render(<FormAberturaSessao membros={MEMBROS} propostas={PROPOSTAS} onAbrir={onAbrir} />)
  fireEvent.change(screen.getByLabelText(/^Data da sessão/), { target: { value: '2026-11-10' } })
  return onAbrir
}

const avancar = () => userEvent.click(screen.getByRole('button', { name: 'Avançar' }))
/** Avança até a pauta (última etapa) e abre a sessão. */
async function abrir() {
  while (screen.queryByRole('button', { name: 'Avançar' })) await avancar()
  await userEvent.click(screen.getByRole('button', { name: 'Abrir sessão' }))
}

describe('Tela de abertura da sessão', () => {
  it('assistente em 3 etapas: só a etapa atual aparece; Avançar valida a etapa; Voltar mantém os dados', async () => {
    render(<FormAberturaSessao membros={MEMBROS} propostas={PROPOSTAS} onAbrir={vi.fn()} />)
    expect(screen.getByRole('heading', { name: '1. Abertura' })).toBeVisible()
    expect(screen.queryByRole('checkbox', { name: /^Presente/ })).not.toBeInTheDocument()
    await avancar()
    expect(await screen.findByLabelText(/^Data da sessão/)).toHaveAccessibleDescription(/Data inválida/)
    expect(screen.getByRole('heading', { name: '1. Abertura' })).toBeVisible()
    fireEvent.change(screen.getByLabelText(/^Data da sessão/), { target: { value: '2026-11-10' } })
    await avancar()
    const etapa2 = screen.getByRole('heading', { name: '2. Presentes e declarações' })
    await waitFor(() => expect(etapa2).toHaveFocus())
    await userEvent.click(screen.getByRole('checkbox', { name: 'Presente: membro@seds.go.gov.br' }))
    await avancar()
    expect(screen.getByRole('group', { name: 'Pauta' })).toBeVisible()
    expect(screen.getByText('1 de 2')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(screen.getByRole('checkbox', { name: 'Presente: membro@seds.go.gov.br' })).not.toBeChecked()
  })


  it('por padrão todos presentes, sem impedimento e com toda a pauta; envia no formato da /api', async () => {
    const onAbrir = montar()
    await abrir()
    await waitFor(() => expect(onAbrir).toHaveBeenCalledTimes(1))
    expect(onAbrir).toHaveBeenCalledWith({
      data: '2026-11-10',
      pauta: ['p1', 'p2'],
      presentes: ['u1', 'u2'],
      declaracoes: [
        { uid: 'u1', semImpedimento: true },
        { uid: 'u2', semImpedimento: true },
      ],
    })
  })

  it('Avançar para a última etapa não envia o formulário (o botão de enviar é outro elemento)', async () => {
    const onAbrir = montar()
    await avancar()
    const avancarNaEtapa2 = screen.getByRole('button', { name: 'Avançar' })
    await avancar()
    expect(screen.getByRole('group', { name: 'Pauta' })).toBeVisible()
    expect(avancarNaEtapa2).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Abrir sessão' })).toHaveAttribute('type', 'submit')
    expect(onAbrir).not.toHaveBeenCalled()
  })

  it('pauta escolhida pelos checkboxes', async () => {
    const onAbrir = montar()
    await avancar()
    await avancar()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Associação Futuro — Lote L1' }))
    await abrir()
    await waitFor(() => expect(onAbrir).toHaveBeenCalled())
    expect(onAbrir.mock.calls[0]![0]).toMatchObject({ pauta: ['p1'] })
  })

  it('membro ausente: sai de presentes, não declara e o checkbox de declaração fica desabilitado', async () => {
    const onAbrir = montar()
    await avancar()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Presente: membro@seds.go.gov.br' }))
    expect(screen.getByRole('checkbox', { name: 'Sem impedimento: membro@seds.go.gov.br' })).toBeDisabled()
    await abrir()
    await waitFor(() => expect(onAbrir).toHaveBeenCalled())
    expect(onAbrir.mock.calls[0]![0]).toMatchObject({
      presentes: ['u1'],
      declaracoes: [{ uid: 'u1', semImpedimento: true }],
    })
  })

  it('impedimento exige motivo (mesma regra da /api), mostrado na linha do membro', async () => {
    const onAbrir = montar()
    await avancar()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Sem impedimento: membro@seds.go.gov.br' }))
    await avancar() // a etapa de presentes não avança sem o motivo
    const motivo = screen.getByLabelText('Motivo do impedimento: membro@seds.go.gov.br')
    await waitFor(() => expect(motivo).toHaveAccessibleDescription(/Informe o motivo do impedimento\./))
    expect(screen.queryByRole('group', { name: 'Pauta' })).not.toBeInTheDocument()
    expect(onAbrir).not.toHaveBeenCalled()

    await userEvent.type(motivo, 'Parente de dirigente da OSC.')
    await abrir()
    await waitFor(() => expect(onAbrir).toHaveBeenCalled())
    expect(onAbrir.mock.calls[0]![0]).toMatchObject({
      declaracoes: [
        { uid: 'u1', semImpedimento: true },
        { uid: 'u2', semImpedimento: false, motivo: 'Parente de dirigente da OSC.' },
      ],
    })
  })

  it('pauta vazia → mensagem no grupo da pauta', async () => {
    const onAbrir = montar()
    await avancar()
    await avancar()
    for (const p of PROPOSTAS) await userEvent.click(screen.getByRole('checkbox', { name: p.rotulo }))
    await abrir()
    const pauta = screen.getByRole('group', { name: 'Pauta' })
    expect(await within(pauta).findByText('Informe ao menos uma proposta na pauta.')).toBeInTheDocument()
    expect(onAbrir).not.toHaveBeenCalled()
  })

  it('409 da /api (sessão já aberta) aparece no alerta', async () => {
    montar(vi.fn().mockRejectedValue(new ErroApi(409, 'Já existe sessão aberta neste chamamento: encerre-a antes de abrir outra.')))
    await abrir()
    expect(await screen.findByRole('alert')).toHaveTextContent('Já existe sessão aberta neste chamamento')
  })

  it('sem membros da Comissão cadastrados: aviso', async () => {
    render(<FormAberturaSessao membros={[]} propostas={PROPOSTAS} onAbrir={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/^Data da sessão/), { target: { value: '2026-11-10' } })
    await avancar()
    expect(screen.getByText(/Nenhum usuário com papel na Comissão/)).toBeInTheDocument()
  })
})
