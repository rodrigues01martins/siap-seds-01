// @vitest-environment jsdom
// Jornada fluida de avaliação (Simplificação 3/4): a proposta inteira em /avaliar/:id?ch=, com abas, cabeçalho fixo
// (progresso, D1 e NF parciais, status, eliminatória) e salvamento automático otimista (sem botão Salvar).
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../../components/ui/Toast'
import { ErroApi } from '../../lib/api'
import { TelaAvaliar } from './TelaAvaliar'

const simulado = vi.hoisted(() => ({
  documentos: {} as Record<string, Record<string, unknown> | null>,
  colecoes: {} as Record<string, Record<string, unknown>[]>,
  consultas: {} as Record<string, Record<string, unknown>[]>,
  chamarApi: vi.fn(),
}))

vi.mock('../auth/useUsuario', () => ({
  useUsuario: () => ({ carregando: false, usuario: { uid: 'u1', email: 'p@goias.gov.br', nome: 'Ana', acesso: { perfil: 'presidente', ativo: true } }, sair: vi.fn() }),
}))
vi.mock('../../lib/firestore', () => ({
  useDocumento: (caminho: string | null) => ({ carregando: false, erro: null, dados: caminho ? (simulado.documentos[caminho] ?? null) : null }),
  useColecao: (caminho: string | null) => ({ carregando: false, erro: null, dados: caminho ? (simulado.colecoes[caminho] ?? []) : [] }),
  useConsulta: (chave: string | null) => ({ carregando: false, erro: null, dados: chave ? (simulado.consultas[chave] ?? []) : [] }),
}))
vi.mock('../../lib/api', async (original) => ({ ...(await original<object>()), chamarApi: simulado.chamarApi }))

const BASE = 'chamamentos/ch1/propostas/p1'
const SESSAO = { id: 's1', data: '2026-11-10', status: 'aberta', lotes: ['L1'], presentes: [], foco: null }

function Endereco() {
  const local = useLocation()
  return <output aria-label="Endereço">{`${local.pathname}${local.search}`}</output>
}

function montar(endereco = '/avaliar/p1?ch=ch1&aba=d1') {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[endereco]}>
        <Routes>
          <Route path="/avaliar/:propostaId" element={<TelaAvaliar />} />
        </Routes>
        <Endereco />
      </MemoryRouter>
    </ToastProvider>,
  )
}

const resumo = () => screen.getByRole('region', { name: 'Resumo da proposta' })
const linha = (codigo: string) => document.getElementById(`sub-${codigo}`)!
const indicador = () => screen.getByRole('status', { name: 'Salvamento' })

beforeEach(() => {
  simulado.documentos = {
    'chamamentos/ch1': { id: 'ch1', numero: '001/2026', titulo: 'C', dataLimitePropostas: '2026-09-30', lotes: [{ codigo: 'L1', descricao: 'Lote 1' }] },
    [BASE]: { id: 'p1', loteCodigo: 'L1', oscCnpj: '11222333000181', numeroSEI: '95570001', admissibilidade: { admitida: true, situacao: 'admitida', planos: [] } },
    'oscs/11222333000181': { id: '11222333000181', cnpj: '11222333000181', razaoSocial: 'Instituto Esperança' },
  }
  simulado.colecoes = {
    'chamamentos/ch1/propostas': [
      { id: 'p0', loteCodigo: 'L1', oscCnpj: 'a' },
      { id: 'p1', loteCodigo: 'L1', oscCnpj: '11222333000181' },
      { id: 'p2', loteCodigo: 'L1', oscCnpj: 'z' },
    ],
    oscs: [
      { id: 'a', cnpj: 'a', razaoSocial: 'Associação Alfa' },
      { id: '11222333000181', cnpj: '11222333000181', razaoSocial: 'Instituto Esperança' },
      { id: 'z', cnpj: 'z', razaoSocial: 'Zeta Social' },
    ],
  }
  simulado.consultas = { 'sessoes-abertas-ch1': [SESSAO] }
  simulado.chamarApi.mockReset().mockResolvedValue({})
  try {
    localStorage.clear()
  } catch {
    // sem armazenamento
  }
})

afterEach(() => vi.useRealTimers())

