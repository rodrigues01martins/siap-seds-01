// @vitest-environment jsdom
// Aba D2 — "Replicar para outro lote": botão secundário junto aos comandos das experiências, diálogo de confirmação
// com a prévia da /api (OSC, lotes, experiências, documentos, quantas serão copiadas e quantas já existem) e retorno.
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../../components/ui/Toast'
import { ErroApi } from '../../lib/api'
import type { ExperienciaGravada } from '../../lib/tipos'
import { AbaD2 } from './AbaD2'
import { ProvedorSalvamento } from './salvamento'

const simulado = vi.hoisted(() => ({ chamarApi: vi.fn() }))
vi.mock('../../lib/api', async (original) => ({ ...(await original<object>()), chamarApi: simulado.chamarApi }))

const EXPERIENCIA: ExperienciaGravada = { id: 'e1', descricao: 'Gestão do CASE', categorias: ['A'], modalidade: 'internacao', inicio: '2019-01-01', fim: null, documentos: [] }
const PREVIA = {
  osc: { cnpj: '11222333000181', razaoSocial: 'Instituto Esperança' },
  origem: { propostaId: 'p1', lote: 'L1' },
  destino: { propostaId: 'p2', lote: 'L2' },
  experiencias: 3,
  documentos: 5,
  copiar: 2,
  equivalentes: 1,
  existentesNoDestino: 4,
}

function montar(replicacao: Parameters<typeof AbaD2>[0]['replicacao']) {
  render(
    <ToastProvider>
      <ProvedorSalvamento>
        <AbaD2 ch="ch1" p="p1" sessaoId="s1" experiencias={[EXPERIENCIA]} motivoSomenteLeitura={null} acaoExcluir={() => null} replicacao={replicacao} />
      </ProvedorSalvamento>
    </ToastProvider>,
  )
}

const DISPONIVEL = { destinos: [{ propostaId: 'p2', lote: 'L2', rotuloLote: 'L2 — Lote II' }], motivo: null, rotuloLoteOrigem: 'L1 — Lote I' }

beforeEach(() => {
  simulado.chamarApi.mockReset()
})

describe('Replicar para outro lote', () => {
  it('diálogo com a mensagem e a prévia; confirmar envia a replicação e mostra quantas foram copiadas', async () => {
    simulado.chamarApi.mockImplementation(async (_rota: string, opcoes?: { metodo: string }) =>
      opcoes?.metodo === 'GET' ? PREVIA : { propostaDestinoId: 'p2', copiadas: 2, equivalentes: 1, existentesNoDestino: 4, totais: null },
    )
    montar(DISPONIVEL)
    await userEvent.click(screen.getByRole('button', { name: 'Replicar para outro lote' }))
    const dialogo = screen.getByRole('alertdialog', { name: 'Replicar experiências para outro lote' })
    expect(dialogo).toHaveTextContent(
      'As experiências cadastradas para esta OSC serão copiadas para sua proposta no outro lote. Os registros originais serão preservados. A documentação será replicada, mas sua aceitação deverá ser confirmada pela Comissão no lote de destino.',
    )
    expect(simulado.chamarApi).toHaveBeenCalledWith('/api/experiencia?replicar=true&chamamentoId=ch1&propostaId=p1&propostaDestinoId=p2', { metodo: 'GET' })
    const resumo = await within(dialogo).findByRole('list', { name: 'Resumo da replicação' })
    for (const linha of [
      'OSC: Instituto Esperança',
      'Lote de origem: L1 — Lote I',
      'Lote de destino: L2 — Lote II',
      'Experiências disponíveis: 3',
      'Documentos comprobatórios: 5',
      'Serão copiadas: 2',
      'Já existentes no destino (preservadas): 4',
    ]) {
      expect(resumo).toHaveTextContent(linha)
    }
    expect(dialogo).toHaveTextContent('1 já tem equivalente no destino e não será copiada de novo.')

    await userEvent.click(within(dialogo).getByRole('button', { name: 'Confirmar replicação' }))
    await waitFor(() =>
      expect(simulado.chamarApi).toHaveBeenCalledWith('/api/experiencia', {
        metodo: 'POST',
        corpo: { acao: 'replicar', chamamentoId: 'ch1', propostaId: 'p1', sessaoId: 's1', propostaDestinoId: 'p2' },
      }),
    )
    expect(await screen.findByText('2 experiência(s) copiada(s) para o lote L2 — Lote II.')).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('nada a copiar: "Confirmar replicação" fica desabilitado', async () => {
    simulado.chamarApi.mockResolvedValue({ ...PREVIA, copiar: 0, equivalentes: 3 })
    montar(DISPONIVEL)
    await userEvent.click(screen.getByRole('button', { name: 'Replicar para outro lote' }))
    const dialogo = screen.getByRole('alertdialog')
    expect(await within(dialogo).findByRole('list', { name: 'Resumo da replicação' })).toHaveTextContent('Serão copiadas: 0')
    expect(within(dialogo).getByRole('button', { name: 'Confirmar replicação' })).toBeDisabled()
  })

  it('erro da /api: mensagem clara no diálogo, que continua aberto', async () => {
    simulado.chamarApi.mockImplementation(async (_rota: string, opcoes?: { metodo: string }) => {
      if (opcoes?.metodo === 'GET') return PREVIA
      throw new ErroApi(409, 'Proposta fora da pauta da sessão.')
    })
    montar(DISPONIVEL)
    await userEvent.click(screen.getByRole('button', { name: 'Replicar para outro lote' }))
    const dialogo = screen.getByRole('alertdialog')
    await within(dialogo).findByRole('list', { name: 'Resumo da replicação' })
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Confirmar replicação' }))
    expect(await within(dialogo).findByText('Proposta fora da pauta da sessão.')).toBeInTheDocument()
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  it('indisponível: botão desabilitado com o motivo; sem proposta no outro lote, só a explicação', () => {
    montar({ ...DISPONIVEL, motivo: 'O lote de destino (L2) não está na pauta da sessão aberta.' })
    const botao = screen.getByRole('button', { name: 'Replicar para outro lote' })
    expect(botao).toBeDisabled()
    expect(botao).toHaveAccessibleDescription('O lote de destino (L2) não está na pauta da sessão aberta.')
  })

  it('sem proposta da OSC no outro lote: não oferece a replicação e explica', () => {
    montar({ destinos: [], motivo: 'Não há proposta desta OSC em outro lote deste chamamento.', rotuloLoteOrigem: 'L1 — Lote I' })
    expect(screen.queryByRole('button', { name: 'Replicar para outro lote' })).not.toBeInTheDocument()
    expect(screen.getByText('Não há proposta desta OSC em outro lote deste chamamento.')).toBeInTheDocument()
  })
})
