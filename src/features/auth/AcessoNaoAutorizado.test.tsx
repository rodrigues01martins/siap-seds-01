// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { Acesso } from '../../domain/permissoes'
import { AcessoNaoAutorizado } from './AcessoNaoAutorizado'

const simulado = vi.hoisted(() => ({ acesso: null as Acesso | null, erro: undefined as string | undefined }))
vi.mock('./useUsuario', () => ({
  useUsuario: () => ({ carregando: false, usuario: { uid: 'u1', email: 'relator@goias.gov.br', nome: 'Rel', acesso: simulado.acesso, erro: simulado.erro }, sair: vi.fn() }),
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

  it('o 403 da /api com o mesmo aviso não aparece de novo como "Detalhe"', () => {
    simulado.acesso = { perfil: null, ativo: true }
    simulado.erro = 'Seu acesso precisa ser atualizado pelo administrador.'
    montar()
    expect(screen.getAllByText(/Seu acesso precisa ser atualizado pelo administrador\./)).toHaveLength(1)
    simulado.erro = undefined
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