describe('/avaliar — cabeçalho fixo e abas', () => {
  it('OSC, lote, nº SEI, progresso "0 de 28", D1 e NF parciais, status e as quatro abas', () => {
    montar()
    const r = resumo()
    expect(r).toHaveTextContent('Instituto Esperança')
    expect(r).toHaveTextContent('Lote L1')
    expect(r).toHaveTextContent('SEI 95570001')
    expect(within(r).getByRole('progressbar', { name: 'Progresso da D1' })).toHaveAttribute('aria-valuenow', '0')
    expect(r).toHaveTextContent('0 de 28 completos')
    expect(r).toHaveTextContent('D1 0 / 112')
    expect(r).toHaveTextContent('NF 0 / 132')
    expect(within(screen.getByRole('tablist', { name: 'Etapas da avaliação' })).getAllByRole('tab').map((t) => t.textContent)).toEqual([
      'Admissão',
      'D1 · 0/28',
      'D2 · 0',
      'Resultado',
    ])
    expect(screen.queryByRole('button', { name: /^Salvar/ })).not.toBeInTheDocument()
  })

  it('"Proposta anterior / próxima" da pauta (mantém a aba); trocar de aba muda o endereço', async () => {
    montar()
    expect(screen.getByRole('link', { name: 'Proposta anterior' })).toHaveAttribute('href', '/avaliar/p0?ch=ch1&aba=d1')
    expect(screen.getByRole('link', { name: 'Próxima proposta' })).toHaveAttribute('href', '/avaliar/p2?ch=ch1&aba=d1')
    await userEvent.click(screen.getByRole('tab', { name: 'Resultado' }))
    expect(screen.getByRole('status', { name: 'Endereço' })).toHaveTextContent('/avaliar/p1?ch=ch1&aba=resultado')
  })

  it('sem sessão aberta: somente leitura, sem "Projetar"', () => {
    simulado.consultas = {}
    montar()
    expect(screen.getByText(/Nenhuma sessão aberta/)).toBeInTheDocument()
    expect(within(linha('1.1')).getByRole('radio', { name: 'Nível 3' })).toBeDisabled()
    expect(screen.queryByRole('switch', { name: 'Projetar' })).not.toBeInTheDocument()
  })
})

