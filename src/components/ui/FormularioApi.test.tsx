// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { esquemaCriarOsc, esquemaCriarProposta } from '../../esquemas/cadastros'
import { ErroApi } from '../../lib/api'
import { AlertaErroApi } from './AlertaErroApi'
import { CampoLista, CampoTexto, FormularioApi } from './FormularioApi'

function FormOsc({ onEnviar, somenteLeitura }: { onEnviar: (dados: unknown) => Promise<void>; somenteLeitura?: boolean }) {
  return (
    <FormularioApi
      esquema={esquemaCriarOsc}
      valoresIniciais={{ cnpj: '', razaoSocial: '', nomeFantasia: '' }}
      onEnviar={onEnviar}
      rotuloEnviar="Salvar"
      somenteLeitura={somenteLeitura}
      acoesSecundarias={<button type="button">Cancelar</button>}
    >
      <CampoTexto nome="cnpj" rotulo="CNPJ" tipo="cnpj" obrigatorio />
      <CampoTexto nome="razaoSocial" rotulo="Razão social" obrigatorio />
      <CampoTexto nome="nomeFantasia" rotulo="Nome fantasia" ajuda="Opcional." />
    </FormularioApi>
  )
}

describe('FormularioApi (componentes da Etapa 2 + esquema zod da /api)', () => {
  it('valida no navegador com o mesmo esquema da /api: erro com ícone e texto, e não envia', async () => {
    const onEnviar = vi.fn()
    render(<FormOsc onEnviar={onEnviar} />)
    await userEvent.type(screen.getByRole('textbox', { name: /CNPJ/ }), '11222333000182')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByText('CNPJ inválido.')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /Razão social/ })).toHaveAccessibleDescription('Erro: Informe a razão social.')
    expect(screen.getByRole('textbox', { name: /Razão social/ })).toHaveAttribute('aria-invalid', 'true')
    expect(onEnviar).not.toHaveBeenCalled()
  })

  it('envia os dados transformados pelo esquema; botão em carregamento enquanto envia', async () => {
    let concluir: () => void = () => {}
    const onEnviar = vi.fn((_dados: unknown) => new Promise<void>((ok) => (concluir = ok)))
    render(<FormOsc onEnviar={onEnviar} />)
    await userEvent.type(screen.getByRole('textbox', { name: /CNPJ/ }), '11222333000181')
    await userEvent.type(screen.getByRole('textbox', { name: /Razão social/ }), 'Instituto Esperança')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(screen.getByRole('button', { name: /Salvar/ })).toHaveAttribute('aria-busy', 'true'))
    concluir()
    await waitFor(() => expect(onEnviar).toHaveBeenCalledTimes(1))
    expect(onEnviar.mock.calls[0]![0]).toMatchObject({ cnpj: '11222333000181', razaoSocial: 'Instituto Esperança' })
  })

  it('erro 400 da /api: mensagem junto ao campo e alerta geral', async () => {
    const onEnviar = vi.fn().mockRejectedValue(new ErroApi(400, 'Dados inválidos.', { razaoSocial: 'Razão social já usada por outra OSC.' }))
    render(<FormOsc onEnviar={onEnviar} />)
    await userEvent.type(screen.getByRole('textbox', { name: /CNPJ/ }), '11222333000181')
    await userEvent.type(screen.getByRole('textbox', { name: /Razão social/ }), 'Instituto Esperança')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(screen.getByRole('textbox', { name: /Razão social/ })).toHaveAccessibleDescription('Erro: Razão social já usada por outra OSC.'))
    expect(screen.getByRole('alert')).toHaveTextContent('Dados inválidos')
  })

  it('erro 409: alerta com título e mensagem em português', async () => {
    const onEnviar = vi.fn().mockRejectedValue(new ErroApi(409, 'Já existe uma OSC cadastrada com este CNPJ.'))
    render(<FormOsc onEnviar={onEnviar} />)
    await userEvent.type(screen.getByRole('textbox', { name: /CNPJ/ }), '11222333000181')
    await userEvent.type(screen.getByRole('textbox', { name: /Razão social/ }), 'Instituto Esperança')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent('Operação não permitida')
    expect(alerta).toHaveTextContent('Já existe uma OSC cadastrada com este CNPJ.')
  })

  it('ações: secundárias antes do envio (uma única primária)', () => {
    render(<FormOsc onEnviar={vi.fn()} />)
    const botoes = screen.getAllByRole('button').map((b) => b.textContent)
    expect(botoes.slice(-2)).toEqual(['Cancelar', 'Salvar'])
  })

  it('somente leitura: campos bloqueados e sem enviar', () => {
    render(<FormOsc onEnviar={vi.fn()} somenteLeitura />)
    expect(screen.getByRole('textbox', { name: /Razão social/ })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Salvar' })).toBeNull()
  })

  it('CampoLista (Select) com erro do esquema', async () => {
    render(
      <FormularioApi esquema={esquemaCriarProposta} valoresIniciais={{ chamamentoId: 'ch1', oscCnpj: '', loteCodigo: '', protocolo: '', numeroSEI: '' }} onEnviar={vi.fn()} rotuloEnviar="Salvar">
        <CampoLista nome="loteCodigo" rotulo="Lote" vazio="Selecione o lote…" opcoes={[{ valor: 'L1', rotulo: 'L1' }]} />
      </FormularioApi>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Lote' })).toHaveAttribute('aria-invalid', 'true'))
  })
})

describe('AlertaErroApi', () => {
  it('erro da /api: título pelo status e link para entrar de novo no 401', () => {
    render(<AlertaErroApi erro={new ErroApi(401, 'Sessão expirada.')} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Sessão expirada')
    expect(screen.getByRole('link', { name: 'Entrar novamente' })).toHaveAttribute('href', '/login')
  })

  it('erro desconhecido: texto genérico; sem erro: nada', () => {
    const { rerender, container } = render(<AlertaErroApi erro={new Error('detalhe técnico')} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível concluir a operação')
    rerender(<AlertaErroApi erro={null} />)
    expect(container).toBeEmptyDOMElement()
  })
})
