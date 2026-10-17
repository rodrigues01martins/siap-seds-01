// Etapa 6a — desempate (RF-27): esquema da /api e da tela.

import { idDocumento, semRepeticao, z } from './base.js'

export const JUSTIFICATIVA_DESEMPATE_MINIMA = 20

export const esquemaDesempate = z.strictObject({
  chamamentoId: idDocumento,
  /** Sessão aberta em que a Comissão decide (vai para o documento). */
  sessaoId: idDocumento,
  loteCodigo: z.string({ error: 'Informe o lote.' }).trim().min(1, 'Informe o lote.'),
  /** Propostas empatadas na ordem decidida pela Comissão (1ª = melhor posição). */
  ordem: z
    .array(idDocumento)
    .min(2, 'Informe ao menos duas propostas empatadas.')
    .refine(semRepeticao(), 'Há propostas repetidas.'),
  justificativa: z
    .string({ error: 'Informe a justificativa do desempate.' })
    .trim()
    .min(JUSTIFICATIVA_DESEMPATE_MINIMA, `Informe a justificativa do desempate (ao menos ${JUSTIFICATIVA_DESEMPATE_MINIMA} caracteres).`)
    .max(2000),
})
