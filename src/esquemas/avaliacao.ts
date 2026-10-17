// C2 — registro do nível de um subcritério da D1: esquema da /api e do formulário da tela.
// As regras de negócio (matriz, escala, página de corte, justificativa mínima) ficam em
// src/domain/avaliacao.ts; esquemaRegistroComRegras as aplica no navegador antes de enviar.
// Sem decisão (unanimidade/maioria) nem voto divergente (Simplificação 2/4).
// Salvamento automático (Simplificação 3/4): esquemaSalvarAvaliacao aceita rascunhos (nível, justificativa ou
// páginas, mesclados pela /api ao que já está gravado); o mínimo da justificativa é conferido ao concluir.

import { JUSTIFICATIVA_MINIMA_PADRAO, planoDoSubcriterio, problemasDoRegistro } from '../domain/avaliacao.js'
import { MATRIZ_2026 } from '../domain/matriz/index.js'
import { idDocumento, z } from './base.js'

const campos = {
  codigo: z.string({ error: 'Informe o subcritério.' }).trim().min(1, 'Informe o subcritério.'),
  nivel: z.number({ error: 'Escolha o nível.' }).int('O nível deve ser um inteiro de 0 a 4.'),
  justificativa: z.string({ error: 'Informe a justificativa.' }).trim(),
  paginas: z.array(z.number()).default([]),
}

/** O que a Comissão decide sobre o subcritério (o painel da tela envia isto). */
export const esquemaCamposRegistro = z.strictObject(campos)
export type CamposRegistro = z.output<typeof esquemaCamposRegistro>

export const esquemaRegistroAvaliacao = esquemaCamposRegistro.extend({
  chamamentoId: idDocumento,
  propostaId: idDocumento,
  sessaoId: idDocumento,
})

/**
 * Regras do domínio para o registro (subcritério, escala, páginas, justificativa mínima). O domínio, que não
 * muda, ainda recebe a decisão da Comissão: "unanimidade" é neutra (só a maioria admite voto divergente).
 */
export function problemasDoNivel(registro: CamposRegistro, opcoes: { justificativaMinima?: number } = {}): Record<string, string> {
  return problemasDoRegistro({ ...registro, decisao: 'unanimidade' }, opcoes)
}

/** Campos do registro + as regras do domínio (o mínimo da justificativa vem do chamamento). */
export function esquemaCamposComRegras(justificativaMinima?: number) {
  return esquemaCamposRegistro.superRefine((registro, ctx) => {
    for (const [campo, message] of Object.entries(problemasDoNivel(registro, { justificativaMinima }))) {
      ctx.addIssue({ code: 'custom', path: [campo], message })
    }
  })
}

const MENSAGEM_NIVEL = 'O nível deve ser um inteiro de 0 a 4.'

/** PUT /api/avaliacao (salvamento automático): o subcritério e ao menos um dos campos, mesclados ao gravado. */
export const esquemaSalvarAvaliacao = z.strictObject({
  chamamentoId: idDocumento,
  propostaId: idDocumento,
  sessaoId: idDocumento,
  codigo: campos.codigo,
  /** null desmarca o nível (o subcritério volta a pendente). */
  nivel: z.number({ error: MENSAGEM_NIVEL }).nullable().optional(),
  justificativa: z.string({ error: 'A justificativa deve ser um texto.' }).max(5000, 'Use no máximo 5.000 caracteres.').optional(),
  paginas: z.array(z.number({ error: 'As páginas devem ser números inteiros a partir de 1.' })).max(200).optional(),
})
export type SalvarAvaliacao = z.output<typeof esquemaSalvarAvaliacao>

export interface RascunhoAvaliacao {
  codigo: string
  nivel?: number | null
  justificativa?: string
  paginas?: number[]
}

/** O que nunca vale num rascunho: subcritério fora da matriz, nível fora da escala, página fora do PA. */
export function problemasDoRascunho(rascunho: RascunhoAvaliacao): Record<string, string> {
  const plano = planoDoSubcriterio(rascunho.codigo)
  if (!plano) return { codigo: 'Subcritério inexistente na matriz.' }
  const problemas: Record<string, string> = {}
  const { escala } = MATRIZ_2026.dimensao1
  const { nivel, paginas } = rascunho
  if (nivel != null && (!Number.isInteger(nivel) || nivel < escala[0]!.nivel || nivel > escala.at(-1)!.nivel)) {
    problemas.nivel = MENSAGEM_NIVEL
  }
  if (paginas?.some((p) => !Number.isInteger(p) || p < 1)) {
    problemas.paginas = 'As páginas devem ser números inteiros a partir de 1.'
  } else {
    const acima = paginas?.find((p) => p > plano.limitePaginas)
    if (acima !== undefined) problemas.paginas = `Página ${acima} acima do limite de ${plano.limitePaginas} páginas do ${plano.codigo}.`
  }
  return problemas
}

/** O que falta no subcritério para concluir: 'nível' e/ou 'justificativa' (com o mínimo do chamamento). */
export function pendenciasDoRegistro(
  registro: { nivel?: number | null; justificativa?: string } | undefined,
  justificativaMinima = JUSTIFICATIVA_MINIMA_PADRAO,
): ('nível' | 'justificativa')[] {
  const pendencias: ('nível' | 'justificativa')[] = []
  if (!Number.isInteger(registro?.nivel)) pendencias.push('nível')
  if ((registro?.justificativa?.trim().length ?? 0) < justificativaMinima) pendencias.push('justificativa')
  return pendencias
}
