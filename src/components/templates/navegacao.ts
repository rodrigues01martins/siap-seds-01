// Itens da navegação lateral, agrupados por domínio (§12): Sessão | Avaliação | Resultado | Cadastros |
// Administração, mais "Início". Sessão, Avaliação e Resultado dependem do chamamento aberto na rota.
// Admin e presidente veem tudo; "Usuários" só o admin (src/domain/permissoes). Separado do React para teste.

import {
  DatabaseZap,
  Building2,
  ClipboardList,
  FilePlus2,
  LayoutGrid,
  ListChecks,
  Presentation,
  SquarePen,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { podeFazer, podeLer, type Acesso, type Exigencia } from '../../domain/permissoes'
import { rotaSessao } from '../../lib/rotas'

export interface ItemNavegacao {
  rotulo: string
  caminho: string
  icone: LucideIcon
  /** Só marca como atual na rota exata (ex.: "/" não fica ativo em todas as telas). */
  exato?: boolean
}

export interface GrupoNavegacao {
  id: 'inicio' | 'sessao' | 'avaliacao' | 'resultado' | 'cadastros' | 'administracao'
  rotulo: string
  itens: ItemNavegacao[]
}

export interface ContextoNavegacao {
  /** Chamamento da rota atual (/chamamentos/:ch/...), com os códigos dos lotes. */
  chamamento?: { id: string; numero: string; lotes: string[] }
  /** Id da sessão aberta do chamamento, ou null. */
  sessaoAberta?: string | null
}

type Candidato = ItemNavegacao & { exige?: Exigencia }

export function gruposDeNavegacao(acesso: Acesso | null, { chamamento, sessaoAberta = null }: ContextoNavegacao): GrupoNavegacao[] {
  if (!podeLer(acesso)) return []
  const ch = chamamento ? `/chamamentos/${chamamento.id}` : null

  const grupos: { id: GrupoNavegacao['id']; rotulo: string; itens: Candidato[] }[] = [
    { id: 'inicio', rotulo: 'Início', itens: [{ rotulo: 'Chamamentos', caminho: '/', icone: LayoutGrid, exato: true }] },
    {
      id: 'sessao',
      rotulo: 'Sessão',
      itens: !ch
        ? []
        : sessaoAberta
          ? [{ rotulo: 'Sessão em andamento', caminho: rotaSessao(chamamento!.id, sessaoAberta), icone: Presentation }]
          : [{ rotulo: 'Abrir sessão', caminho: `${ch}/sessoes/nova`, icone: Presentation }],
    },
    {
      id: 'avaliacao',
      rotulo: 'Avaliação',
      itens: ch ? [{ rotulo: 'Propostas do chamamento', caminho: ch, icone: ListChecks, exato: true }] : [],
    },
    {
      id: 'resultado',
      rotulo: 'Resultado',
      itens: (chamamento?.lotes ?? []).map((lote) => ({
        rotulo: `Classificação — Lote ${lote}`,
        caminho: `${ch}/lotes/${encodeURIComponent(lote)}/classificacao`,
        icone: Trophy,
      })),
    },
    {
      id: 'cadastros',
      rotulo: 'Cadastros',
      itens: [
        ...(ch
          ? [
              { rotulo: 'Dados do chamamento', caminho: `${ch}/editar`, icone: SquarePen },
              { rotulo: 'Nova proposta', caminho: `${ch}/propostas/nova`, icone: FilePlus2 },
            ]
          : []),
        { rotulo: 'Novo chamamento', caminho: '/chamamentos/novo', icone: ClipboardList },
        { rotulo: 'OSCs', caminho: '/oscs', icone: Building2 },
      ],
    },
    {
      id: 'administracao',
      rotulo: 'Administração',
      itens: [
        { rotulo: 'Usuários', caminho: '/usuarios', icone: Users, exige: 'admin' },
        { rotulo: 'Limpar base', caminho: '/admin/limpar-base', icone: DatabaseZap, exige: 'admin' },
      ],
    },
  ]

  return grupos
    .map((g) => ({
      id: g.id,
      rotulo: g.rotulo,
      itens: g.itens.filter((i) => !i.exige || podeFazer(acesso, i.exige)).map(({ exige: _e, ...item }) => item),
    }))
    .filter((g) => g.itens.length > 0)
}
