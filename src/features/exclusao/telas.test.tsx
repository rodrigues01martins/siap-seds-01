// @vitest-environment jsdom
// Exclusão nas telas: "Excluir" no menu de ações da linha (só admin), abre o diálogo com o identificador certo;
// registro em exclusão aparece com o selo "Em exclusão".
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../../components/ui/Toast'
import { Inicio } from '../chamamentos/ListaChamamentos'
import { PainelChamamento } from '../chamamentos/PainelChamamento'
import { TelaOscs } from '../oscs/TelaOscs'

const simulado = vi.hoisted(() => ({
  acesso: { perfil: 'admin', ativo: true } as { perfil: 'admin' | 'presidente'; ativo: boolean },
  colecoes: {} as Record<string, Record<string, unknown>[]>,
  documentos: {} as Record<string, Record<string, unknown>>,
  chamarApi: vi.fn(),
}))

vi.mock('../auth/useUsuario', () => ({
  useUsuario: () => ({ carregando: false, usuario: { uid: 'u1', email: 'ana@goias.gov.br', nome: 'Ana', acesso: simulado.acesso }, sair: vi.fn() }),
}))
vi.mock('../../lib/firestore', () => ({
  useColecao: (caminho: string) => ({ carregando: false, erro: null, dados: simulado.colecoes[caminho] ?? [] }),
  useDocumento: (caminho: string) => ({ carregando: false, erro: null, dados: simulado.documentos[caminho] ?? null }),
}))
vi.mock('../../lib/api', async (original) => ({ ...(await original<object>()), chamarApi: simulado.chamarApi }))

const CHAMAMENTO = { id: 'ch1', numero: '001/2026', titulo: 'Chamamento SEDS', lotes: [{ codigo: 'L1', descricao: 'Lote 1' }] }
const OSC = { id: '11222333000181', cnpj: '11222333000181', razaoSocial: 'Instituto Esperança' }
const PROPOSTA = { id: 'p1', loteCodigo: 'L1', oscCnpj: '11222333000181', protocolo: 'PROT-2026-0001', bloqueada: false }

beforeEach(() => {
  simulado.acesso = { perfil: 'admin', ativo: true }
  simulado.colecoes = {
    chamamentos: [CHAMAMENTO, { ...CHAMAMENTO, id: 'ch2', numero: '002/2026', status: 'excluindo' }],
    oscs: [OSC],
    'chamamentos/ch1/propostas': [PROPOSTA],
    'chamamentos/ch1/sessoes': [],
  }
  simulado.documentos = { 'chamamentos/ch1': CHAMAMENTO }
  simulado.chamarApi.mockReset().mockResolvedValue({ caminho: 'x', existe: true, emExclusao: false, subcolecoes: {}, total: 1, bloqueios: [] })
})

function montar(caminho: string) {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[caminho]}>
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/oscs" element={<TelaOscs />} />
          <Route path="/chamamentos/:ch" element={<PainelChamamento />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  )
}

async function escolherExcluir(rotuloMenu: string) {
  await userEvent.click(screen.getByRole('button', { name: rotuloMenu }))
  await userEvent.click(screen.getByRole('menuitem', { name: 'Excluir' }))
  return screen.getByRole('alertdialog')
}

describe('exclusão nas telas (admin e presidente)', () => {
  it('chamamentos: "Excluir" no menu da linha abre o diálogo pedindo o nº do chamamento', async () => {
    montar('/')
    const dialogo = await escolherExcluir('Mais ações — chamamento 001/2026')
    expect(dialogo).toHaveAccessibleName('Excluir chamamento 001/2026')
    await waitFor(() => expect(simulado.chamarApi).toHaveBeenCalledWith('/api/chamamentos?id=ch1&simular=true', { metodo: 'GET' }))
    expect(await within(dialogo).findByLabelText(/Para confirmar, digite o nº do chamamento: 001\/2026/)).toBeInTheDocument()
    // "Excluir" nunca é a ação primária da tela.
    expect(screen.queryByRole('button', { name: /^Excluir$/ })).not.toBeInTheDocument()
  })

  it('chamamento em exclusão aparece com o selo "Em exclusão"', () => {
    montar('/')
    const linha = screen.getByText('002/2026').closest('tr')!
    expect(linha).toHaveTextContent('Em exclusão')
  })

  it('OSCs: "Excluir" pede o CNPJ', async () => {
    montar('/oscs')
    const dialogo = await escolherExcluir('Mais ações — Instituto Esperança')
    expect(dialogo).toHaveAccessibleName('Excluir OSC Instituto Esperança')
    expect(await within(dialogo).findByLabelText(/digite o CNPJ da OSC: 11\.222\.333\/0001-81/)).toBeInTheDocument()
  })

  it('propostas do painel: "Excluir" pede o protocolo', async () => {
    montar('/chamamentos/ch1')
    const dialogo = await escolherExcluir('Mais ações — proposta PROT-2026-0001')
    expect(dialogo).toHaveAccessibleName('Excluir proposta PROT-2026-0001 — Instituto Esperança')
    await waitFor(() =>
      expect(simulado.chamarApi).toHaveBeenCalledWith('/api/propostas?chamamentoId=ch1&propostaId=p1&simular=true', { metodo: 'GET' }),
    )
    expect(await within(dialogo).findByLabelText(/digite o protocolo da proposta: PROT-2026-0001/)).toBeInTheDocument()
  })

  it('o presidente também vê o menu de exclusão (admin e presidente fazem tudo)', () => {
    simulado.acesso = { perfil: 'presidente', ativo: true }
    const { unmount } = montar('/')
    expect(screen.getAllByRole('button', { name: /Mais ações/ }).length).toBeGreaterThan(0)
    unmount()
    montar('/oscs')
    expect(screen.getByRole('button', { name: 'Mais ações — Instituto Esperança' })).toBeInTheDocument()
  })
})
