// @vitest-environment jsdom
// Tela da sessão (/sessao/:id?ch=): presentes por nome e papel (edição com o mesmo bloco da abertura); pauta com o
// progresso de cada proposta ("D1 18/28 · D2 ok"), status e "Avaliar"; "Excluir sessão" (admin e presidente) numa
// seção própria, fora das ações do cabeçalho, com a prévia do que será apagado.
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../../components/ui/Toast'
import { ConduzirSessao } from './ConduzirSessao'

const simulado = vi.hoisted(() => ({
  acesso: { perfil: 'presidente', ativo: true } as { perfil: 'admin' | 'presidente'; ativo: boolean },
  documentos: {} as Record<string, Record<string, unknown>>,
  colecoes: {} as Record<string, Record<string, unknown>[]>,
  chamarApi: vi.fn(),
}))

vi.mock('../auth/useUsuario', () => ({
  useUsuario: () => ({ carregando: false, usuario: { uid: 'u1', email: 'presidente@goias.gov.br', nome: 'Ana', acesso: simulado.acesso }, sair: vi.fn() }),
}))
vi.mock('../../lib/firestore', () => ({
  useDocumento: (caminho: string | null) => ({ carregando: false, erro: null, dados: caminho ? (simulado.documentos[caminho] ?? null) : null }),
  useColecao: (caminho: string) => ({ carregando: false, erro: null, dados: simulado.colecoes[caminho] ?? [] }),
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
      <MemoryRouter initialEntries={['/sessao/s1?ch=ch1']}>
        <Routes>
          <Route path="/sessao/:id" element={<ConduzirSessao />} />
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
  simulado.colecoes = {}
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

describe('tela da sessão — pauta com progresso (Simplificação 3/4)', () => {
  it('cada proposta da pauta: admissão, "D1 x/28 · D2 ok|—", status e "Avaliar" (/avaliar/:id?ch=)', () => {
    const justificativa = 'Fundamentação suficiente da Comissão.'
    simulado.colecoes = {
      'chamamentos/ch1/propostas': [
        { id: 'p1', loteCodigo: 'L1', oscCnpj: '1', admissibilidade: { admitida: true, situacao: 'admitida' } },
        { id: 'p2', loteCodigo: 'L1', oscCnpj: '2' },
        { id: 'p3', loteCodigo: 'L9', oscCnpj: '3' },
      ],
      oscs: [
        { id: '1', cnpj: '1', razaoSocial: 'Instituto Beta' },
        { id: '2', cnpj: '2', razaoSocial: 'Associação Alfa' },
        { id: '3', cnpj: '3', razaoSocial: 'Fora da Pauta' },
      ],
      'chamamentos/ch1/propostas/p1/avaliacoes': [
        { id: '1.1', nivel: 3, justificativa },
        { id: '1.2', nivel: 2, justificativa: 'curta' },
      ],
      'chamamentos/ch1/propostas/p1/experiencias': [{ id: 'e1', descricao: 'X' }],
    }
    montar()
    const pauta = screen.getByRole('list', { name: 'Propostas da pauta' })
    const itens = within(pauta).getAllByRole('listitem')
    expect(itens.map((i) => i.getAttribute('aria-label'))).toEqual(['Associação Alfa — Lote L1', 'Instituto Beta — Lote L1'])
    expect(itens[1]).toHaveTextContent('Admissão ok · D1 1/28 · D2 ok')
    expect(itens[0]).toHaveTextContent('Admissão pendente · D1 0/28 · D2 —')
    expect(within(itens[1]!).getByRole('link', { name: 'Avaliar Instituto Beta — Lote L1' })).toHaveAttribute('href', '/avaliar/p1?ch=ch1')
    expect(screen.queryByRole('form', { name: 'Foco da projeção' })).not.toBeInTheDocument()
  })
})

