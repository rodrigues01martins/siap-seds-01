// Acesso ao app (espelha a seção "Acesso" do CLAUDE.md): dois perfis com login, admin e presidente. Os dois
// fazem tudo no sistema; só o admin gerencia usuários e perfis. Fica em usuarios/{uid} (perfil, ativo),
// gravado só pela /api (tela Usuários) e lido pelas firestore.rules, pela /api e pelo app.
// Cadastro do modelo anterior (relator, membro, controle: permissões por área e papel, sem perfil) fica sem
// acesso até o admin dar um perfil novo; o administrador antigo (admin: true, sem perfil) continua admin.

export const PERFIS = ['admin', 'presidente'] as const

export type Perfil = (typeof PERFIS)[number]

export const ROTULO_PERFIL: Record<Perfil, string> = {
  admin: 'Administrador',
  presidente: 'Presidente',
}

export const DESCRICAO_PERFIL: Record<Perfil, string> = {
  admin: 'Faz tudo no sistema e gerencia usuários e perfis.',
  presidente: 'Faz tudo no sistema, menos gerenciar usuários e perfis.',
}

/** O que a operação exige: qualquer perfil ('usuario') ou ser administrador (gestão de usuários). */
export type Exigencia = 'usuario' | 'admin'

export interface Acesso {
  /** null = cadastro sem perfil válido (modelo anterior): sem acesso até o admin atualizar. */
  perfil: Perfil | null
  ativo: boolean
}

export const ACESSO_DESATUALIZADO = 'Seu acesso precisa ser atualizado pelo administrador.'

export function ehPerfil(valor: unknown): valor is Perfil {
  return typeof valor === 'string' && (PERFIS as readonly string[]).includes(valor)
}

/** Lê o documento usuarios/{uid}; ausente = null (sem cadastro). O campo perfil, se existe, vale mais que o antigo admin. */
export function lerAcesso(dados: Record<string, unknown> | null | undefined): Acesso | null {
  if (!dados) return null
  const perfil = 'perfil' in dados ? (ehPerfil(dados.perfil) ? dados.perfil : null) : dados.admin === true ? 'admin' : null
  return { perfil, ativo: dados.ativo !== false }
}

/** Entra no app e lê os dados: conta ativa com perfil. */
export function podeLer(acesso: Acesso | null): boolean {
  return acesso !== null && acesso.ativo && acesso.perfil !== null
}

export function podeFazer(acesso: Acesso | null, exigencia: Exigencia = 'usuario'): boolean {
  if (!podeLer(acesso)) return false
  return exigencia === 'usuario' || acesso!.perfil === 'admin'
}

/** Cadastro ativo do modelo anterior, sem perfil novo: a tela e a /api pedem a atualização pelo admin. */
export function precisaAtualizarAcesso(acesso: Acesso | null): boolean {
  return acesso !== null && acesso.ativo && acesso.perfil === null
}
