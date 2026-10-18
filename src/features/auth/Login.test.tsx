// @vitest-environment jsdom
// Login: o botão "Entrar" usa a cor da identidade visual (#007770, tokens --sds-button-login-*), só nesta instância;
// os outros botões continuam com o primário do DS.
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { Login } from './Login'

vi.mock('./useUsuario', () => ({ useUsuario: () => ({ carregando: false, usuario: null, sair: vi.fn() }) }))

describe('Login — botão Entrar', () => {
  it('fundo, hover e pressionado com os tokens do login; texto, tamanho e estados do Button preservados', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    )
    const entrar = screen.getByRole('button', { name: 'Entrar' })
    expect(entrar).toHaveClass(
      '[--sds-button-primary-bg:var(--sds-button-login-bg)]',
      '[--sds-button-primary-bg-hover:var(--sds-button-login-bg-hover)]',
      '[--sds-button-primary-bg-active:var(--sds-button-login-bg-active)]',
      'bg-button-primary-bg',
      'text-button-primary-fg',
      'w-full',
    )
    const outro = screen.getByRole('button', { name: /Primeiro acesso/ })
    expect(outro.className).not.toContain('button-login')
  })
})
