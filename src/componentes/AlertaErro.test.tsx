// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ErroApi } from '../lib/api'
import { AlertaErro, tituloDoErro } from './AlertaErro'

describe('AlertaErro — mensagem em português vinda da /api', () => {
  it.each([
    [400, 'Dados inválidos'],
    [401, 'Sessão expirada'],
    [403, 'Sem permissão'],
    [404, 'Não encontrado'],
    [409, 'Operação não permitida'],
    [0, 'Sem conexão'],
    [500, 'Erro no servidor'],
  ])('status %i → título "%s"', (status, titulo) => {
    expect(tituloDoErro(new ErroApi(status, 'x'))).toBe(titulo)
  })

  it('mostra título e a mensagem exata da /api num role="alert"', () => {
    render(<AlertaErro erro={new ErroApi(409, 'Proposta homologada: alteração não permitida.')} />)
    const alerta = screen.getByRole('alert')
    expect(alerta).toHaveTextContent('Operação não permitida')
    expect(alerta).toHaveTextContent('Proposta homologada: alteração não permitida.')
  })

  it('401 orienta a entrar novamente', () => {
    render(<AlertaErro erro={new ErroApi(401, 'Sessão inválida ou expirada. Entre novamente.')} />)
    expect(screen.getByRole('link', { name: 'Entrar novamente' })).toHaveAttribute('href', '/login')
  })

  it('erro que não veio da /api: mensagem genérica, sem expor detalhes técnicos', () => {
    render(<AlertaErro erro={new TypeError('Cannot read properties of undefined')} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível concluir a operação. Tente novamente.')
    expect(screen.getByRole('alert')).not.toHaveTextContent('Cannot read')
  })

  it('sem erro, não renderiza nada', () => {
    const { container } = render(<AlertaErro erro={null} />)
    expect(container).toBeEmptyDOMElement()
  })
})