describe('/avaliar — D1 numa página, com salvamento automático', () => {
  it('clique no nível: a tela muda na hora (descritor, D1 parcial) e grava logo em seguida; "Tudo salvo" ao fim', async () => {
    let liberar!: () => void
    simulado.chamarApi.mockImplementation(() => new Promise((r) => (liberar = () => r({}))))
    montar()
    await userEvent.click(within(linha('1.1')).getByRole('radio', { name: 'Nível 3' }))
    expect(within(linha('1.1')).getByRole('radio', { name: 'Nível 3' })).toHaveAttribute('aria-checked', 'true')
    expect(linha('1.1')).toHaveTextContent(/Nível 3: /)
    expect(resumo()).toHaveTextContent('D1 3 / 112')
    expect(indicador()).toHaveTextContent('Salvando…')
    expect(simulado.chamarApi).toHaveBeenCalledWith('/api/avaliacao', {
      metodo: 'PUT',
      corpo: { chamamentoId: 'ch1', propostaId: 'p1', sessaoId: 's1', codigo: '1.1', nivel: 3 },
    })
    await act(async () => liberar())
    await waitFor(() => expect(indicador()).toHaveTextContent('Tudo salvo'))
  })

  it('teclas 0–4 com o foco na escala escolhem o nível', async () => {
    montar()
    const escala = within(linha('2.1')).getByRole('radiogroup', { name: 'Nível do 2.1' })
    within(escala).getByRole('radio', { name: 'Nível 0' }).focus()
    await userEvent.keyboard('4')
    expect(within(escala).getByRole('radio', { name: 'Nível 4' })).toHaveAttribute('aria-checked', 'true')
    expect(within(escala).getByRole('radio', { name: 'Nível 4' })).toHaveFocus()
    expect(simulado.chamarApi).toHaveBeenCalledWith('/api/avaliacao', expect.objectContaining({ corpo: expect.objectContaining({ codigo: '2.1', nivel: 4 }) }))
  })

  it('justificativa: grava uma vez só, 800 ms depois da última tecla', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    montar()
    const campo = within(linha('1.2')).getByRole('textbox', { name: /^Justificativa do 1\.2/ })
    for (const texto of ['Fund', 'Fundamenta', 'Fundamentação da Comissão']) {
      fireEvent.change(campo, { target: { value: texto } })
      await act(async () => vi.advanceTimersByTime(300))
    }
    expect(campo).toHaveValue('Fundamentação da Comissão')
    expect(simulado.chamarApi).not.toHaveBeenCalled()
    await act(async () => vi.advanceTimersByTime(800))
    expect(simulado.chamarApi).toHaveBeenCalledTimes(1)
    expect(simulado.chamarApi).toHaveBeenCalledWith('/api/avaliacao', expect.objectContaining({ corpo: expect.objectContaining({ codigo: '1.2', justificativa: 'Fundamentação da Comissão' }) }))
  })

  it('página acima do corte do PA: aviso no campo e nada é enviado ("Não salvo")', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    montar()
    const campo = within(linha('3.1')).getByRole('textbox', { name: /^Páginas citadas do 3\.1/ })
    fireEvent.change(campo, { target: { value: '2, 9' } })
    await act(async () => vi.advanceTimersByTime(2000))
    expect(within(linha('3.1')).getByText('Página 9 acima do limite de 8 páginas do PA3.')).toBeInTheDocument()
    expect(simulado.chamarApi).not.toHaveBeenCalled()
    expect(indicador()).toHaveTextContent('Não salvo')
  })

  it('pendência por linha e "Ir para o próximo pendente" leva o foco à escala do próximo', async () => {
    simulado.colecoes[`${BASE}/avaliacoes`] = [{ id: '1.1', nivel: 2, justificativa: 'Fundamentação suficiente da Comissão.', paginas: [], sessaoId: 's1' }]
    montar()
    expect(linha('1.1')).toHaveTextContent('Completo')
    expect(linha('1.2')).toHaveTextContent('Falta nível e justificativa')
    expect(resumo()).toHaveTextContent('1 de 28 completos')
    await userEvent.click(screen.getByRole('button', { name: 'Ir para o próximo pendente' }))
    await waitFor(() => expect(within(linha('1.2')).getByRole('radio', { name: 'Nível 0' })).toHaveFocus())
  })

  it('seções por PA recolhíveis, com subtotal e progresso', async () => {
    montar()
    const pa1 = screen.getByRole('button', { name: /^PA1 — / })
    expect(pa1).toHaveAttribute('aria-expanded', 'true')
    expect(pa1).toHaveTextContent('0 de 5 completos')
    expect(pa1).toHaveTextContent('0 / 20 pts')
    await userEvent.click(pa1)
    expect(pa1).toHaveAttribute('aria-expanded', 'false')
    expect(document.getElementById('sub-1.1')).toBeNull()
  })

  it('"Ver elementos" mostra os elementos de avaliação do subcritério', async () => {
    montar()
    const botao = within(linha('1.1')).getByRole('button', { name: /^Ver elementos/ })
    await userEvent.click(botao)
    expect(botao).toHaveAttribute('aria-expanded', 'true')
    expect(document.getElementById('elementos-1.1')!.querySelectorAll('li').length).toBeGreaterThan(0)
  })

  it('nível 0 em subcritério eliminatório: alerta no cabeçalho na hora', async () => {
    montar()
    await userEvent.click(within(linha('1.1')).getByRole('radio', { name: 'Nível 0' }))
    expect(within(resumo()).getByRole('alert')).toHaveTextContent('Nível 0 em subcritério eliminatório: 1.1')
  })

  it('erro ao gravar (sem conexão): tenta de novo sozinho; esgotado, "Erro ao salvar" e "Tentar de novo"', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    simulado.chamarApi.mockRejectedValue(new ErroApi(0, 'Sem conexão com o servidor.'))
    montar()
    fireEvent.click(within(linha('1.1')).getByRole('radio', { name: 'Nível 2' }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })
    expect(simulado.chamarApi).toHaveBeenCalledTimes(3)
    expect(indicador()).toHaveTextContent('Erro ao salvar: Sem conexão com o servidor.')
    expect(within(linha('1.1')).getByRole('radio', { name: 'Nível 2' })).toHaveAttribute('aria-checked', 'true')
    simulado.chamarApi.mockResolvedValue({})
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })
    expect(indicador()).toHaveTextContent('Tudo salvo')
  })
})

