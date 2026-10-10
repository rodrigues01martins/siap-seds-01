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
    { id: 'eu', email: 'eu@goias.gov.br', nome: 'Juliano Rodrigues', admin: true, ativo: true, permissoes: [] },
    { id: 'c1', email: 'cejanne@goias.gov.br', nome: 'Cejanne Ribeiro', admin: false, ativo: true, permissoes: ['consultar', 'nivelD1'], comissao: 'membro' },
    { id: 'a1', email: 'astamp@goias.gov.br', nome: 'Assessoria', admin: false, ativo: true, permissoes: [] },
  ]
})

const linhaDe = (nome: string) => screen.getByText(nome).closest('tr')!
const montar = () =>
  render(
    <MemoryRouter>
      <TelaUsuarios />
    </MemoryRouter>,
  )

describe('tela Usuários', () => {
  it('lista com números, selos e áreas liberadas', () => {
    montar()
    expect(screen.getByText('Total de usuários').nextSibling).toHaveTextContent('3')
    expect(screen.getByText('Administradores').nextSibling).toHaveTextContent('1')
    expect(screen.getByText('Sem nenhum acesso liberado').nextSibling).toHaveTextContent('1')
    expect(within(linhaDe('Juliano Rodrigues')).getByText('Você')).toBeInTheDocument()
    expect(within(linhaDe('Juliano Rodrigues')).getByText('Todas as áreas')).toBeInTheDocument()
    expect(within(linhaDe('Cejanne Ribeiro')).getByText('Avaliação')).toBeInTheDocument()
    expect(within(linhaDe('Cejanne Ribeiro')).getByText('2/13')).toBeInTheDocument()
    expect(within(linhaDe('Assessoria')).getByText('Nenhuma área')).toBeInTheDocument()
  })

  it('busca por nome ou e-mail', async () => {
    montar()
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar por e-mail ou nome' }), 'astamp')
    expect(screen.getAllByRole('row')).toHaveLength(2) // cabeçalho + 1 usuário
    expect(screen.queryByText('Cejanne Ribeiro')).not.toBeInTheDocument()
  })

  it('Gerenciar: ligar uma permissão grava na hora (PATCH com a lista nova)', async () => {
    montar()
    await userEvent.click(within(linhaDe('Cejanne Ribeiro')).getByRole('button', { name: /^Gerenciar/ }))
    const painel = screen.getByRole('dialog', { name: 'Cejanne Ribeiro' })
    expect(within(painel).getByRole('switch', { name: 'Níveis da D1 (subcritérios)' })).toBeChecked()
    await userEvent.click(within(painel).getByRole('switch', { name: 'Homologar proposta' }))
    expect(simulado.chamarApi).toHaveBeenCalledWith('/api/usuarios', {
      metodo: 'PATCH',
      corpo: { uid: 'c1', permissoes: ['consultar', 'nivelD1', 'homologar'] },
    })
  })

  it('Gerenciar: cliques seguidos somam as permissões, mesmo antes de a lista atualizar', async () => {
    montar()
    await userEvent.click(within(linhaDe('Assessoria')).getByRole('button', { name: /^Gerenciar/ }))
    const painel = screen.getByRole('dialog', { name: 'Assessoria' })
    await userEvent.click(within(painel).getByRole('switch', { name: /^Ver chamamentos/ }))
    await userEvent.click(within(painel).getByRole('switch', { name: 'OSCs' }))
    await userEvent.click(within(painel).getByRole('switch', { name: 'Propostas' }))
    expect(simulado.chamarApi).toHaveBeenLastCalledWith('/api/usuarios', {
      metodo: 'PATCH',
      corpo: { uid: 'a1', permissoes: ['consultar', 'oscs', 'propostas'] },
    })
    expect(within(painel).getByRole('switch', { name: 'OSCs' })).toBeChecked()
  })

  it('Gerenciar: tornar administrador, papel na Comissão e e-mail de senha', async () => {
    montar()
    await userEvent.click(within(linhaDe('Cejanne Ribeiro')).getByRole('button', { name: /^Gerenciar/ }))
    const painel = screen.getByRole('dialog', { name: 'Cejanne Ribeiro' })
    await userEvent.click(within(painel).getByRole('button', { name: 'Tornar administrador' }))
    expect(simulado.chamarApi).toHaveBeenLastCalledWith('/api/usuarios', { metodo: 'PATCH', corpo: { uid: 'c1', admin: true } })
    await userEvent.selectOptions(within(painel).getByRole('combobox', { name: 'Papel na Comissão' }), 'presidente')
    expect(simulado.chamarApi).toHaveBeenLastCalledWith('/api/usuarios', { metodo: 'PATCH', corpo: { uid: 'c1', comissao: 'presidente' } })
    await userEvent.click(within(painel).getByRole('button', { name: 'Enviar e-mail para redefinir senha' }))
    expect(simulado.enviarEmailDeSenha).toHaveBeenCalledWith('cejanne@goias.gov.br')
    expect(await within(painel).findByRole('status')).toHaveTextContent('enviado para cejanne@goias.gov.br')
  })

  it('o próprio administrador não se remove nem se desativa (botões bloqueados)', async () => {
    montar()
    await userEvent.click(within(linhaDe('Juliano Rodrigues')).getByRole('button', { name: /^Gerenciar/ }))
    const painel = screen.getByRole('dialog', { name: 'Juliano Rodrigues' })
    expect(within(painel).getByRole('button', { name: 'Remover administrador' })).toBeDisabled()
    expect(within(painel).getByRole('button', { name: 'Desativar' })).toBeDisabled()
    expect(within(painel).getByRole('switch', { name: 'Homologar proposta' })).toBeDisabled()
  })

  it('Novo usuário: cadastra (POST) e envia o e-mail para criar a senha', async () => {
    montar()
    await userEvent.click(screen.getByRole('button', { name: 'Novo usuário' }))
    const painel = screen.getByRole('dialog', { name: 'Novo usuário' })
    await userEvent.type(within(painel).getByRole('textbox', { name: 'Nome' }), 'Maria Souza')
    await userEvent.type(within(painel).getByRole('textbox', { name: 'E-mail' }), 'Maria@Goias.gov.br')
    await userEvent.click(within(painel).getByRole('switch', { name: 'Níveis da D1 (subcritérios)' }))
    await userEvent.click(within(painel).getByRole('button', { name: 'Cadastrar e enviar e-mail' }))
    expect(simulado.chamarApi).toHaveBeenCalledWith('/api/usuarios', {
      metodo: 'POST',
      corpo: { nome: 'Maria Souza', email: 'maria@goias.gov.br', admin: false, comissao: null, permissoes: ['consultar', 'nivelD1'] },
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
