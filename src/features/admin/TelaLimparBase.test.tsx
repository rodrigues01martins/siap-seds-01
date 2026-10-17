// @vitest-environment jsdom
// Administração → Limpar base (Simplificação 4/4, só o admin): prévia por coleção, ambiente em destaque (DEV ou
// PRODUÇÃO, pelo projectId), opção de remover usuários e a única exclusão com digitação: APAGAR TUDO.
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PreviaLimpeza } from '../../esquemas/limpeza'
import { TelaLimparBase } from './TelaLimparBase'

const simulado = vi.hoisted(() => ({ chamarApi: vi.fn() }))
vi.mock('../../lib/api', async (original) => ({ ...(await original<object>()), chamarApi: simulado.chamarApi }))

const PREVIA: PreviaLimpeza = {
  projectId: 'siap-web-dev',
  ambiente: 'DEV',
  itens: { chamamentos: 2, propostas: 10, avaliacoes: 280, oscs: 8, auditoria: 1200 },
  total: 1500,
  usuarios: { cadastros: 3, contas: 4 },
  matriz: { versao: '2026', atual: false },
}

function montar(previa: PreviaLimpeza = PREVIA) {
  simulado.chamarApi.mockImplementation(async (_rota: string, opcoes?: { metodo: string; corpo?: { acao: string } }) => {
    if (opcoes?.metodo === 'GET') return previa
    if (opcoes?.corpo?.acao === 'recarregar-matriz') return { matriz: { versao: '2026', situacao: 'atualizada' } }
    return { itens: previa.itens, total: previa.total, usuariosRemovidos: 4, matriz: { versao: '2026', situacao: 'atual' } }
  })
  render(
    <MemoryRouter>
      <TelaLimparBase />
    </MemoryRouter>,
  )
}

beforeEach(() => simulado.chamarApi.mockReset())

describe('Limpar base', () => {
  it('mostra o ambiente em destaque e a prévia por coleção (GET ?simular=true)', async () => {
    montar()
    const ambiente = await screen.findByRole('region', { name: 'Ambiente' })
    expect(ambiente).toHaveTextContent('DEV')
    expect(ambiente).toHaveTextContent('siap-web-dev')
    expect(simulado.chamarApi).toHaveBeenCalledWith('/api/admin/limpar-base?simular=true', { metodo: 'GET' })
    const tabela = screen.getByRole('table', { name: 'O que será apagado' })
    expect(within(tabela).getByRole('row', { name: /auditoria/ })).toHaveTextContent('1.200')
    expect(within(tabela).getByRole('row', { name: /Total/ })).toHaveTextContent('1.500')
    expect(screen.getByText(/Preservados: matrizes/)).toBeInTheDocument()
    expect(screen.getByText('Desatualizada')).toBeInTheDocument()
  })

  it('PRODUÇÃO aparece como alerta de erro', async () => {
    montar({ ...PREVIA, projectId: 'siap-seds-01', ambiente: 'PRODUÇÃO' })
    const ambiente = await screen.findByRole('region', { name: 'Ambiente' })
    expect(within(ambiente).getByRole('alert')).toHaveTextContent('PRODUÇÃO')
  })

  it('"Limpar base" só habilita com APAGAR TUDO digitado; envia o projectId da prévia e a opção de usuários', async () => {
    montar()
    const botao = await screen.findByRole('button', { name: 'Limpar base' })
    expect(botao).toBeDisabled()
    const campo = screen.getByRole('textbox', { name: /^Digite APAGAR TUDO/ })
    await userEvent.type(campo, 'apagar tudo')
    expect(botao).toBeDisabled()
    await userEvent.clear(campo)
    await userEvent.type(campo, 'APAGAR TUDO')
    await userEvent.click(screen.getByRole('checkbox', { name: /^Remover também os usuários/ }))
    expect(botao).toBeEnabled()
    await userEvent.click(botao)
    await waitFor(() =>
      expect(simulado.chamarApi).toHaveBeenCalledWith('/api/admin/limpar-base', {
        metodo: 'POST',
        corpo: { acao: 'limpar', confirmacao: 'APAGAR TUDO', projectId: 'siap-web-dev', removerUsuarios: true },
      }),
    )
    expect(await screen.findByText(/Base limpa: 1\.500 documentos apagados, 4 usuários removidos\./)).toBeInTheDocument()
  })

  it('"Recarregar matriz" regrava matrizes/2026', async () => {
    montar()
    await userEvent.click(await screen.findByRole('button', { name: 'Recarregar matriz' }))
    expect(simulado.chamarApi).toHaveBeenCalledWith('/api/admin/limpar-base', { metodo: 'POST', corpo: { acao: 'recarregar-matriz' } })
    expect(await screen.findByText('Matriz 2026 atualizada.')).toBeInTheDocument()
  })
})
