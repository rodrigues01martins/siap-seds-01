// Ensaio da sessão no projeto dev: 1 chamamento, 2 lotes, 3 OSCs e 6 propostas fictícias que cobrem
// apta, inapta (D1 < 67,2), desclassificada (nível 0 em 1.1), não admitida, pendente e empate.
// Os documentos têm o formato que a /api grava; totais e memória da D2 vêm de src/domain, como em
// api/_lib/recalcular.ts. Tudo é marcado como ENSAIO (ids, nomes e o campo ensaio: true).

import { calcularAdmissibilidade, type EntradaAdmissibilidade } from '../../src/domain/admissibilidade'
import { MATRIZ_2026 } from '../../src/domain/matriz'
import { consolidarProposta } from '../../src/domain/proposta'
import { paraExperiencia } from '../../src/esquemas/experiencia'
import type { DadosDocumento } from './backup'

export const CHAMAMENTO_ENSAIO = 'ensaio-2026'
const SESSAO = 'ensaio-sessao-1'
const DATA_LIMITE = '2026-10-31'
const AUTOR = { uid: 'script-ensaio', email: null }

type Esperado = 'apta' | 'inapta' | 'desclassificada' | 'nao_admitida' | 'pendente'

export interface PropostaEnsaio {
  id: string
  lote: string
  osc: string
  esperado: Esperado
}

/** CNPJs alfanuméricos válidos (IN RFB 2.229/2024) e obviamente fictícios. */
const OSCS = [
  { cnpj: 'ENSAIO00000180', razaoSocial: 'Instituto Alfa (ENSAIO)', nomeFantasia: 'Alfa' },
  { cnpj: 'ENSAIO00000260', razaoSocial: 'Associação Beta (ENSAIO)', nomeFantasia: 'Beta' },
  { cnpj: 'ENSAIO00000341', razaoSocial: 'Centro Gama (ENSAIO)', nomeFantasia: 'Gama' },
] as const

const PLANOS = MATRIZ_2026.dimensao1.planos
const CODIGOS = PLANOS.flatMap((p) => p.subcriterios.map((s) => s.codigo))
const limiteDe = (codigo: string) => PLANOS.find((p) => p.subcriterios.some((s) => s.codigo === codigo))!.limitePaginas

interface Roteiro {
  id: string
  lote: string
  osc: number
  esperado: Esperado
  /** Nível por subcritério (os ausentes ficam pendentes). */
  niveis: Record<string, number>
  experiencias: DadosDocumento[]
  admissao: 'admitida' | 'nao_admitida'
}

const todos = (nivel: number, ajustes: Record<string, number> = {}, sem: string[] = []) => ({
  ...Object.fromEntries(CODIGOS.filter((c) => !sem.includes(c)).map((c) => [c, nivel])),
  ...ajustes,
})

function experiencia(descricao: string, dados: DadosDocumento = {}): DadosDocumento {
  return {
    descricao,
    categorias: ['A'],
    modalidade: 'internacao',
    orgaoParceiro: 'Órgão fictício (ENSAIO)',
    instrumento: 'Termo de Colaboração 00/2020 (ENSAIO)',
    mrosc: true,
    inicio: '2020-01-01',
    fim: null,
    vagas: 40,
    unidades: 1,
    trabalhadores: 60,
    valorAnualCentavos: 300_000_000,
    documentos: [{ tipo: 'Atestado de capacidade técnica', numeroSEI: '00000000', comprovaExecucaoSatisfatoria: true, aceito: true }],
    desconsideracoes: [],
    ...dados,
  }
}

const ROTEIRO: Roteiro[] = [
  // Lote 1: Alfa pendente (faltam 3 subcritérios do PA6); Beta e Gama aptas e EMPATADAS (mesmos níveis e D2).
  {
    id: 'ensaio-l1-alfa',
    lote: 'L1',
    osc: 0,
    esperado: 'pendente',
    niveis: todos(4, {}, ['6.2', '6.3', '6.4']),
    experiencias: [
      experiencia('Gestão de unidade de internação — CASE fictício (ENSAIO)', { categorias: ['A', 'D'], inicio: '2016-01-01' }),
      experiencia('Semiliberdade — unidade fictícia (ENSAIO)', { categorias: ['B'], modalidade: 'semiliberdade', inicio: '2019-03-01', fim: '2024-02-29', vagas: 20, unidades: null }),
    ],
    admissao: 'admitida',
  },
  {
    id: 'ensaio-l1-beta',
    lote: 'L1',
    osc: 1,
    esperado: 'apta',
    niveis: todos(3),
    experiencias: [experiencia('Internação — unidade fictícia Beta (ENSAIO)')],
    admissao: 'admitida',
  },
  {
    id: 'ensaio-l1-gama',
    lote: 'L1',
    osc: 2,
    esperado: 'apta',
    niveis: todos(3),
    experiencias: [experiencia('Internação — unidade fictícia Gama (ENSAIO)')],
    admissao: 'admitida',
  },
  // Lote 2: Alfa inapta (D1 = 56 < 67,2); Beta desclassificada (nível 0 em 1.1); Gama não admitida.
  {
    id: 'ensaio-l2-alfa',
    lote: 'L2',
    osc: 0,
    esperado: 'inapta',
    niveis: todos(2),
    experiencias: [experiencia('Meio aberto — programa fictício (ENSAIO)', { categorias: ['C'], modalidade: 'meio_aberto', vagas: 100, unidades: null })],
    admissao: 'admitida',
  },
  { id: 'ensaio-l2-beta', lote: 'L2', osc: 1, esperado: 'desclassificada', niveis: todos(4, { '1.1': 0 }), experiencias: [], admissao: 'admitida' },
  { id: 'ensaio-l2-gama', lote: 'L2', osc: 2, esperado: 'nao_admitida', niveis: {}, experiencias: [], admissao: 'nao_admitida' },
]

