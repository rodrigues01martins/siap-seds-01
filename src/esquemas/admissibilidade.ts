// Admissibilidade (Anexo III, item 28): esquema da /api e do formulário da tela.
// As regras (requisitos, 6 PAs, páginas, motivação) ficam em src/domain/admissibilidade.ts.

import { problemasDaAdmissibilidade } from '../domain/admissibilidade.js'
import { idDocumento, opcional, z } from './base.js'

const pagina = z.number({ error: 'Informe um número.' }).nullable()

export const esquemaCamposAdmissibilidade = z.strictObject({
  requisitos: z.record(z.string(), z.boolean()),
  irregularidadesFormais: z.array(z.string()).default([]),
  observacaoIrregularidades: opcional(z.string().trim().max(1000, 'Use no máximo 1.000 caracteres.')),
  planos: z.array(
    z.strictObject({
      codigo: z.string(),
      ausente: z.boolean(),
      paginaInicial: pagina,
      paginaFinal: pagina,
    }),
  ),
  resultado: z.enum(['admitida', 'nao_admitida'], { error: 'Escolha: admitida ou não admitida.' }),
  motivacao: opcional(z.string().trim().max(2000, 'Use no máximo 2.000 caracteres.')),
})
export type CamposAdmissibilidade = z.output<typeof esquemaCamposAdmissibilidade>

export const esquemaAdmissibilidade = esquemaCamposAdmissibilidade.extend({
  chamamentoId: idDocumento,
  propostaId: idDocumento,
})

/** Campos + regras do domínio, para validar no navegador antes de enviar. */
export const esquemaCamposAdmissibilidadeComRegras = esquemaCamposAdmissibilidade.superRefine((dados, ctx) => {
  for (const [campo, message] of Object.entries(problemasDaAdmissibilidade(dados))) {
    ctx.addIssue({ code: 'custom', path: campo.split('.'), message })
  }
})
