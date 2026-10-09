// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PERFIS, type Perfil } from '../../domain/perfis'
import { admissibilidadeExemplo, resultadoD2Exemplo, totaisExemplo } from '../../testes/fixturesProjecao'
import { RotaProtegida } from '../auth/RotaProtegida'
import { PERFIS_PROJECAO, TelaProjecao } from './TelaProjecao'

// ---- Firestore e usuário simulados (a tela só lê) ----
const estado = vi.hoisted(() => ({
  perfil: 'membro' as string,
  documentos: {} as Record<string, unknown>,
  colecoes: {} as Record<string, unknown[]>,
}))

vi.mock('../../lib/firestore', () => ({
  useDocumento: (caminho: string | null) => ({
    carregando: false,
    erro: null,
    dados: caminho && estado.documentos[caminho] ? { ...(estado.documentos[caminho] as object), id: caminho.split('/').at(-1) } : null,
  }),
  useColecao: (caminho: string | null) => ({ carregando: false, erro: null, dados: caminho ? (estado.colecoes[caminho] ?? []) : [] }),
}))

vi.mock('../auth/useUsuario', () => ({
  useUsuario: () => ({
    carregando: false,
    usuario: { uid: 'u', email: `${estado.perfil}@seds.go.gov.br`, perfil: estado.perfil },
    sair: vi.fn(),
    recarregarPerfil: vi.fn(),
  }),
}))

const quando = (iso: string) => ({ toDate: () => new Date(iso) })
const P = 'chamamentos/ch1/propostas/p1'

function semear(foco: Record<string, unknown> | null) {
  estado.documentos = {
    'chamamentos/ch1': { numero: '001/2026', titulo: 'Chamamento Público SEDS/GO 2026', lotes: [{ codigo: 'L1', descricao: 'CASE Goiânia' }] },
    'chamamentos/ch1/sessoes/s1': { data: '2026-11-10', status: 'aberta', pauta: ['p1'], foco, atualizadoEm: quando('2026-11-10T13:05:09Z') },
    [P]: {
      loteCodigo: 'L1',
      oscCnpj: '11222333000181',
      numeroSEI: '95570001',
      totais: totaisExemplo(),
      admissibilidade: admissibilidadeExemplo(),
      atualizadoEm: quando('2026-11-10T13:07:41Z'),
    },
    'oscs/11222333000181': { cnpj: '11222333000181', razaoSocial: 'Instituto Esperança' },
    [`${P}/avaliacoes/3.1`]: { nivel: 2, justificativa: 'Lacunas nos fluxos.', paginas: [2], decisao: 'unanimidade', sessaoId: 's1' },
    [`${P}/resultadoD2/atual`]: resultadoD2Exemplo(),
  }
  estado.colecoes = { [`${P}/experiencias`]: [{ id: 'e1', descricao: 'Gestão do CASE Goiânia' }] }
}

function montar() {
  return render(
    <MemoryRouter initialEntries={['/projecao/ch1/s1']}>
      <Routes>
        <Route
          path="/projecao/:ch/:sessaoId"
          element={
            <RotaProtegida perfis={PERFIS_PROJECAO}>
              <TelaProjecao />
            </RotaProtegida>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

const FOCOS = [
  { tipo: 'admissibilidade', propostaId: 'p1' },
  { tipo: 'subcriterio', propostaId: 'p1', subcriterio: '3.1' },
  { tipo: 'd2', propostaId: 'p1' },
  { tipo: 'resumo', propostaId: 'p1' },
  null,
]

beforeEach(() => {
  estado.perfil = 'membro'
})

describe('/projecao — acesso', () => {
  it('qualquer perfil com leitura abre a projeção (inclusive o usuário do telão, perfil membro)', () => {
    expect([...PERFIS_PROJECAO].sort()).toEqual([...PERFIS].sort())
  })
})

describe('/projecao — cabeçalho e conteúdo pelo foco', () => {
  it('cabeçalho: OSC, lote, nº SEI, sessão e horário da última atualização', () => {
    semear({ tipo: 'resumo', propostaId: 'p1' })
    montar()
    const cabecalho = screen.getByRole('banner')
    expect(cabecalho).toHaveTextContent('Instituto Esperança')
    expect(cabecalho).toHaveTextContent('Lote L1 — CASE Goiânia')
    expect(cabecalho).toHaveTextContent('Caderno SEI 95570001')
    expect(cabecalho).toHaveTextContent('Sessão de 10/11/2026')
    expect(cabecalho).toHaveTextContent(/Atualizado às \d{2}:\d{2}:\d{2}/)
  })

  it.each([
    ['admissibilidade', 'Admissibilidade (Anexo III, item 28)'],
    ['subcriterio', '3.1 — '],
    ['d2', 'Dimensão 2'],
    ['resumo', 'Resumo da proposta'],
  ])('foco %s mostra o conteúdo certo', (tipo, titulo) => {
    semear(FOCOS.find((f) => f?.tipo === tipo)!)
    montar()
    expect(screen.getByRole('heading', { name: new RegExp(`^${titulo.replace(/[.()]/g, '\\$&')}`) })).toBeInTheDocument()
  })

  it('foco gravado antes da Etapa 5 (sem tipo) é tratado como subcritério', () => {
    semear({ propostaId: 'p1', subcriterio: '3.1' })
    montar()
    expect(screen.getByRole('heading', { name: /^3\.1 — / })).toBeInTheDocument()
  })

  it('sem foco: tela de espera com o nome do chamamento', () => {
    semear(null)
    montar()
    expect(screen.getByRole('heading', { name: /Chamamento 001\/2026/ })).toBeInTheDocument()
  })
})

describe('/projecao — nenhum controle de escrita, para nenhum perfil', () => {
  const casos = PERFIS_PROJECAO.flatMap((perfil) => FOCOS.map((foco) => ({ perfil, foco })))
  it.each(casos)('$perfil com foco $foco.tipo', ({ perfil, foco }) => {
    estado.perfil = perfil as Perfil
    semear(foco)
    const { container } = montar()
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['Tela cheia'])
    for (const papel of ['textbox', 'checkbox', 'radio', 'combobox', 'spinbutton', 'link'] as const) {
      expect(screen.queryAllByRole(papel)).toHaveLength(0)
    }
    expect(container.querySelector('form, input, select, textarea')).toBeNull()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })
})