describe('/avaliar — projeção acompanha (interruptor "Projetar")', () => {
  it('ligado: subcritério tocado e troca de aba movem o foco do telão; desligado, nada', async () => {
    montar()
    await userEvent.click(within(linha('2.1')).getByRole('radio', { name: 'Nível 1' }))
    expect(simulado.chamarApi).not.toHaveBeenCalledWith('/api/sessao', expect.anything())

    await userEvent.click(screen.getByRole('switch', { name: 'Projetar' }))
    await waitFor(() =>
      expect(simulado.chamarApi).toHaveBeenCalledWith('/api/sessao', {
        metodo: 'PATCH',
        corpo: { chamamentoId: 'ch1', sessaoId: 's1', acao: 'foco', foco: { tipo: 'subcriterio', propostaId: 'p1', subcriterio: '2.1' } },
      }),
    )
    await userEvent.click(screen.getByRole('tab', { name: /^D2/ }))
    await waitFor(() =>
      expect(simulado.chamarApi).toHaveBeenCalledWith('/api/sessao', expect.objectContaining({ corpo: expect.objectContaining({ foco: { tipo: 'd2', propostaId: 'p1' } }) })),
    )
  })
})

describe('/avaliar — Admissão', () => {
  it('"Não admitida" grava na hora e mostra o motivo; tira a D1 da avaliação na tela', async () => {
    montar('/avaliar/p1?ch=ch1&aba=admissao')
    await userEvent.click(screen.getByRole('radio', { name: 'Não admitida' }))
    expect(simulado.chamarApi).toHaveBeenCalledWith('/api/admissibilidade', {
      metodo: 'PUT',
      corpo: expect.objectContaining({ chamamentoId: 'ch1', propostaId: 'p1', sessaoId: 's1', admitida: false, planos: expect.any(Array) }),
    })
    expect(screen.getByRole('textbox', { name: /^Motivo da não admissão/ })).toBeInTheDocument()
    expect(within(resumo()).getByText('Não admitida')).toBeInTheDocument()
  })

  it('páginas por PA numa linha: páginas, página de corte e excedente na hora', async () => {
    montar('/avaliar/p1?ch=ch1&aba=admissao')
    const tabela = screen.getByRole('table', { name: 'Páginas por Plano de Ação' })
    const pa3 = within(tabela).getByRole('row', { name: /^PA3/ })
    fireEvent.change(within(pa3).getByRole('spinbutton', { name: 'Página inicial do PA3' }), { target: { value: '30' } })
    fireEvent.change(within(pa3).getByRole('spinbutton', { name: 'Página final do PA3' }), { target: { value: '39' } })
    expect(pa3).toHaveTextContent('10')
    expect(pa3).toHaveTextContent('37')
    expect(pa3).toHaveTextContent('Excede o limite de 8 em 2 página(s)')
  })
})

