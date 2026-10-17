// @vitest-environment jsdom
// Exclusão livre nas telas: ícone de lixeira em cada item (chamamento, lote, OSC, proposta, sessão), para admin
// e presidente; abre um único ConfirmDialog destrutivo com a prévia. Sem selo "Em exclusão".
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
  useConsultas: () => ({}),
}))
vi.mock('../../lib/api', async (original) => ({ ...(await original<object>()), chamarApi: simulado.chamarApi }))

const CHAMAMENTO = { id: 'ch1', numero: '001/2026', titulo: 'Chamamento SEDS', lotes: [{ codigo: 'L1', descricao: 'Lote 1' }] }
const OSC = { id: '11222333000181', cnpj: '11222333000181', razaoSocial: 'Instituto Esperança' }
const PROPOSTA = { id: 'p1', loteCodigo: 'L1', oscCnpj: '11222333000181', protocolo: 'PROT-2026-0001' }
const SESSAO = { id: 's1', data: '2026-11-10', status: 'encerrada', lotes: ['L1'], presentes: [] }
const PREVIA = { itens: { proposta: 1 }, total: 1, resumo: '1 proposta' }

beforeEach(() => {
  simulado.acesso = { perfil: 'admin', ativo: true }
  simulado.colecoes = {
    chamamentos: [CHAMAMENTO],
    oscs: [OSC],
    'chamamentos/ch1/propostas': [PROPOSTA],
    'chamamentos/ch1/sessoes': [SESSAO],
  }
  simulado.documentos = { 'chamamentos/ch1': CHAMAMENTO }
  simulado.chamarApi.mockReset().mockResolvedValue(PREVIA)
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

async function abrirLixeira(rotulo: string) {
  await userEvent.click(screen.getByRole('button', { name: rotulo }))
  return screen.getByRole('alertdialog')
}

describe('exclusão livre nas telas: lixeira em cada item', () => {
  it.each([
    ['/', 'Excluir chamamento 001/2026', '/api/chamamentos?id=ch1&simular=true'],
    ['/oscs', 'Excluir OSC Instituto Esperança', '/api/oscs?cnpj=11222333000181&simular=true'],
    ['/chamamentos/ch1', 'Excluir proposta PROT-2026-0001 — Instituto Esperança', '/api/propostas?chamamentoId=ch1&propostaId=p1&simular=true'],
    ['/chamamentos/ch1', 'Excluir lote L1 — Lote 1', '/api/chamamentos?id=ch1&lote=L1&simular=true'],
    ['/chamamentos/ch1', 'Excluir sessão de 10/11/2026', '/api/sessao?chamamentoId=ch1&sessaoId=s1&simular=true'],
  ])('%s: "%s" abre o ConfirmDialog com a prévia', async (caminho, rotulo, previa) => {
    montar(caminho)
    const dialogo = await abrirLixeira(rotulo)
    expect(dialogo).toHaveAccessibleName(rotulo)
    await waitFor(() => expect(simulado.chamarApi).toHaveBeenCalledWith(previa, { metodo: 'GET' }))
    expect(await within(dialogo).findByText('Serão apagados: 1 proposta.')).toBeInTheDocument()
    expect(within(dialogo).queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('sem menu de ações nem selo "Em exclusão"', () => {
    simulado.colecoes.chamamentos = [{ ...CHAMAMENTO, status: 'excluindo' }]
    montar('/')
    expect(screen.queryByRole('button', { name: /Mais ações/ })).not.toBeInTheDocument()
    expect(screen.queryByText('Em exclusão')).not.toBeInTheDocument()
  })

  it('o presidente também vê a lixeira (admin e presidente fazem tudo)', () => {
    simulado.acesso = { perfil: 'presidente', ativo: true }
    const { unmount } = montar('/')
    expect(screen.getByRole('button', { name: 'Excluir chamamento 001/2026' })).toBeInTheDocument()
    unmount()
    montar('/oscs')
    expect(screen.getByRole('button', { name: 'Excluir OSC Instituto Esperança' })).toBeInTheDocument()
  })

  it('confirmar apaga e mostra o aviso com o que foi apagado', async () => {
    montar('/oscs')
    const dialogo = await abrirLixeira('Excluir OSC Instituto Esperança')
    await within(dialogo).findByText(/Serão apagados/)
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Excluir' }))
    await waitFor(() => expect(simulado.chamarApi).toHaveBeenLastCalledWith('/api/oscs', { metodo: 'DELETE', corpo: { cnpj: '11222333000181' } }))
    expect(await screen.findByText('OSC Instituto Esperança: apagados 1 proposta.')).toBeInTheDocument()
  })
})
