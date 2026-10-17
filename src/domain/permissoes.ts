// Acesso ao app (espelha a seção "Acesso" do CLAUDE.md): um único perfil, o Administrador, que faz a gestão
// de usuários; os demais recebem permissões por área. Fica em usuarios/{uid} (admin, permissoes, ativo),
// gravado só pela /api (tela Usuários) e lido pelas firestore.rules, pela /api e pelo app.

export const AREAS = [
  {
    id: 'consulta',
    rotulo: 'Consulta',
    permissoes: [{ id: 'consultar', rotulo: 'Ver chamamentos, avaliações e relatórios (somente leitura)' }],
  },
  {
    id: 'cadastros',
    rotulo: 'Cadastros',
    permissoes: [
      { id: 'chamamentos', rotulo: 'Chamamentos e lotes' },
      { id: 'oscs', rotulo: 'OSCs' },
      { id: 'propostas', rotulo: 'Propostas' },
    ],
  },
  {
    id: 'avaliacao',
    rotulo: 'Avaliação',
    permissoes: [
      { id: 'admissibilidade', rotulo: 'Admissibilidade (Anexo III, item 28)' },
      { id: 'nivelD1', rotulo: 'Níveis da D1 (subcritérios)' },
      { id: 'experienciasD2', rotulo: 'Experiências da D2' },
      { id: 'diligencias', rotulo: 'Diligências (RF-28)' },
    ],
  },
  {
    id: 'sessao',
    rotulo: 'Sessão e resultado',
    permissoes: [
      { id: 'sessaoAbrirEncerrar', rotulo: 'Abrir e encerrar sessão' },
      { id: 'sessaoConduzir', rotulo: 'Conduzir sessão (presentes, impedimentos e telão)' },
      { id: 'homologar', rotulo: 'Homologar proposta' },
      { id: 'reabrir', rotulo: 'Reabrir proposta homologada (RF-18)' },
      { id: 'desempate', rotulo: 'Registrar desempate da Comissão (RF-27)' },
    ],
  },
] as const

export type Permissao = (typeof AREAS)[number]['permissoes'][number]['id']

export const PERMISSOES: readonly Permissao[] = AREAS.flatMap((a) => a.permissoes.map((p) => p.id))

/** O que a operação exige: uma permissão ou ser administrador (gestão de usuários, histórico e exclusão de cadastros). */
export type Exigencia = Permissao | 'admin'

export interface Acesso {
  admin: boolean
  ativo: boolean
  permissoes: readonly Permissao[]
}

export function ehPermissao(valor: unknown): valor is Permissao {
  return typeof valor === 'string' && (PERMISSOES as readonly string[]).includes(valor)
}

/** Lê o documento usuarios/{uid}; ausente = null (sem cadastro). Valores inválidos viram o padrão seguro. */
export function lerAcesso(dados: Record<string, unknown> | null | undefined): Acesso | null {
  if (!dados) return null
  return {
    admin: dados.admin === true,
    ativo: dados.ativo !== false,
    permissoes: Array.isArray(dados.permissoes) ? dados.permissoes.filter(ehPermissao) : [],
  }
}

/** Entra no app e lê os dados: conta ativa, administradora ou com ao menos uma permissão. */
export function podeLer(acesso: Acesso | null): boolean {
  return acesso !== null && acesso.ativo && (acesso.admin || acesso.permissoes.length > 0)
}

export function podeFazer(acesso: Acesso | null, exigencia: Exigencia): boolean {
  if (!acesso?.ativo) return false
  if (acesso.admin) return true
  return exigencia !== 'admin' && acesso.permissoes.includes(exigencia)
}
