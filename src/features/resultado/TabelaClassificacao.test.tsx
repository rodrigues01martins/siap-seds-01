// @vitest-environment jsdom
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MATRIZ_2026 } from '../../domain/matriz'
import { consolidarProposta } from '../../domain/proposta'
import { TabelaClassificacao, type LinhaClassificacao } from './TabelaClassificacao'

const CODIGOS = MATRIZ_2026.dimensao1.planos.flatMap((p) => p.subcriterios.map((s) => s.codigo))

/** Totais reais (src/domain) com todos os níveis = n, menos os códigos omitidos. */
function totais(n: number, omitidos: string[] = []) {
  const niveis = Object.fromEntries(CODIGOS.filter((c) => !omitidos.includes(c)).map((c) => [c, n]))
  return consolidarProposta({ niveis, experiencias: [], dataLimite: '2026-10-31' }).totais
}

const linha = (id: string, nome: string, dados: Partial<LinhaClassificacao> = {}): LinhaClassificacao => ({
  id,
  nomeOsc: nome,
  totais: totais(3),
  bloqueada: false,
  ...dados,
})

const PROPOSTAS: LinhaClassificacao[] = [
  linha('a', 'Instituto Alfa', { totais: totais(4) }),
  linha('b', 'Associação Beta'),
  linha('c', 'Centro Gama'),
  linha('d', 'Fundação Delta', { totais: totais(3, ['6.3', '6.4']) }),
  linha('e', 'Obra Épsilon', { totais: totais(2) }),
  linha('f', 'Grupo Zeta', {
    totais: undefined,
    admissibilidade: { situacao: 'nao_admitida', motivos: ['Requisito 28.1.IV não atendido: possibilidade de abertura e leitura integral do arquivo.'] },
  }),
]

function montar(props: Partial<Parameters<typeof TabelaClassificacao>[0]> = {}) {
  const acoes = {
    onHomologar: vi.fn().mockResolvedValue(undefined),
    onDesempatar: vi.fn().mockResolvedValue(undefined),
    onReabrir: vi.fn().mockResolvedValue(undefined),
  }
  render(
    <TabelaClassificacao
      lote={{ codigo: 'L1', descricao: 'CASE Goiânia' }}
      propostas={PROPOSTAS}
      decisoes={[]}
      podeHomologar
      podeDesempatar
      podeReabrir
      {...acoes}
      {...props}
    />,
  )
  return acoes
}

const ranking = () => screen.getByRole('table', { name: 'Classificação do lote L1' })
const linhaDe = (nome: string) => within(ranking()).getByRole('row', { name: nome })

describe('Classificação do lote — ranking, pendentes e empates', () => {
  it('ranking por NF entre aptas e completas, com PA1…PA6, D1, D2, NF e status', () => {
    montar()
    const alfa = linhaDe('Instituto Alfa')
    expect(within(alfa).getAllByRole('cell')[0]).toHaveTextContent('1º')
    expect(alfa).toHaveTextContent('112')
    for (const pa of ['20', '16', '24']) expect(alfa).toHaveTextContent(pa)
  })

  it('empatadas dividem a posição e são sinalizadas', () => {
    montar()
    for (const nome of ['Associação Beta', 'Centro Gama']) {
      const r = linhaDe(nome)
      expect(within(r).getAllByRole('cell')[0]).toHaveTextContent('2º')
      expect(r).toHaveTextContent('Empatada')
    }
  })

  it('empate de NF resolvido pelo Edital: posições distintas e selo com o critério, sem botão de desempate', () => {
    const pa1Maior = consolidarProposta({
      niveis: Object.fromEntries(CODIGOS.map((c) => [c, c === '1.1' ? 4 : c === '3.1' ? 2 : 3])),
      experiencias: [],
      dataLimite: '2026-10-31',
    }).totais
    montar({ propostas: [linha('x', 'Alfa'), linha('y', 'Beta', { totais: pa1Maior })] })
    expect(within(linhaDe('Beta')).getAllByRole('cell')[0]).toHaveTextContent('1º')
    expect(within(linhaDe('Alfa')).getAllByRole('cell')[0]).toHaveTextContent('2º')
    expect(linhaDe('Beta')).toHaveTextContent('Desempate pelo Edital (critério II)')
    expect(screen.queryByRole('button', { name: /Registrar desempate/ })).toBeNull()
  })

  it('pendentes, inaptas e não admitidas abaixo, sem posição, com o motivo', () => {
    montar()
    const fora = screen.getByRole('table', { name: 'Fora da classificação' })
    expect(within(fora).getByRole('row', { name: 'Fundação Delta' })).toHaveTextContent('Pendente')
    expect(within(fora).getByRole('row', { name: 'Fundação Delta' })).toHaveTextContent('Faltam 2 subcritérios')
    expect(within(fora).getByRole('row', { name: 'Obra Épsilon' })).toHaveTextContent('Inapta')
    expect(within(fora).getByRole('row', { name: 'Obra Épsilon' })).toHaveTextContent('inferior ao corte de 67,2 pontos')
    expect(within(fora).getByRole('row', { name: 'Grupo Zeta' })).toHaveTextContent('Não admitida')
    expect(within(fora).getByRole('row', { name: 'Grupo Zeta' })).toHaveTextContent('28.1.IV')
    expect(within(ranking()).queryByRole('row', { name: 'Fundação Delta' })).not.toBeInTheDocument()
  })

  it('selo "classificação não definitiva" com os motivos (pendente e empate sem decisão)', () => {
    montar()
    const selo = screen.getByRole('status', { name: 'Classificação não definitiva' })
    expect(selo).toHaveTextContent('1 proposta pendente')
    expect(selo).toHaveTextContent('1 empate sem decisão')
  })

  it('decisão de desempate registrada: posições 2º e 3º na ordem decidida, com a justificativa', () => {
    montar({
      decisoes: [{ propostas: ['b', 'c'], nf: totais(3).nf, ordem: ['c', 'b'], justificativa: 'Maior nota no PA1, conforme ata.' }],
      propostas: PROPOSTAS.filter((p) => p.id !== 'd'),
    })
    expect(within(linhaDe('Centro Gama')).getAllByRole('cell')[0]).toHaveTextContent('2º')
    expect(within(linhaDe('Associação Beta')).getAllByRole('cell')[0]).toHaveTextContent('3º')
    expect(linhaDe('Centro Gama')).toHaveTextContent('Desempate da Comissão')
    expect(screen.getByText(/Maior nota no PA1, conforme ata\./)).toBeInTheDocument()
    expect(screen.queryByRole('status', { name: 'Classificação não definitiva' })).not.toBeInTheDocument()
  })
})