function admissibilidade(admissao: Roteiro['admissao']) {
  const regras = MATRIZ_2026.admissibilidade
  const naoAdmitida = admissao === 'nao_admitida'
  const entrada: EntradaAdmissibilidade = {
    requisitos: Object.fromEntries(
      regras.requisitosEssenciais
        .filter((r) => r.codigo !== regras.requisitoPlanos)
        .map((r, i) => [r.codigo, !(naoAdmitida && i === 3)]),
    ),
    irregularidadesFormais: [],
    planos: PLANOS.map((p, i) => ({ codigo: p.codigo, ausente: false, paginaInicial: i * 15 + 3, paginaFinal: i * 15 + 3 + Math.min(p.limitePaginas, 10) - 1 })),
    resultado: admissao,
    ...(naoAdmitida ? { motivacao: 'Arquivo do Caderno não abre integralmente no SEI (ENSAIO).' } : {}),
  }
  return { ...calcularAdmissibilidade(entrada), registradaPor: AUTOR }
}

function avaliacao(codigo: string, nivel: number): DadosDocumento {
  const maioria = codigo === '2.1'
  return {
    nivel,
    justificativa: `Registro fictício do ENSAIO para o subcritério ${codigo}: nível ${nivel} conforme debate da Comissão.`,
    paginas: [1, Math.min(2, limiteDe(codigo))],
    decisao: maioria ? 'maioria' : 'unanimidade',
    ...(maioria ? { votoDivergente: 'Um membro votou um nível abaixo (ENSAIO).' } : {}),
    sessaoId: SESSAO,
  }
}

export function montarEnsaio(dataSessao: string): {
  documentos: Record<string, DadosDocumento>
  propostas: PropostaEnsaio[]
  oscs: string[]
  sessaoId: string
} {
  const base = `chamamentos/${CHAMAMENTO_ENSAIO}`
  const documentos: Record<string, DadosDocumento> = {
    [base]: {
      numero: 'ENSAIO-001/2026',
      titulo: 'ENSAIO — chamamento fictício para treinar a sessão',
      processoSei: '00000.000000/2026-00',
      dataLimitePropostas: DATA_LIMITE,
      lotes: [
        { codigo: 'L1', descricao: 'Unidade fictícia A (ENSAIO)' },
        { codigo: 'L2', descricao: 'Unidade fictícia B (ENSAIO)' },
      ],
      ensaio: true,
    },
  }
  for (const osc of OSCS) documentos[`oscs/${osc.cnpj}`] = { ...osc, ensaio: true }

  const avaliadas: string[] = []
  for (const [n, r] of ROTEIRO.entries()) {
    const caminho = `${base}/propostas/${r.id}`
    const experiencias = r.experiencias.map((dados, i) => ({ id: `${r.id}-exp${i + 1}`, dados }))
    const proposta: DadosDocumento = {
      loteCodigo: r.lote,
      oscCnpj: OSCS[r.osc]!.cnpj,
      protocolo: `ENSAIO-PROT-${String(n + 1).padStart(3, '0')}`,
      numeroSEI: `0000000${n + 1}`,
      observacao: 'Proposta fictícia do ENSAIO.',
      bloqueada: false,
      ensaio: true,
      admissibilidade: admissibilidade(r.admissao),
    }
    if (r.admissao === 'admitida') {
      const lista = experiencias
        .map((e) => paraExperiencia(e.id, e.dados))
        .sort((a, b) => a.inicio.localeCompare(b.inicio) || a.id.localeCompare(b.id))
      const { totais, resultadoD2 } = consolidarProposta({ niveis: r.niveis, experiencias: lista, dataLimite: DATA_LIMITE })
      proposta.totais = totais
      documentos[`${caminho}/resultadoD2/atual`] = resultadoD2 as unknown as DadosDocumento
      for (const [codigo, nivel] of Object.entries(r.niveis)) documentos[`${caminho}/avaliacoes/${codigo}`] = avaliacao(codigo, nivel)
      for (const e of experiencias) documentos[`${caminho}/experiencias/${e.id}`] = e.dados
      avaliadas.push(r.id)
    }
    documentos[caminho] = proposta
  }

  documentos[`${base}/sessoes/${SESSAO}`] = {
    data: dataSessao,
    status: 'encerrada',
    pauta: avaliadas,
    presentes: [],
    declaracoes: [],
    foco: null,
    abertaPor: AUTOR,
  }

  return {
    documentos,
    propostas: ROTEIRO.map((r) => ({ id: r.id, lote: r.lote, osc: OSCS[r.osc]!.razaoSocial, esperado: r.esperado })),
    oscs: OSCS.map((o) => o.cnpj),
    sessaoId: SESSAO,
  }
}
