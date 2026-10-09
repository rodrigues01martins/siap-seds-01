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
  decisao: z.enum(DECISOES, { error: 'Escolha a decisão (unanimidade ou maioria).' }),
  votoDivergente: z.string().trim().min(1, 'Descreva o voto divergente.').optional(),
}

/** O que a Comissão decide sobre o subcritério (o painel da tela envia isto). */
export const esquemaCamposRegistro = z.strictObject(campos)
export type CamposRegistro = z.output<typeof esquemaCamposRegistro>

export const esquemaRegistroAvaliacao = esquemaCamposRegistro.extend({
  chamamentoId: idDocumento,
  propostaId: idDocumento,
  sessaoId: idDocumento,
})

/** Campos do registro + as regras do domínio (o mínimo da justificativa vem do chamamento). */
export function esquemaCamposComRegras(justificativaMinima?: number) {
  return esquemaCamposRegistro.superRefine((registro, ctx) => {
    for (const [campo, message] of Object.entries(problemasDoRegistro(registro, { justificativaMinima }))) {
      ctx.addIssue({ code: 'custom', path: [campo], message })
    }
  })
}
