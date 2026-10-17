// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { Acesso } from '../../domain/permissoes'
import { AcessoNaoAutorizado } from './AcessoNaoAutorizado'

const simulado = vi.hoisted(() => ({ acesso: null as Acesso | null }))
vi.mock('./useUsuario', () => ({
  useUsuario: () => ({ carregando: false, usuario: { uid: 'u1', email: 'relator@goias.gov.br', nome: 'Rel', acesso: simulado.acesso }, sair: vi.fn() }),
}))

const montar = () =>
  render(
    <MemoryRouter>
      <AcessoNaoAutorizado />
    </MemoryRouter>,
  )

describe('tela de acesso não autorizado (após o login)', () => {
  it('cadastro do modelo anterior (relator, membro, controle): "Seu acesso precisa ser atualizado pelo administrador"', () => {
    simulado.acesso = { perfil: null, ativo: true }
    montar()
    expect(screen.getByText(/Seu acesso precisa ser atualizado pelo administrador\./)).toBeInTheDocument()
    expect(screen.getByText(/relator@goias\.gov\.br/)).toBeInTheDocument()
  })

  it('sem cadastro: conta ainda sem acesso; desativada: avisa', () => {
    simulado.acesso = null
    const { unmount } = montar()
    expect(screen.getByText(/ainda não tem acesso/)).toBeInTheDocument()
    unmount()
    simulado.acesso = { perfil: 'presidente', ativo: false }
    montar()
    expect(screen.getByText(/desativada/)).toBeInTheDocument()
  })

  it('presidente numa tela só do admin (Usuários): sem permissão para esta tela', () => {
    simulado.acesso = { perfil: 'presidente', ativo: true }
    montar()
    expect(screen.getByText(/Você não tem permissão para esta tela/)).toBeInTheDocument()
  })
})