describe('/avaliar — D2 na linha', () => {
  it('linha nova incompleta não é enviada; completa, é criada (POST) com o que foi preenchido', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    simulado.chamarApi.mockResolvedValue({ id: 'e9' })
    montar('/avaliar/p1?ch=ch1&aba=d2')
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar experiência' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Descrição da experiência 1' }), { target: { value: 'Gestão do CASE' } })
    await act(async () => vi.advanceTimersByTime(1000))
    expect(simulado.chamarApi).not.toHaveBeenCalled()
    expect(indicador()).toHaveTextContent('Não salvo: experiência 1')

    fireEvent.click(screen.getByRole('checkbox', { name: 'Categoria A da experiência 1' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Modalidade da experiência 1' }), { target: { value: 'internacao' } })
    fireEvent.change(screen.getByLabelText('Início da experiência 1'), { target: { value: '2018-01-01' } })
    await act(async () => vi.advanceTimersByTime(1000))
    expect(simulado.chamarApi).toHaveBeenCalledWith('/api/experiencia', {
      metodo: 'POST',
      corpo: expect.objectContaining({ chamamentoId: 'ch1', propostaId: 'p1', sessaoId: 's1', descricao: 'Gestão do CASE', categorias: ['A'], modalidade: 'internacao', inicio: '2018-01-01' }),
    })
  })

  it('experiência gravada: editar na linha envia PATCH; documentos numa linha expansível', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    simulado.colecoes[`${BASE}/experiencias`] = [
      { id: 'e1', descricao: 'Projeto esportivo', categorias: ['C'], modalidade: 'outra', mrosc: false, inicio: '2020-01-01', fim: null, documentos: [] },
    ]
    montar('/avaliar/p1?ch=ch1&aba=d2')
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Vagas da experiência 1' }), { target: { value: '40' } })
    await act(async () => vi.advanceTimersByTime(900))
    expect(simulado.chamarApi).toHaveBeenCalledWith('/api/experiencia', { metodo: 'PATCH', corpo: expect.objectContaining({ id: 'e1', vagas: 40 }) })

    fireEvent.click(screen.getByRole('button', { name: 'Detalhes e documentos (0) da experiência 1' }))
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar documento à experiência 1' }))
    expect(screen.getByRole('textbox', { name: 'Tipo do documento 1 da experiência 1' })).toBeInTheDocument()
  })
})

describe('/avaliar — Resultado', () => {
  it('mostra o que falta para concluir; "Concluir" desabilitado até lá', async () => {
    montar('/avaliar/p1?ch=ch1&aba=resultado')
    const conclusao = screen.getByRole('heading', { name: 'Conclusão' }).closest('section')!
    expect(within(conclusao).getByText('Faltam 28 de 28 níveis da D1.')).toBeInTheDocument()
    expect(within(conclusao).getByRole('button', { name: 'Concluir' })).toBeDisabled()
    expect(within(conclusao).getByRole('button', { name: 'Gerar espelho' })).toBeInTheDocument()
  })

  it('concluída: "Desfazer conclusão" chama /api/concluir', async () => {
    simulado.documentos[BASE] = { ...simulado.documentos[BASE]!, concluida: true }
    montar('/avaliar/p1?ch=ch1&aba=resultado')
    await userEvent.click(screen.getByRole('button', { name: 'Desfazer conclusão' }))
    expect(simulado.chamarApi).toHaveBeenCalledWith('/api/concluir', { metodo: 'POST', corpo: { chamamentoId: 'ch1', propostaId: 'p1', acao: 'desfazer' } })
  })
})

describe('/avaliar — aba D2: replicar para outro lote', () => {
  const EXP = { id: 'e1', descricao: 'Gestão do CASE', categorias: ['A'], modalidade: 'internacao', inicio: '2019-01-01', fim: null, documentos: [] }

  it('mesma OSC no outro lote, em pauta: oferece "Replicar para outro lote"', () => {
    simulado.documentos['chamamentos/ch1'] = { ...simulado.documentos['chamamentos/ch1']!, lotes: [{ codigo: 'L1', descricao: 'Lote 1' }, { codigo: 'L2', descricao: 'Lote 2' }] }
    simulado.colecoes['chamamentos/ch1/propostas']!.push({ id: 'p9', loteCodigo: 'L2', oscCnpj: '11222333000181' })
    simulado.colecoes[`${BASE}/experiencias`] = [EXP]
    simulado.consultas['sessoes-abertas-ch1'] = [{ ...SESSAO, lotes: ['L1', 'L2'] }]
    montar('/avaliar/p1?ch=ch1&aba=d2')
    expect(screen.getByRole('button', { name: 'Replicar para outro lote' })).toBeEnabled()
  })

  it('sem proposta da OSC em outro lote: explica e não oferece o comando', () => {
    simulado.colecoes[`${BASE}/experiencias`] = [EXP]
    montar('/avaliar/p1?ch=ch1&aba=d2')
    expect(screen.queryByRole('button', { name: 'Replicar para outro lote' })).not.toBeInTheDocument()
    expect(screen.getByText('Não há proposta desta OSC em outro lote deste chamamento.')).toBeInTheDocument()
  })
})
