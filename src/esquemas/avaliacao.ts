// C2 — registro do nível de um subcritério da D1: esquema da /api e do formulário da tela.
// As regras de negócio (matriz, escala, página de corte, justificativa mínima) ficam em
// src/domain/avaliacao.ts; esquemaRegistroComRegras as aplica no navegador antes de enviar.

import { problemasDoRegistro } from '../domain/avaliacao.js'
import { idDocumento, z } from './base.js'

export const DECISOES = ['unanimidade', 'maioria'] as const

const campos = {
  codigo: z.string({ error: 'Informe o subcritério.' }).trim().min(1, 'Informe o subcritério.'),
  nivel: z.number({ error: 'Escolha o nível.' }).int('O nível deve ser um inteiro de 0 a 4.'),
  justificativa: z.string({ error: 'Informe a justificativa.' }).trim(),
  paginas: z.array(z.number()).default([]),
  decisao: z.enum(DECISOES, { error: 'Use unanimidade ou maioria.' }),
  votoDivergente: z.string().trim().min(1, 'Descreva o voto divergente.').optional(),
  sessaoId: idDocumento,
}

export const esquemaRegistroAvaliacao = z.strictObject({
  chamamentoId: idDocumento,
  propostaId: idDocumento,
  ...campos,
})

/** Mesmo esquema + as regras do domínio (o mínimo da justificativa vem do chamamento). */
export function esquemaRegistroComRegras(justificativaMinima?: number) {
  return esquemaRegistroAvaliacao.superRefine((registro, ctx) => {
    for (const [campo, message] of Object.entries(problemasDoRegistro(registro, { justificativaMinima }))) {
      ctx.addIssue({ code: 'custom', path: [campo], message })
    }
  })
}
