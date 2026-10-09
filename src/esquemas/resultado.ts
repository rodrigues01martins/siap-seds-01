// Etapa 6a — desempate (RF-27), reabertura (RF-18) e diligências (RF-28): esquemas da /api e das telas.

import { dataIso, hojeEmGoias, idDocumento, semRepeticao, z } from './base.js'

export const JUSTIFICATIVA_DESEMPATE_MINIMA = 20
export const MOTIVO_REABERTURA_MINIMO = 20

export const esquemaDesempate = z.strictObject({
  chamamentoId: idDocumento,
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

export const esquemaReabrir = z.strictObject({
  chamamentoId: idDocumento,
  propostaId: idDocumento,
  motivo: z
    .string({ error: 'Informe o motivo da reabertura.' })
    .trim()
    .min(MOTIVO_REABERTURA_MINIMO, `Informe o motivo da reabertura (ao menos ${MOTIVO_REABERTURA_MINIMO} caracteres).`)
    .max(2000),
})

const prazo = dataIso.refine((data) => data >= hojeEmGoias(), 'O prazo não pode ser anterior a hoje.')

export const esquemaCamposDiligencia = z.strictObject({
  objeto: z
    .string({ error: 'Descreva o objeto da diligência.' })
    .trim()
    .min(10, 'Descreva o objeto da diligência (ao menos 10 caracteres).')
    .max(2000),
  prazo,
})

export const esquemaCriarDiligencia = esquemaCamposDiligencia.extend({ chamamentoId: idDocumento, propostaId: idDocumento })

const alvo = { chamamentoId: idDocumento, propostaId: idDocumento, id: idDocumento }
export const esquemaResposta = z.string({ error: 'Registre a resposta.' }).trim().min(5, 'Registre a resposta (ao menos 5 caracteres).').max(4000)
export const esquemaConclusao = z.string({ error: 'Registre a conclusão.' }).trim().min(10, 'Registre a conclusão (ao menos 10 caracteres).').max(4000)

export const esquemaAlterarDiligencia = z.discriminatedUnion(
  'acao',
  [
    z.strictObject({ acao: z.literal('responder'), ...alvo, resposta: esquemaResposta }),
    z.strictObject({ acao: z.literal('encerrar'), ...alvo, conclusao: esquemaConclusao }),
  ],
  { error: 'Ação inválida. Use responder ou encerrar.' },
)

/** Diligência "em aberto" (impede a homologação): ainda não encerrada. */
export const STATUS_DILIGENCIA_EM_ABERTO = ['aberta', 'respondida'] as const
