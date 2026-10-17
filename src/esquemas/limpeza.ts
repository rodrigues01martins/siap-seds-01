// Limpeza da base (Simplificação 4/4): esquemas da /api/admin/limpar-base e da tela Administração → Limpar base.
// É a única exclusão com digitação ("APAGAR TUDO"), por apagar o sistema inteiro.

import { z } from './base.js'

export const CONFIRMACAO_LIMPEZA = 'APAGAR TUDO'

export const esquemaPreviaLimpeza = z.strictObject({
  simular: z.literal('true', { error: 'Use ?simular=true para ver a prévia.' }),
})

export const esquemaLimparBase = z.discriminatedUnion(
  'acao',
  [
    z.strictObject({
      acao: z.literal('limpar'),
      confirmacao: z.string({ error: `Digite ${CONFIRMACAO_LIMPEZA} para confirmar.` }).refine((v) => v === CONFIRMACAO_LIMPEZA, `Digite ${CONFIRMACAO_LIMPEZA} para confirmar.`),
      /** Projeto mostrado na prévia: a /api recusa se não for o mesmo em que grava. */
      projectId: z.string({ error: 'Informe o projeto da prévia.' }).min(1, 'Informe o projeto da prévia.'),
      /** Remove também do Auth e de usuarios/ todos os usuários, menos o admin que executa. */
      removerUsuarios: z.boolean().default(false),
    }),
    z.strictObject({ acao: z.literal('recarregar-matriz') }),
  ],
  { error: 'Ação inválida. Use limpar ou recarregar-matriz.' },
)

export type Ambiente = 'DEV' | 'PRODUÇÃO'

export interface SituacaoMatriz {
  versao: string
  /** O documento matrizes/{versão} existe e é igual ao matriz_2026.json do código. */
  atual: boolean
}

export interface PreviaLimpeza {
  projectId: string
  ambiente: Ambiente
  /** Documentos que serão apagados, por coleção (subcoleções somadas pelo nome: propostas, avaliacoes…). */
  itens: Record<string, number>
  total: number
  /** Outros usuários (sem o admin que executa): só saem com removerUsuarios. */
  usuarios: { cadastros: number; contas: number }
  matriz: SituacaoMatriz
}

export interface ResultadoLimpeza {
  itens: Record<string, number>
  total: number
  usuariosRemovidos: number
  matriz: { versao: string; situacao: 'criada' | 'atualizada' | 'atual' }
}
