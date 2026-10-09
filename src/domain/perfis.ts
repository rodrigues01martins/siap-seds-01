// Perfis de acesso (custom claim "perfil" do Firebase Auth).

export const PERFIS = ['admin', 'presidente', 'relator', 'membro', 'controle'] as const

export type Perfil = (typeof PERFIS)[number]

/** Perfis que compõem a Comissão de Seleção (presentes nas sessões). */
export const PERFIS_COMISSAO = ['presidente', 'relator', 'membro'] as const satisfies readonly Perfil[]

export function ehPerfil(valor: unknown): valor is Perfil {
  return typeof valor === 'string' && (PERFIS as readonly string[]).includes(valor)
}

/** Lê o claim "perfil"; valor ausente ou desconhecido vira null (sem acesso). */
export function extrairPerfil(claims: Record<string, unknown> | null | undefined): Perfil | null {
  const perfil = claims?.perfil
  return ehPerfil(perfil) ? perfil : null
}
