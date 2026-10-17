// @vitest-environment jsdom
// Tela da sessão: presentes por nome e papel (edição com o mesmo bloco da abertura); "Excluir sessão" (admin e
// presidente) numa seção própria, fora das ações do cabeçalho, com a prévia do que será apagado.
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../../components/ui/Toast'
import { ConduzirSessao } from './ConduzirSessao'

const simulado = vi.hoisted(() => ({
  acesso: { perfil: 'presidente', ativo: true } as { perfil: 'admin' | 'presidente'; ativo: boolean },
  documentos: {} as Record<string, Record<string, unknown>>,
  chamarApi: vi.fn(),
}))

vi.mock('../auth/useUsuario', () => ({
  useUsuario: () => ({ carregando: false, usuario: { uid: 'u1', email: 'presidente@goias.gov.br', nome: 'Ana', acesso: simulado.acesso }, sair: vi.fn() }),
}))
vi.mock('../../lib/firestore', () => ({
  useDocumento: (caminho: string | null) => ({ carregando: false, erro: null, dados: caminho ? (simulado.documentos[caminho] ?? null) : null }),
  useColecao: () => ({ carregando: false, erro: null, dados: [] }),
}))
vi.mock('../../lib/api', async (original) => ({ ...(await original<object>()), chamarApi: simulado.chamarApi }))

const SESSAO = {
  id: 's1',
  data: '2026-11-10',
  status: 'aberta',
  lotes: ['L1'],
  presentes: [
    { nome: 'Ana Lima', papel: 'presidente' },
    { nome: 'Bruno Reis', papel: 'membro' },
  ],
  foco: null,
}

function montar() {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/chamamentos/ch1/sessoes/s1']}>
        <Routes>
          <Route path="/chamamentos/:ch/sessoes/:s" element={<ConduzirSessao />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  )
}

beforeEach(() => {
  simulado.acesso = { perfil: 'presidente', ativo: true }
  simulado.documentos = {
    'chamamentos/ch1': { id: 'ch1', numero: '001/2026', titulo: 'C', lotes: [{ codigo: 'L1', descricao: 'Lote 1' }] },
    'chamamentos/ch1/sessoes/s1': SESSAO,
  }
  simulado.chamarApi.mockReset().mockResolvedValue({ itens: { sessao: 1, avaliacao: 2 }, total: 3, resumo: '1 sessão, 2 avaliações' })
})

describe('tela da sessão — exclusão (o reset saiu)', () => {
  it('"Excluir sessão" (destrutivo) numa seção própria, com a prévia; confirma com DELETE /api/sessao', async () => {
    montar()
    expect(screen.queryByRole('button', { name: /Resetar/ })).not.toBeInTheDocument()
    const secao = screen.getByRole('region', { name: 'Exclusão da sessão' })
    const botao = within(secao).getByRole('button', { name: 'Excluir sessão' })
    expect(botao.className).toContain('bg-button-destructive-bg')

    await userEvent.click(botao)
    const dialogo = screen.getByRole('alertdialog', { name: 'Excluir sessão de 10/11/2026' })
    expect(await within(dialogo).findByText('Serão apagados: 1 sessão, 2 avaliações.')).toBeInTheDocument()
    expect(within(dialogo).queryByRole('textbox')).not.toBeInTheDocument()
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Excluir' }))
    await waitFor(() =>
      expect(simulado.chamarApi).toHaveBeenLastCalledWith('/api/sessao', { metodo: 'DELETE', corpo: { chamamentoId: 'ch1', sessaoId: 's1' } }),
    )
  })

  it('admin também exclui (os dois perfis fazem tudo)', () => {
    simulado.acesso = { perfil: 'admin', ativo: true }
    montar()
    expect(within(screen.getByRole('region', { name: 'Exclusão da sessão' })).getByRole('button', { name: 'Excluir sessão' })).toBeInTheDocument()
  })
})

describe('tela da sessão — presentes (só nome e papel)', () => {
  it('lista nome e papel, sem declarações; "Alterar presentes" usa o mesmo bloco da abertura (PATCH presentes)', async () => {
    montar()
    const tabela = screen.getByRole('table', { name: 'Presentes' })
    expect(within(tabela).getByText('Ana Lima').closest('tr')).toHaveTextContent('Presidente')
    expect(within(tabela).getByText('Bruno Reis').closest('tr')).toHaveTextContent('Membro')
    expect(screen.queryByText(/impedimento/i)).not.toBeInTheDocument()
    expect(screen.getByText('Lotes em pauta').nextSibling).toHaveTextContent('L1')

    await userEvent.click(screen.getByRole('button', { name: 'Alterar presentes' }))
    await userEvent.click(screen.getByRole('button', { name: 'Remover pessoa 2 (Bruno Reis)' }))
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar pessoa' }))
    await userEvent.type(screen.getByRole('textbox', { name: /^Nome da pessoa 2/ }), 'Carla Dias')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar presentes' }))
    await waitFor(() =>
      expect(simulado.chamarApi).toHaveBeenCalledWith('/api/sessao', {
        metodo: 'PATCH',
        corpo: {
          chamamentoId: 'ch1',
          sessaoId: 's1',
          acao: 'presentes',
          presentes: [
            { nome: 'Ana Lima', papel: 'presidente' },
            { nome: 'Carla Dias', papel: 'membro' },
          ],
        },
      }),
    )
  })
})
