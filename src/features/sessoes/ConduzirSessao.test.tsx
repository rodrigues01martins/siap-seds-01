// @vitest-environment jsdom
// Tela da sessão: presentes por nome e papel (edição com o mesmo bloco da abertura); "Resetar sessão" (admin e
// presidente) fora das ações do cabeçalho; sessão reiniciada mostra o selo "Reiniciada" e quem, quando e por quê.
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
  simulado.chamarApi.mockReset().mockImplementation(async (_c: string, { metodo }: { metodo: string }) =>
    metodo === 'GET'
      ? { sessaoId: 's1', status: 'aberta', propostas: [], desempates: { reverter: [], apagar: [] }, total: 0, bloqueios: [] }
      : { revertidos: 0, apagados: 0, propostas: [], resets: 1 },
  )
})

describe('tela da sessão — reset', () => {
  it('presidente: "Resetar sessão" (destrutivo) numa seção própria, fora do cabeçalho', async () => {
    montar()
    const secao = screen.getByRole('region', { name: 'Reset da sessão' })
    const botao = within(secao).getByRole('button', { name: 'Resetar sessão' })
    expect(botao.className).toContain('bg-button-destructive-bg')
    expect(screen.getAllByRole('button', { name: 'Resetar sessão' })).toHaveLength(1)

    await userEvent.click(botao)
    const dialogo = screen.getByRole('alertdialog')
    await within(dialogo).findByText(/Nenhum registro desta sessão para desfazer/)
    await userEvent.type(within(dialogo).getByLabelText(/Justificativa do reset/), 'A Comissão decidiu refazer as decisões da sessão.')
    await userEvent.type(within(dialogo).getByLabelText(/Para confirmar, digite RESETAR/), 'RESETAR')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Resetar sessão' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(await screen.findByText('Sessão reiniciada')).toBeInTheDocument()
  })

  it('admin também vê o reset (os dois perfis fazem tudo)', () => {
    simulado.acesso = { perfil: 'admin', ativo: true }
    montar()
    expect(within(screen.getByRole('region', { name: 'Reset da sessão' })).getByRole('button', { name: 'Resetar sessão' })).toBeInTheDocument()
  })

  it('sessão reiniciada: selo "Reiniciada", quem resetou, quando e o motivo; sem condução', () => {
    simulado.documentos['chamamentos/ch1/sessoes/s1'] = {
      ...SESSAO,
      status: 'reiniciada',
      reiniciadaPor: { uid: 'u1', email: 'presidente@goias.gov.br' },
      reiniciadaEm: { toDate: () => new Date('2026-11-10T17:32:00Z') },
      motivo: 'Conflito de interesse declarado após a sessão.',
      resets: 1,
    }
    montar()
    expect(screen.getByText('Reiniciada')).toBeInTheDocument()
    const aviso = screen.getByRole('status', { name: 'Sessão reiniciada' })
    expect(aviso).toHaveTextContent('presidente@goias.gov.br')
    expect(aviso).toHaveTextContent('10/11/2026 14:32')
    expect(aviso).toHaveTextContent('Conflito de interesse declarado após a sessão.')
    expect(screen.queryByRole('button', { name: 'Definir foco' })).not.toBeInTheDocument()
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
