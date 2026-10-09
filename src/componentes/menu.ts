// Itens do menu lateral por perfil (separado do React para ser testável).

import type { Perfil } from '../domain/perfis'
import { PERMISSOES } from '../domain/permissoes'

export interface ItemMenu {
  rotulo: string
  caminho: string
}

const ITENS: (ItemMenu & { perfis: readonly Perfil[] })[] = [
  { rotulo: 'Chamamentos', caminho: '/', perfis: ['admin', 'presidente', 'relator', 'membro', 'controle'] },
  { rotulo: 'OSCs', caminho: '/oscs', perfis: ['admin'] },
  { rotulo: 'Perfis de acesso', caminho: '/perfis', perfis: ['admin'] },
  { rotulo: 'Auditoria', caminho: '/auditoria', perfis: PERMISSOES.lerAuditoria },
]

export function itensDoMenu(perfil: Perfil | null): ItemMenu[] {
  if (!perfil) return []
  return ITENS.filter((item) => item.perfis.includes(perfil)).map(({ rotulo, caminho }) => ({ rotulo, caminho }))
}
