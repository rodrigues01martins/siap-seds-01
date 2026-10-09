// Matriz de permissões de escrita e leitura sensível (espelha a seção do CLAUDE.md).

import type { Perfil } from './perfis.js'

export const PERMISSOES = {
  /** C1 — chamamentos, OSCs e propostas */
  cadastros: ['admin'],
  /** C2 — nível dos subcritérios da D1 */
  nivelD1: ['presidente', 'relator', 'membro'],
  /** C3 — experiências da D2 */
  experienciasD2: ['presidente', 'relator'],
  /** C5 — homologar proposta */
  homologar: ['presidente'],
  /** C6 — dar e remover perfis */
  perfis: ['admin'],
  /** Sessão da Comissão: abrir e encerrar */
  sessaoAbrirEncerrar: ['presidente'],
  /** Sessão: presentes, declarações de impedimento e foco */
  sessaoConduzir: ['presidente', 'relator'],
  /** Admissibilidade (Anexo III, item 28) */
  admissibilidade: ['presidente', 'relator'],
  /** Leitura da trilha de auditoria (também nas firestore.rules) */
  lerAuditoria: ['admin', 'presidente', 'controle'],
} as const satisfies Record<string, readonly Perfil[]>

export type AcaoProtegida = keyof typeof PERMISSOES

export function podeFazer(perfil: Perfil | null, acao: AcaoProtegida): boolean {
  return perfil !== null && (PERMISSOES[acao] as readonly Perfil[]).includes(perfil)
}
