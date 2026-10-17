// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ErroApi } from '../../lib/api'
import { FormAberturaSessao } from './FormAberturaSessao'

const LOTES = [
  { codigo: 'L1', descricao: 'CASE Goiânia' },
  { codigo: 'L2', descricao: 'CASE Anápolis' },
]

function montar(onAbrir = vi.fn().mockResolvedValue(undefined)) {
  render(<FormAberturaSessao lotes={LOTES} onAbrir={onAbrir} />)
  fireEvent.change(screen.getByLabelText(/^Data da sessão/), { target: { value: '2026-11-10' } })
  return onAbrir
}

const nome = (i: number) => screen.getByRole('textbox', { name: new RegExp(`^Nome da pessoa ${i}`) })
const papel = (i: number) => screen.getByRole('combobox', { name: new RegExp(`^Papel da pessoa ${i}`) })
const abrir = () => userEvent.click(screen.getByRole('button', { name: 'Abrir sessão' }))

describe('Abertura da sessão (uma página: data, lote(s) e presentes)', () => {
  it('sem etapas, sem usuários e sem declarações de impedimento', () => {
    montar()
    expect(screen.queryByRole('button', { name: 'Avançar' })).not.toBeInTheDocument()
    expect(screen.queryByText(/impedimento/i)).not.toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Lote(s) em pauta' })).toBeInTheDocument()
    // Começa com uma pessoa, já como presidente.
    expect(nome(1)).toHaveValue('')
    expect(papel(1)).toHaveValue('presidente')
  })

  it('"Adicionar pessoa" (nome + papel) e remoção com um clique; envia data, lotes e presentes', async () => {
    const onAbrir = montar()
    await userEvent.click(screen.getByRole('checkbox', { name: /^Lote L1/ }))
    await userEvent.type(nome(1), 'Ana Lima')
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar pessoa' }))
    expect(papel(2)).toHaveValue('membro')
    await userEvent.type(nome(2), 'Bruno Reis')
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar pessoa' }))
    await userEvent.type(nome(3), 'Carla Dias')
    await userEvent.click(screen.getByRole('button', { name: 'Remover pessoa 2 (Bruno Reis)' }))
    expect(screen.getAllByRole('textbox', { name: /^Nome da pessoa/ })).toHaveLength(2)

    await abrir()
    await waitFor(() =>
      expect(onAbrir).toHaveBeenCalledWith({
        data: '2026-11-10',
        lotes: ['L1'],
        presentes: [
          { nome: 'Ana Lima', papel: 'presidente' },
          { nome: 'Carla Dias', papel: 'membro' },
        ],
      }),
    )
  })

  it.each([
    ['dois presidentes', async () => {
      await userEvent.click(screen.getByRole('button', { name: 'Adicionar pessoa' }))
      await userEvent.type(nome(2), 'Bruno Reis')
      await userEvent.selectOptions(papel(2), 'presidente')
    }, 'Informe exatamente um presidente.'],
    ['nomes repetidos', async () => {
      await userEvent.click(screen.getByRole('button', { name: 'Adicionar pessoa' }))
      await userEvent.type(nome(2), ' ana  lima ')
    }, 'Há nomes repetidos.'],
  ])('%s: mensagem anunciada e nada enviado', async (_caso, preparar, mensagem) => {
    const onAbrir = montar()
    await userEvent.click(screen.getByRole('checkbox', { name: /^Lote L1/ }))
    await userEvent.type(nome(1), 'Ana Lima')
    await preparar()
    await abrir()
    expect(await screen.findByText(mensagem)).toBeInTheDocument()
    expect(onAbrir).not.toHaveBeenCalled()
  })

  it('sem lote e sem nome: erros nos campos', async () => {
    const onAbrir = montar()
    await abrir()
    expect(await screen.findByText('Informe ao menos um lote.')).toBeInTheDocument()
    expect(screen.getByText('Informe o nome.')).toBeInTheDocument()
    expect(onAbrir).not.toHaveBeenCalled()
  })

  it('erro da /api (409: já há sessão aberta) aparece na tela', async () => {
    montar(vi.fn().mockRejectedValue(new ErroApi(409, 'Já existe sessão aberta neste chamamento: encerre-a antes de abrir outra.')))
    await userEvent.click(screen.getByRole('checkbox', { name: /^Lote L2/ }))
    await userEvent.type(nome(1), 'Ana Lima')
    await abrir()
    const alerta = await screen.findByRole('alert')
    expect(within(alerta.parentElement!).getByText(/Já existe sessão aberta/)).toBeInTheDocument()
  })
})
