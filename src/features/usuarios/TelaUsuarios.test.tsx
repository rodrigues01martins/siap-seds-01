// @vitest-environment jsdom
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TelaUsuarios } from './TelaUsuarios'

const simulado = vi.hoisted(() => ({
  usuarios: [] as Record<string, unknown>[],
  chamarApi: vi.fn(),
  enviarEmailDeSenha: vi.fn(),
}))

vi.mock('../../lib/firestore', () => ({
  useColecao: () => ({ carregando: false, erro: null, dados: simulado.usuarios }),
}))
vi.mock('../../lib/api', async (original) => ({ ...(await original<object>()), chamarApi: simulado.chamarApi }))
vi.mock('../auth/senha', () => ({ enviarEmailDeSenha: simulado.enviarEmailDeSenha }))
vi.mock('../auth/useUsuario', () => ({
  useUsuario: () => ({ carregando: false, usuario: { uid: 'eu', email: 'eu@goias.gov.br', nome: 'Eu', acesso: null }, sair: vi.fn() }),
}))

beforeEach(() => {
  simulado.chamarApi.mockReset().mockResolvedValue({})
  simulado.enviarEmailDeSenha.mockReset().mockResolvedValue(undefined)
  simulado.usuarios = [
    { id: 'eu', email: 'eu@goias.gov.br', nome: 'Juliano Rodrigues', perfil: 'admin', ativo: true },
    { id: 'c1', email: 'cejanne@goias.gov.br', nome: 'Cejanne Ribeiro', perfil: 'presidente', ativo: true },
    // Cadastro do modelo anterior (relator): sem perfil.
    { id: 'a1', email: 'astamp@goias.gov.br', nome: 'Assessoria', admin: false, ativo: true, permissoes: ['consultar'], comissao: 'relator' },
  ]
})

const linhaDe = (nome: string) => screen.getByText(nome).closest('tr')!
const montar = () =>
  render(
    <MemoryRouter>
      <TelaUsuarios />
    </MemoryRouter>,
  )

describe('tela Usuários (só o admin): perfis admin e presidente', () => {
  it('lista com números e o perfil de cada um; cadastro antigo aparece como "Precisa de perfil"', () => {
    montar()
    expect(screen.getByText('Total de usuários').nextSibling).toHaveTextContent('3')
    expect(screen.getByText('Administradores').nextSibling).toHaveTextContent('1')
    expect(screen.getByText('Presidentes').nextSibling).toHaveTextContent('1')
    expect(screen.getByText('Acesso a atualizar').nextSibling).toHaveTextContent('1')
    expect(within(linhaDe('Juliano Rodrigues')).getByText('Você')).toBeInTheDocument()
    expect(within(linhaDe('Juliano Rodrigues')).getByText('Administrador')).toBeInTheDocument()
    expect(within(linhaDe('Cejanne Ribeiro')).getByText('Presidente')).toBeInTheDocument()
    expect(within(linhaDe('Assessoria')).getByText('Precisa de perfil')).toBeInTheDocument()
    expect(screen.queryByText(/Áreas liberadas|Permissões/)).not.toBeInTheDocument()
  })

  it('busca por nome ou e-mail', async () => {
    montar()
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar por e-mail ou nome' }), 'astamp')
    expect(screen.getAllByRole('row')).toHaveLength(2) // cabeçalho + 1 usuário
    expect(screen.queryByText('Cejanne Ribeiro')).not.toBeInTheDocument()
  })

  it('Gerenciar: escolher o perfil grava na hora (PATCH); cadastro antigo recebe perfil', async () => {
    montar()
    await userEvent.click(within(linhaDe('Assessoria')).getByRole('button', { name: /^Gerenciar/ }))
    const painel = screen.getByRole('dialog', { name: 'Assessoria' })
    expect(within(painel).getByText(/Seu acesso precisa ser atualizado|escolha um perfil/i)).toBeInTheDocument()
    await userEvent.click(within(painel).getByRole('radio', { name: /^Presidente/ }))
    expect(simulado.chamarApi).toHaveBeenLastCalledWith('/api/usuarios', { metodo: 'PATCH', corpo: { uid: 'a1', perfil: 'presidente' } })
  })

  it('Gerenciar: trocar presidente para admin e enviar e-mail de senha', async () => {
    montar()
    await userEvent.click(within(linhaDe('Cejanne Ribeiro')).getByRole('button', { name: /^Gerenciar/ }))
    const painel = screen.getByRole('dialog', { name: 'Cejanne Ribeiro' })
    expect(within(painel).getByRole('radio', { name: /^Presidente/ })).toBeChecked()
    await userEvent.click(within(painel).getByRole('radio', { name: /^Administrador/ }))
    expect(simulado.chamarApi).toHaveBeenLastCalledWith('/api/usuarios', { metodo: 'PATCH', corpo: { uid: 'c1', perfil: 'admin' } })
    await userEvent.click(within(painel).getByRole('button', { name: 'Enviar e-mail para redefinir senha' }))
    expect(simulado.enviarEmailDeSenha).toHaveBeenCalledWith('cejanne@goias.gov.br')
    expect(await within(painel).findByRole('status')).toHaveTextContent('enviado para cejanne@goias.gov.br')
  })

  it('o próprio administrador não muda o próprio perfil nem se desativa (bloqueados)', async () => {
    montar()
    await userEvent.click(within(linhaDe('Juliano Rodrigues')).getByRole('button', { name: /^Gerenciar/ }))
    const painel = screen.getByRole('dialog', { name: 'Juliano Rodrigues' })
    expect(within(painel).getByRole('radio', { name: /^Presidente/ })).toBeDisabled()
    expect(within(painel).getByRole('button', { name: 'Desativar' })).toBeDisabled()
  })

  it('Novo usuário: nome, e-mail e perfil (POST) e envia o e-mail para criar a senha', async () => {
    montar()
    await userEvent.click(screen.getByRole('button', { name: 'Novo usuário' }))
    const painel = screen.getByRole('dialog', { name: 'Novo usuário' })
    await userEvent.type(within(painel).getByRole('textbox', { name: 'Nome' }), 'Maria Souza')
    await userEvent.type(within(painel).getByRole('textbox', { name: 'E-mail' }), 'Maria@Goias.gov.br')
    expect(within(painel).getByRole('radio', { name: /^Presidente/ })).toBeChecked()
    await userEvent.click(within(painel).getByRole('button', { name: 'Cadastrar e enviar e-mail' }))
    expect(simulado.chamarApi).toHaveBeenCalledWith('/api/usuarios', {
      metodo: 'POST',
      corpo: { nome: 'Maria Souza', email: 'maria@goias.gov.br', perfil: 'presidente' },
    })
    await waitFor(() => expect(simulado.enviarEmailDeSenha).toHaveBeenCalledWith('maria@goias.gov.br'))
    expect(await screen.findByText(/Enviamos para maria@goias.gov.br o e-mail para criar a senha/)).toBeInTheDocument()
  })

  it('Novo usuário: dados inválidos mostram o erro no campo e não chamam o servidor', async () => {
    montar()
    await userEvent.click(screen.getByRole('button', { name: 'Novo usuário' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar e enviar e-mail' }))
    expect(screen.getByText('Informe um e-mail válido.')).toBeInTheDocument()
    expect(simulado.chamarApi).not.toHaveBeenCalled()
  })
})
