// @vitest-environment jsdom
// Tela da sessão: "Resetar sessão" só para o presidente da Comissão com a permissão, fora das ações do
// cabeçalho; sessão reiniciada mostra o selo "Reiniciada" e quem resetou, quando e por quê.
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../../components/ui/Toast'
import { ConduzirSessao } from './ConduzirSessao'

const simulado = vi.hoisted(() => ({
  acesso: { admin: false, ativo: true, permissoes: [] as string[] },
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

const SESSAO = { id: 's1', data: '2026-11-10', status: 'aberta', pauta: [], presentes: [], declaracoes: [], foco: null }
const PRESIDENTE = ['consultar', 'sessaoAbrirEncerrar', 'sessaoConduzir', 'resetarSessao']

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
  simulado.acesso = { admin: false, ativo: true, permissoes: PRESIDENTE }
  simulado.documentos = {
    'chamamentos/ch1': { id: 'ch1', numero: '001/2026', titulo: 'C', lotes: [] },
    'chamamentos/ch1/sessoes/s1': SESSAO,
    'usuarios/u1': { comissao: 'presidente' },
  }
  simulado.chamarApi.mockReset().mockImplementation(async (_c: string, { metodo }: { metodo: string }) =>
    metodo === 'GET'
      ? { sessaoId: 's1', status: 'aberta', propostas: [], desempates: { reverter: [], apagar: [] }, total: 0, bloqueios: [] }
      : { revertidos: 0, apagados: 0, propostas: [], resets: 1 },
  )
})

describe('tela da sessão — reset', () => {
  it('presidente com a permissão: "Resetar sessão" (destrutivo) numa seção própria, fora do cabeçalho', async () => {
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

  it.each([
    ['sem a permissão (relator)', ['consultar', 'sessaoConduzir'], 'relator'],
    ['com a permissão, mas sem o papel de presidente', PRESIDENTE, 'membro'],
  ])('%s: não vê o reset', (_caso, permissoes, papel) => {
    simulado.acesso = { admin: false, ativo: true, permissoes }
    simulado.documentos['usuarios/u1'] = { comissao: papel }
    montar()
    expect(screen.queryByRole('button', { name: 'Resetar sessão' })).not.toBeInTheDocument()
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
