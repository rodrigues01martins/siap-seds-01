// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { mascararCnpj } from '../domain/cnpj'
import { esquemaCriarOsc } from '../esquemas/cadastros'
import { ErroApi } from '../lib/api'
import { Campo, Formulario } from './Formulario'

function FormOsc({ onEnviar }: { onEnviar: (dados: unknown) => Promise<void> }) {
  return (
    <Formulario
      esquema={esquemaCriarOsc}
      valoresIniciais={{ cnpj: '', razaoSocial: '', nomeFantasia: '' }}
      onEnviar={onEnviar}
      rotuloEnviar="Salvar"
    >
      <Campo nome="cnpj" rotulo="CNPJ" mascara={mascararCnpj} />
      <Campo nome="razaoSocial" rotulo="Razão social" />
      <Campo nome="nomeFantasia" rotulo="Nome fantasia" />
    </Formulario>
  )
}

describe('Formulario (react-hook-form + esquema zod da /api)', () => {
  it('valida no navegador com o mesmo esquema da /api e não envia', async () => {
    const onEnviar = vi.fn()
    render(<FormOsc onEnviar={onEnviar} />)
    await userEvent.type(screen.getByLabelText('CNPJ'), '11222333000182')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByText('CNPJ inválido.')).toBeInTheDocument()
    expect(screen.getByLabelText('CNPJ')).toHaveAccessibleDescription('CNPJ inválido.')
    expect(screen.getByLabelText('Razão social')).toHaveAccessibleDescription('Informe a razão social.')
    expect(onEnviar).not.toHaveBeenCalled()
  })

  it('aplica a máscara de CNPJ enquanto digita', async () => {
    render(<FormOsc onEnviar={vi.fn()} />)
    await userEvent.type(screen.getByLabelText('CNPJ'), '11222333000181')
    expect(screen.getByLabelText('CNPJ')).toHaveValue('11.222.333/0001-81')
  })

  it('envia os dados já transformados pelo esquema (CNPJ normalizado, opcional vazio ausente)', async () => {
    const onEnviar = vi.fn().mockResolvedValue(undefined)
    render(<FormOsc onEnviar={onEnviar} />)
    await userEvent.type(screen.getByLabelText('CNPJ'), '11222333000181')
    await userEvent.type(screen.getByLabelText('Razão social'), 'Instituto Esperança')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(onEnviar).toHaveBeenCalledTimes(1))
    const dados = onEnviar.mock.calls[0]![0] as Record<string, unknown>
    expect(dados).toMatchObject({ cnpj: '11222333000181', razaoSocial: 'Instituto Esperança' })
    expect(dados.nomeFantasia).toBeUndefined()
  })

  it('erro 400 da /api: mensagem de cada campo aparece junto ao campo', async () => {
    const onEnviar = vi.fn().mockRejectedValue(
      new ErroApi(400, 'Dados inválidos.', { razaoSocial: 'Razão social já usada por outra OSC.' }),
    )
    render(<FormOsc onEnviar={onEnviar} />)
    await userEvent.type(screen.getByLabelText('CNPJ'), '11222333000181')
    await userEvent.type(screen.getByLabelText('Razão social'), 'Instituto Esperança')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() =>
      expect(screen.getByLabelText('Razão social')).toHaveAccessibleDescription('Razão social já usada por outra OSC.'),
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Dados inválidos.')
  })

  it('erro 409 da /api: alerta com a mensagem em português', async () => {
    const onEnviar = vi.fn().mockRejectedValue(new ErroApi(409, 'Já existe uma OSC cadastrada com este CNPJ.'))
    render(<FormOsc onEnviar={onEnviar} />)
    await userEvent.type(screen.getByLabelText('CNPJ'), '11222333000181')
    await userEvent.type(screen.getByLabelText('Razão social'), 'Instituto Esperança')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Já existe uma OSC cadastrada com este CNPJ.')
  })
})
