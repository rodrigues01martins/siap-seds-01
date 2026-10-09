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

export const esquemaFoco = z.strictObject({
  propostaId: idDocumento,
  subcriterio: z.string().trim().min(1, 'Informe o subcritério.'),
})

export const esquemaAbrirSessao = z.strictObject({
  chamamentoId: idDocumento,
  data: dataIso,
  pauta,
  presentes: presentes.default([]),
  declaracoes: declaracoes.default([]),
})

const alvo = { chamamentoId: idDocumento, sessaoId: idDocumento }

export const esquemaAlterarSessao = z.discriminatedUnion(
  'acao',
  [
    z.strictObject({ acao: z.literal('encerrar'), ...alvo }),
    z.strictObject({ acao: z.literal('presentes'), ...alvo, presentes }),
    z.strictObject({ acao: z.literal('declaracoes'), ...alvo, declaracoes }),
    z.strictObject({ acao: z.literal('foco'), ...alvo, foco: esquemaFoco.nullable() }),
  ],
  { error: 'Ação inválida. Use encerrar, presentes, declaracoes ou foco.' },
)

export type AlteracaoSessao = z.output<typeof esquemaAlterarSessao>
export type Declaracao = z.output<typeof esquemaDeclaracao>
