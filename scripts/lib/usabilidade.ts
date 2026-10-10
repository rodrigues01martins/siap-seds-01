// Tarefas do teste com usuários e o questionário SUS (System Usability Scale, Brooke 1996; tradução usada no
// Brasil por Tenório et al., 2011). Fonte única para docs/TESTE-USABILIDADE.md e a planilha-modelo.

export interface TarefaUsabilidade {
  codigo: string
  titulo: string
  perfil: string
  tempoAlvoMin: number
}

export const TAREFAS_USABILIDADE: TarefaUsabilidade[] = [
  { codigo: 'T1', titulo: 'Abrir a sessão da Comissão', perfil: 'presidente', tempoAlvoMin: 3 },
  { codigo: 'T2', titulo: 'Registrar a admissibilidade de uma proposta', perfil: 'relator', tempoAlvoMin: 4 },
  { codigo: 'T3', titulo: 'Avaliar um subcritério da D1 e projetá-lo no telão', perfil: 'relator e presidente', tempoAlvoMin: 3 },
  { codigo: 'T4', titulo: 'Cadastrar uma experiência da D2 e conferir a memória de cálculo', perfil: 'relator', tempoAlvoMin: 5 },
  { codigo: 'T5', titulo: 'Homologar a proposta e gerar a minuta da ata', perfil: 'presidente', tempoAlvoMin: 3 },
]

export const PERGUNTAS_SUS = [
  'Eu acho que gostaria de usar este sistema com frequência.',
  'Eu acho o sistema desnecessariamente complexo.',
  'Eu achei o sistema fácil de usar.',
  'Eu acho que precisaria de ajuda de uma pessoa com conhecimentos técnicos para usar o sistema.',
  'Eu acho que as várias funções do sistema estão muito bem integradas.',
  'Eu acho que o sistema apresenta muita inconsistência.',
  'Eu imagino que as pessoas aprenderão a usar este sistema rapidamente.',
  'Eu achei o sistema atrapalhado de usar.',
  'Eu me senti confiante ao usar o sistema.',
  'Eu precisei aprender várias coisas novas antes de conseguir usar o sistema.',
] as const

/** Nota SUS (0–100) de 10 respostas de 1 a 5: ímpares (resposta − 1), pares (5 − resposta), soma × 2,5. */
export function notaSus(respostas: readonly number[]): number {
  if (respostas.length !== 10 || respostas.some((r) => !Number.isInteger(r) || r < 1 || r > 5)) {
    throw new RangeError('O SUS tem 10 respostas inteiras de 1 a 5.')
  }
  return respostas.reduce((soma, r, i) => soma + (i % 2 === 0 ? r - 1 : 5 - r), 0) * 2.5
}
