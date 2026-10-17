// Papel de quem está presente na sessão da Comissão de Seleção: só o nome e o papel (sem login). Cada sessão
// tem exatamente um presidente; os demais são membros. Aparece na sessão e na ata (assinaturas).

export const PAPEIS_SESSAO = ['presidente', 'membro'] as const

export type PapelSessao = (typeof PAPEIS_SESSAO)[number]

export const ROTULO_PAPEL: Record<PapelSessao, string> = {
  presidente: 'Presidente',
  membro: 'Membro',
}

export function ehPapelSessao(valor: unknown): valor is PapelSessao {
  return typeof valor === 'string' && (PAPEIS_SESSAO as readonly string[]).includes(valor)
}
