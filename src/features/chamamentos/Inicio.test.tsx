// @vitest-environment jsdom
// Início (Simplificação 3/4): a sessão aberta em destaque com "Continuar"; sem sessão, "Abrir sessão" no chamamento
// escolhido; abaixo, os chamamentos.
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../../components/ui/Toast'
import { Inicio } from './ListaChamamentos'

const simulado = vi.hoisted(() => ({
  chamamentos: [] as Record<string, unknown>[],
  sessoes: {} as Record<string, Record<string, unknown>[]>,
}))

vi.mock('../../lib/firestore', () => ({
  useColecao: () => ({ carregando: false, erro: null, dados: simulado.chamamentos }),
  useConsultas: (chaves: string[]) => Object.fromEntries(chaves.map((c) => [c, simulado.sessoes[c] ?? []])),
}))

const montar = () =>
  render(
    <ToastProvider>
      <MemoryRouter>
        <Inicio />
      </MemoryRouter>
    </ToastProvider>,
  )

beforeEach(() => {
  simulado.chamamentos = [
    { id: 'ch1', numero: '001/2026', titulo: 'Socioeducativo', lotes: [] },
    { id: 'ch2', numero: '002/2026', titulo: 'Acolhimento', lotes: [] },
  ]
  simulado.sessoes = {}
})

describe('Início', () => {
  it('sessão aberta em destaque: data, chamamento, pauta e "Continuar" (/sessao/:id?ch=)', () => {
    simulado.sessoes = { ch2: [{ id: 's7', data: '2026-11-10', status: 'aberta', lotes: ['L1', 'L2'], presentes: [{ nome: 'Ana', papel: 'presidente' }], foco: null }] }
    montar()
    const destaque = screen.getByRole('region', { name: 'Sessão aberta' })
    expect(destaque).toHaveTextContent('10/11/2026 · Chamamento 002/2026')
    expect(destaque).toHaveTextContent('Lote(s) em pauta: L1, L2 · 1 presente(s)')
    expect(within(destaque).getByRole('link', { name: 'Continuar' })).toHaveAttribute('href', '/sessao/s7?ch=ch2')
    expect(screen.getByRole('table', { name: 'Chamamentos' })).toBeInTheDocument()
  })

  it('sem sessão aberta: "Abrir sessão" no chamamento escolhido', async () => {
    montar()
    const abrir = screen.getByRole('link', { name: 'Abrir sessão' })
    expect(abrir).toHaveAttribute('href', '/chamamentos/ch1/sessoes/nova')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Chamamento' }), 'ch2')
    expect(abrir).toHaveAttribute('href', '/chamamentos/ch2/sessoes/nova')
    expect(screen.queryByRole('region', { name: 'Sessão aberta' })).not.toBeInTheDocument()
  })
})