describe('Desempate pelo presidente (RF-27)', () => {
  it('ordena o grupo, exige justificativa e envia a ordem decidida', async () => {
    const { onDesempatar } = montar()
    await userEvent.click(screen.getByRole('button', { name: /Registrar desempate/ }))
    const dialogo = screen.getByRole('dialog', { name: /Desempate/ })
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Descer Associação Beta' }))
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Registrar decisão' }))
    expect(await within(dialogo).findByText('Informe a justificativa do desempate (ao menos 20 caracteres).')).toBeInTheDocument()
    expect(onDesempatar).not.toHaveBeenCalled()
    await userEvent.type(within(dialogo).getByLabelText('Justificativa'), 'Maior nota no PA1, conforme ata da sessão.')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Registrar decisão' }))
    await waitFor(() => expect(onDesempatar).toHaveBeenCalledWith(['c', 'b'], 'Maior nota no PA1, conforme ata da sessão.'))
  })
})

describe('Homologação na tela (C5) e reabertura (RF-18)', () => {
  it('confirmação dupla mostrando NF e status', async () => {
    const { onHomologar } = montar()
    await userEvent.click(within(linhaDe('Instituto Alfa')).getByRole('button', { name: 'Homologar' }))
    const dialogo = screen.getByRole('dialog', { name: 'Homologar Instituto Alfa' })
    expect(dialogo).toHaveTextContent('NF 112')
    expect(dialogo).toHaveTextContent('Status: Apta')
    const confirmar = within(dialogo).getByRole('button', { name: 'Confirmar homologação' })
    expect(confirmar).toBeDisabled()
    await userEvent.click(within(dialogo).getByRole('checkbox', { name: /Conferi a NF e o status/ }))
    await userEvent.click(confirmar)
    await waitFor(() => expect(onHomologar).toHaveBeenCalledWith('a'))
  })

  it('homologada: selo e botão Reabrir com motivo obrigatório', async () => {
    const { onReabrir } = montar({ propostas: [linha('a', 'Instituto Alfa', { totais: totais(4), bloqueada: true })] })
    const alfa = linhaDe('Instituto Alfa')
    expect(alfa).toHaveTextContent('Homologada')
    expect(within(alfa).queryByRole('button', { name: 'Homologar' })).not.toBeInTheDocument()
    await userEvent.click(within(alfa).getByRole('button', { name: 'Reabrir' }))
    const dialogo = screen.getByRole('dialog', { name: 'Reabrir Instituto Alfa' })
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Confirmar reabertura' }))
    expect(await within(dialogo).findByText('Informe o motivo da reabertura (ao menos 20 caracteres).')).toBeInTheDocument()
    await userEvent.type(within(dialogo).getByLabelText('Motivo'), 'Erro material no registro do subcritério 3.1.')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Confirmar reabertura' }))
    await waitFor(() => expect(onReabrir).toHaveBeenCalledWith('a', 'Erro material no registro do subcritério 3.1.'))
  })

  it('sem permissão: nenhum botão de homologar, reabrir ou desempatar', () => {
    montar({ podeHomologar: false, podeDesempatar: false, podeReabrir: false })
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
