// Regras de exibição da tela Usuários (separadas do React para serem testáveis).

import { AREAS, PERMISSOES, lerAcesso, podeLer, type Permissao } from '../../domain/permissoes'
import type { ComId } from '../../lib/firestore'
import type { UsuarioCadastro } from '../../lib/tipos'

export type LinhaUsuario = ComId<UsuarioCadastro>

const semAcento = (texto: string) => texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

export const nomeDe = (u: UsuarioCadastro) => u.nome?.trim() || u.email

export function resumoUsuarios(lista: LinhaUsuario[]) {
  return {
    total: lista.length,
    administradores: lista.filter((u) => u.admin === true).length,
    semAcesso: lista.filter((u) => u.ativo !== false && !podeLer(lerAcesso({ ...u }))).length,
    desativados: lista.filter((u) => u.ativo === false).length,
  }
}

export function filtrarUsuarios(lista: LinhaUsuario[], busca: string): LinhaUsuario[] {
  const termo = semAcento(busca.trim())
  if (!termo) return lista
  return lista.filter((u) => semAcento(`${u.nome ?? ''} ${u.email}`).includes(termo))
}

export function ordenarUsuarios(lista: LinhaUsuario[]): LinhaUsuario[] {
  return [...lista].sort((a, b) => nomeDe(a).localeCompare(nomeDe(b), 'pt-BR'))
}

/** Rótulos das áreas com ao menos uma permissão; 'todas' para o administrador. */
export function areasLiberadas(u: UsuarioCadastro): string[] | 'todas' {
  if (u.admin) return 'todas'
  const ativas = new Set(u.permissoes ?? [])
  return AREAS.filter((a) => a.permissoes.some((p) => ativas.has(p.id))).map((a) => a.rotulo)
}

export function contagemPermissoes(u: UsuarioCadastro): string {
  if (u.admin) return 'Automático'
  const ativas = (u.permissoes ?? []).filter((p) => PERMISSOES.includes(p))
  return `${ativas.length}/${PERMISSOES.length}`
}

/** Liga ou desliga uma permissão, mantendo a ordem das áreas (a mesma da tela). */
export function alternarPermissao(atuais: readonly Permissao[], permissao: Permissao): Permissao[] {
  const conjunto = new Set(atuais)
  if (conjunto.has(permissao)) conjunto.delete(permissao)
  else conjunto.add(permissao)
  return PERMISSOES.filter((p) => conjunto.has(p))
}
