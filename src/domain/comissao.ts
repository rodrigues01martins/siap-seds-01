// Papel de cada pessoa na Comissão de Seleção (usuarios/{uid}.comissao). Só identifica quem pode constar
// como presente na sessão e como assina a ata; o que cada um pode fazer vem das permissões (permissoes.ts).

export const PAPEIS_COMISSAO = ['presidente', 'relator', 'membro'] as const

export type PapelComissao = (typeof PAPEIS_COMISSAO)[number]

export const ROTULO_PAPEL: Record<PapelComissao, string> = {
  presidente: 'Presidente',
  relator: 'Relator',
  membro: 'Membro',
}

export function ehPapelComissao(valor: unknown): valor is PapelComissao {
  return typeof valor === 'string' && (PAPEIS_COMISSAO as readonly string[]).includes(valor)
}
