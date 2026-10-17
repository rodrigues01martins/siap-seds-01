// Regras de exibição da tela Usuários (separadas do React para serem testáveis).

import { lerAcesso, type Perfil } from '../../domain/permissoes'
import type { ComId } from '../../lib/firestore'
import type { UsuarioCadastro } from '../../lib/tipos'

export type LinhaUsuario = ComId<UsuarioCadastro>

const semAcento = (texto: string) => texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

export const nomeDe = (u: UsuarioCadastro) => u.nome?.trim() || u.email

/** Perfil do cadastro (o administrador antigo conta como admin); null = cadastro antigo, sem perfil. */
export const perfilDe = (u: UsuarioCadastro): Perfil | null => lerAcesso({ ...u })?.perfil ?? null

export function resumoUsuarios(lista: LinhaUsuario[]) {
  return {
    total: lista.length,
    administradores: lista.filter((u) => perfilDe(u) === 'admin').length,
    presidentes: lista.filter((u) => perfilDe(u) === 'presidente').length,
    acessoAtualizar: lista.filter((u) => u.ativo !== false && perfilDe(u) === null).length,
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
