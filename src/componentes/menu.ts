// Itens do menu lateral conforme o acesso (separado do React para ser testável).

import { podeFazer, podeLer, type Acesso, type Exigencia } from '../domain/permissoes'

export interface ItemMenu {
  rotulo: string
  caminho: string
}

/** Sem `exige`: aparece para todos que entram no app. */
const ITENS: (ItemMenu & { exige?: Exigencia })[] = [
  { rotulo: 'Chamamentos', caminho: '/' },
  { rotulo: 'OSCs', caminho: '/oscs', exige: 'oscs' },
  { rotulo: 'Usuários', caminho: '/usuarios', exige: 'admin' },
  { rotulo: 'Histórico de alterações', caminho: '/auditoria', exige: 'admin' },
]

export function itensDoMenu(acesso: Acesso | null): ItemMenu[] {
  if (!podeLer(acesso)) return []
  return ITENS.filter((item) => !item.exige || podeFazer(acesso, item.exige)).map(({ rotulo, caminho }) => ({ rotulo, caminho }))
}
