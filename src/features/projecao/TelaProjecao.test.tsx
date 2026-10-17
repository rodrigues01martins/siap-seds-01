// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Acesso } from '../../domain/permissoes'
import { admissibilidadeExemplo, resultadoD2Exemplo, totaisExemplo } from '../../testes/fixturesProjecao'
import { RotaProtegida } from '../auth/RotaProtegida'
import { TelaProjecao } from './TelaProjecao'

// ---- Firestore e usuário simulados (a tela só lê) ----
const estado = vi.hoisted(() => ({
  acesso: { perfil: 'presidente', ativo: true } as Acesso,
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
    usuario: { uid: 'u', email: 'telao@seds.go.gov.br', nome: 'Telão', acesso: estado.acesso },
    sair: vi.fn(),
  }),
}))

const quando = (iso: string) => ({ toDate: () => new Date(iso) })
const P = 'chamamentos/ch1/propostas/p1'

function semear(foco: Record<string, unknown> | null) {
  estado.documentos = {
    'chamamentos/ch1': { numero: '001/2026', titulo: 'Chamamento Público SEDS/GO 2026', lotes: [{ codigo: 'L1', descricao: 'CASE Goiânia' }] },
    'chamamentos/ch1/sessoes/s1': { data: '2026-11-10', status: 'aberta', lotes: ['L1'], foco, atualizadoEm: quando('2026-11-10T13:05:09Z') },
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
            <RotaProtegida>
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

/** Acessos de quem abre a projeção: os dois perfis (admin e presidente). */
const ACESSOS: Record<string, Acesso> = {
  presidente: { perfil: 'presidente', ativo: true },
  admin: { perfil: 'admin', ativo: true },
}

beforeEach(() => {
  estado.acesso = ACESSOS.presidente!
})

describe('/projecao — acesso', () => {
  it('o presidente (ou o admin) abre a projeção', () => {
    semear(null)
    montar()
    expect(screen.getByRole('heading', { name: /Chamamento 001\/2026/ })).toBeInTheDocument()
  })

  it('cadastro antigo, sem perfil novo, não abre', () => {
    estado.acesso = { perfil: null, ativo: true }
    semear(null)
    montar()
    expect(screen.getByRole('heading', { name: 'Acesso não autorizado' })).toBeInTheDocument()
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

describe('/projecao — nenhum controle de escrita, para ninguém', () => {
  const casos = Object.keys(ACESSOS).flatMap((quem) => FOCOS.map((foco) => ({ quem, foco })))
  it.each(casos)('$quem com foco $foco.tipo', ({ quem, foco }) => {
    estado.acesso = ACESSOS[quem]!
    semear(foco)
    const { container } = montar()
    expect(screen.queryAllByRole('button')).toHaveLength(0)
    for (const papel of ['textbox', 'checkbox', 'radio', 'combobox', 'spinbutton', 'link'] as const) {
      expect(screen.queryAllByRole(papel)).toHaveLength(0)
    }
    expect(container.querySelector('form, input, select, textarea')).toBeNull()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })
})
