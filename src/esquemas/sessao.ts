// Sessão da Comissão: abrir (presidente) e alterar — presentes, declarações, foco (presidente e
// relator) e encerrar (presidente). Usados pela /api e pela tela de sessão.

import { dataIso, idDocumento, semRepeticao, z } from './base.js'

export const esquemaDeclaracao = z
  .strictObject({
    uid: idDocumento,
    /** true = declara não haver impedimento para atuar na sessão. */
    semImpedimento: z.boolean({ error: 'Marque a declaração.' }),
    motivo: z.string().trim().max(500, 'Use no máximo 500 caracteres.').optional(),
  })
  .refine((d) => d.semImpedimento || (d.motivo?.length ?? 0) >= 5, {
    path: ['motivo'],
    message: 'Informe o motivo do impedimento.',
  })

const pauta = z
  .array(idDocumento)
  .min(1, 'Informe ao menos uma proposta na pauta.')
  .refine(semRepeticao(), 'Há propostas repetidas na pauta.')

const presentes = z.array(idDocumento).refine(semRepeticao(), 'Há membros repetidos.')

const declaracoes = z
  .array(esquemaDeclaracao)
  .refine(semRepeticao((d: { uid: string }) => d.uid), 'Há mais de uma declaração para o mesmo membro.')

/** O que o telão mostra (Etapa 5). */
export const TIPOS_FOCO = ['admissibilidade', 'subcriterio', 'd2', 'resumo'] as const
export type TipoFoco = (typeof TIPOS_FOCO)[number]

export const esquemaFoco = z
  .strictObject({
    tipo: z.enum(TIPOS_FOCO, { error: 'Tipo de foco inválido. Use admissibilidade, subcriterio, d2 ou resumo.' }),
    propostaId: idDocumento,
    subcriterio: z.string().trim().min(1, 'Informe o subcritério.').optional(),
  })
  .superRefine((foco, ctx) => {
    if (foco.tipo === 'subcriterio' && !foco.subcriterio) {
      ctx.addIssue({ code: 'custom', path: ['subcriterio'], message: 'Informe o subcritério.' })
    }
    if (foco.tipo !== 'subcriterio' && foco.subcriterio !== undefined) {
      ctx.addIssue({ code: 'custom', path: ['subcriterio'], message: 'Subcritério só se aplica ao foco do tipo subcritério.' })
    }
  })
export type Foco = z.output<typeof esquemaFoco>

export const esquemaAbrirSessao = z.strictObject({
  chamamentoId: idDocumento,
  data: dataIso,
  pauta,
  presentes: presentes.default([]),
  declaracoes: declaracoes.default([]),
})

const alvo = { chamamentoId: idDocumento, sessaoId: idDocumento }

/** Reset da sessão (presidente): motivo obrigatório, registrado na sessão, na auditoria e na ata. */
export const JUSTIFICATIVA_RESET_MINIMA = 20
export const PALAVRA_RESET = 'RESETAR'
const justificativaReset = z
  .string({ error: 'Informe a justificativa.' })
  .trim()
  .min(JUSTIFICATIVA_RESET_MINIMA, `Justifique com ao menos ${JUSTIFICATIVA_RESET_MINIMA} caracteres.`)
  .max(2000, 'Use no máximo 2.000 caracteres.')

/** Prévia do reset (GET ?simular=true). */
export const esquemaPreviaReset = z.strictObject({
  ...alvo,
  simular: z.literal('true', { error: 'Use simular=true para ver a prévia do reset.' }),
})

export const esquemaAlterarSessao = z.discriminatedUnion(
  'acao',
  [
    z.strictObject({ acao: z.literal('encerrar'), ...alvo }),
    z.strictObject({ acao: z.literal('presentes'), ...alvo, presentes }),
    z.strictObject({ acao: z.literal('declaracoes'), ...alvo, declaracoes }),
    z.strictObject({ acao: z.literal('foco'), ...alvo, foco: esquemaFoco.nullable() }),
    z.strictObject({ acao: z.literal('resetar'), ...alvo, justificativa: justificativaReset }),
  ],
  { error: 'Ação inválida. Use encerrar, presentes, declaracoes, foco ou resetar.' },
)

export type AlteracaoSessao = z.output<typeof esquemaAlterarSessao>
export type Declaracao = z.output<typeof esquemaDeclaracao>
