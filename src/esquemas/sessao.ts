// Sessão da Comissão: data, chamamento, lote(s) em pauta, status (aberta | encerrada) e presentes por nome
// ({ nome, papel: presidente | membro }, exatamente um presidente). Abrir e alterar (presentes, foco,
// encerrar, resetar): admin e presidente. Usados pela /api e pelas telas de sessão.

import { PAPEIS_SESSAO } from '../domain/comissao.js'
import { dataIso, idDocumento, semRepeticao, z } from './base.js'

/** Nome comparado sem diferença de maiúsculas, acentos e espaços extras (nomes repetidos). */
export const chaveDoNome = (nome: string) =>
  nome.normalize('NFD').replace(/\p{M}/gu, '').trim().replace(/\s+/g, ' ').toLowerCase()

/** Quem está presente: só o nome e o papel (sem login, sem declaração de impedimento). */
export const esquemaPresente = z.strictObject({
  nome: z.string({ error: 'Informe o nome.' }).trim().min(1, 'Informe o nome.').max(120, 'Use no máximo 120 caracteres.'),
  papel: z.enum(PAPEIS_SESSAO, { error: 'Papel inválido: use presidente ou membro.' }),
})
export type Presente = z.output<typeof esquemaPresente>

/** Exatamente um presidente e nomes não repetidos. */
export const presentes = z
  .array(esquemaPresente, { error: 'Informe os presentes.' })
  .refine((lista) => lista.filter((p) => p.papel === 'presidente').length === 1, 'Informe exatamente um presidente.')
  .refine(semRepeticao((p: Presente) => chaveDoNome(p.nome)), 'Há nomes repetidos.')

/** Lote(s) em pauta: as propostas desses lotes são as analisadas na sessão. */
const lotes = z
  .array(z.string({ error: 'Informe o lote.' }).trim().min(1, 'Informe o lote.'), { error: 'Informe ao menos um lote.' })
  .min(1, 'Informe ao menos um lote.')
  .refine(semRepeticao(), 'Há lotes repetidos.')

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

export const esquemaAbrirSessao = z.strictObject({ chamamentoId: idDocumento, data: dataIso, lotes, presentes })

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
    z.strictObject({ acao: z.literal('foco'), ...alvo, foco: esquemaFoco.nullable() }),
    z.strictObject({ acao: z.literal('resetar'), ...alvo, justificativa: justificativaReset }),
  ],
  { error: 'Ação inválida. Use encerrar, presentes, foco ou resetar.' },
)

export type AlteracaoSessao = z.output<typeof esquemaAlterarSessao>
