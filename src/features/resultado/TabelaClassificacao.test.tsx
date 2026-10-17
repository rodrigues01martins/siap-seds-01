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
  concluida: false,
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
    admissibilidade: { situacao: 'nao_admitida', motivo: 'Arquivo do Caderno não abre integralmente no SEI.' },
  }),
]

function montar(props: Partial<Parameters<typeof TabelaClassificacao>[0]> = {}) {
  const acoes = {
    onConcluir: vi.fn().mockResolvedValue(undefined),
    onDesempatar: vi.fn().mockResolvedValue(undefined),
    onDesfazer: vi.fn().mockResolvedValue(undefined),
  }
  render(
    <TabelaClassificacao
      lote={{ codigo: 'L1', descricao: 'CASE Goiânia' }}
      propostas={PROPOSTAS}
      decisoes={[]}
      podeConcluir
      podeDesempatar
      {...acoes}
      {...props}
    />,
  )
  return acoes
}

const ranking = () => screen.getByRole('table', { name: 'Classificação do lote L1' })
/** Linha da tabela pelo nome da OSC (o nome acessível da linha é o texto das células). */
const linhaPorNome = (tabela: HTMLElement, nome: string) => within(tabela).getByText(nome, { selector: 'span' }).closest('tr')!
const linhaDe = (nome: string) => linhaPorNome(ranking(), nome)

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
    expect(linhaPorNome(fora, 'Fundação Delta')).toHaveTextContent('Pendente')
    expect(linhaPorNome(fora, 'Fundação Delta')).toHaveTextContent('Faltam 2 subcritérios')
    expect(linhaPorNome(fora, 'Obra Épsilon')).toHaveTextContent('Inapta')
    expect(linhaPorNome(fora, 'Obra Épsilon')).toHaveTextContent('inferior ao corte de 67,2 pontos')
    expect(linhaPorNome(fora, 'Grupo Zeta')).toHaveTextContent('Não admitida')
    expect(linhaPorNome(fora, 'Grupo Zeta')).toHaveTextContent('Arquivo do Caderno não abre integralmente no SEI.')
    expect(within(ranking()).queryByText('Fundação Delta')).not.toBeInTheDocument()
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
    await userEvent.type(within(dialogo).getByRole('textbox', { name: /^Justificativa/ }), 'Maior nota no PA1, conforme ata da sessão.')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Registrar decisão' }))
    await waitFor(() => expect(onDesempatar).toHaveBeenCalledWith(['c', 'b'], 'Maior nota no PA1, conforme ata da sessão.'))
  })
})

describe('Concluir / Desfazer conclusão (ação reversível, sem justificativa)', () => {
  it('Concluir abre um ConfirmDialog com NF e status (sem "conferi" nem justificativa); Cancelar recebe o foco', async () => {
    const { onConcluir } = montar()
    await userEvent.click(within(linhaDe('Instituto Alfa')).getByRole('button', { name: 'Concluir' }))
    const dialogo = screen.getByRole('alertdialog', { name: 'Concluir Instituto Alfa?' })
    expect(within(dialogo).getByRole('button', { name: 'Cancelar' })).toHaveFocus()
    expect(dialogo).toHaveTextContent('NF 112')
    expect(within(dialogo).getByText('Apta')).toHaveAttribute('data-status', 'success')
    expect(within(dialogo).queryByRole('checkbox')).not.toBeInTheDocument()
    expect(within(dialogo).queryByRole('textbox')).not.toBeInTheDocument()
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Concluir' }))
    await waitFor(() => expect(onConcluir).toHaveBeenCalledWith('a'))
  })

  it('o que falta para concluir (409 da /api) aparece no diálogo', async () => {
    const { ErroApi } = await import('../../lib/api')
    montar({ onConcluir: vi.fn().mockRejectedValue(new ErroApi(409, 'Não é possível concluir: registre a admissibilidade.')) })
    await userEvent.click(within(linhaDe('Instituto Alfa')).getByRole('button', { name: 'Concluir' }))
    const dialogo = screen.getByRole('alertdialog', { name: 'Concluir Instituto Alfa?' })
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Concluir' }))
    expect(await within(dialogo).findByText(/registre a admissibilidade/)).toBeInTheDocument()
  })

  it('concluída: selo "Concluída" e "Desfazer conclusão" direto, sem motivo', async () => {
    const { onDesfazer } = montar({ propostas: [linha('a', 'Instituto Alfa', { totais: totais(4), concluida: true })] })
    const alfa = linhaDe('Instituto Alfa')
    expect(alfa).toHaveTextContent('Concluída')
    expect(within(alfa).queryByRole('button', { name: 'Concluir' })).not.toBeInTheDocument()
    await userEvent.click(within(alfa).getByRole('button', { name: 'Desfazer conclusão' }))
    await waitFor(() => expect(onDesfazer).toHaveBeenCalledWith('a'))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('fora da classificação (não admitida) também conclui; o campo antigo bloqueada não vira "Homologada"', () => {
    montar({ propostas: [linha('f', 'Grupo Zeta', { totais: undefined, admissibilidade: { situacao: 'nao_admitida', motivo: 'Fora do prazo.' }, bloqueada: true } as unknown as LinhaClassificacao)] })
    const fora = screen.getByRole('table', { name: 'Fora da classificação' })
    expect(within(linhaPorNome(fora, 'Grupo Zeta')).getByRole('button', { name: 'Concluir' })).toBeInTheDocument()
    expect(screen.queryByText('Homologada')).not.toBeInTheDocument()
  })

  it('sem permissão: nenhum botão de concluir, desfazer ou desempatar', () => {
    montar({ podeConcluir: false, podeDesempatar: false })
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
