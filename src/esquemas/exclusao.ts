// Exclusão livre (Simplificação 2/4): admin e presidente apagam chamamento, lote, OSC, proposta, sessão,
// experiência, documento e nível de subcritério, sem justificativa e sem identificador digitado.
// Esquemas da /api (DELETE e prévia GET ?simular=true) e o texto da prévia, usado na /api e no ConfirmDialog.

import { cnpj, idDocumento, z } from './base.js'

/** O que uma exclusão apaga, na ordem em que aparece na prévia. */
export const TIPOS_EXCLUIDOS = [
  'chamamento',
  'lote',
  'sessao',
  'osc',
  'proposta',
  'admissibilidade',
  'avaliacao',
  'experiencia',
  'documento',
  'resultadoD2',
  'desempate',
  'outro',
] as const
export type TipoExcluido = (typeof TIPOS_EXCLUIDOS)[number]
export type Contagem = Partial<Record<TipoExcluido, number>>

const ROTULOS: Record<TipoExcluido, readonly [string, string]> = {
  chamamento: ['chamamento', 'chamamentos'],
  lote: ['lote', 'lotes'],
  sessao: ['sessão', 'sessões'],
  osc: ['OSC', 'OSCs'],
  proposta: ['proposta', 'propostas'],
  admissibilidade: ['admissibilidade', 'admissibilidades'],
  avaliacao: ['avaliação', 'avaliações'],
  experiencia: ['experiência', 'experiências'],
  documento: ['documento', 'documentos'],
  resultadoD2: ['resultado da D2', 'resultados da D2'],
  desempate: ['decisão de desempate', 'decisões de desempate'],
  outro: ['outro registro', 'outros registros'],
}

export interface PreviaExclusao {
  /** Quantidade por tipo, na ordem de TIPOS_EXCLUIDOS, só com o que será apagado. */
  itens: Contagem
  total: number
  /** Ex.: "1 proposta, 28 avaliações, 4 experiências". */
  resumo: string
}

const ordenada = (contagem: Contagem): [TipoExcluido, number][] =>
  TIPOS_EXCLUIDOS.flatMap((tipo) => ((contagem[tipo] ?? 0) > 0 ? [[tipo, contagem[tipo]!] as [TipoExcluido, number]] : []))

export function resumoDaContagem(contagem: Contagem): string {
  return ordenada(contagem)
    .map(([tipo, n]) => `${n} ${ROTULOS[tipo][n === 1 ? 0 : 1]}`)
    .join(', ')
}

export function previaDe(contagem: Contagem): PreviaExclusao {
  const itens = Object.fromEntries(ordenada(contagem)) as Contagem
  const total = Object.values(itens).reduce((soma, n) => soma + n, 0)
  return { itens, total, resumo: resumoDaContagem(contagem) }
}

// ---------- Esquemas (corpo do DELETE; a prévia usa os mesmos campos + simular=true) ----------

const simular = { simular: z.literal('true', { error: 'Use simular=true para ver a prévia da exclusão.' }) }
const texto = (mensagem: string) => z.string({ error: mensagem }).trim().min(1, mensagem)
/** Índice do documento na lista da experiência (na URL da prévia chega como texto). */
const indice = z.coerce.number({ error: 'Informe o documento.' }).int('Documento inválido.').min(0, 'Documento inválido.')

const chamamento = { id: idDocumento, lote: texto('Informe o lote.').optional() }
const osc = { cnpj }
const proposta = { chamamentoId: idDocumento, propostaId: idDocumento }
const sessao = { chamamentoId: idDocumento, sessaoId: idDocumento }
const experiencia = { ...proposta, id: idDocumento, documento: indice.optional() }
const nivel = { ...proposta, codigo: texto('Informe o subcritério.') }

/** Chamamento inteiro ou, com `lote`, só o lote. */
export const esquemaExcluirChamamento = z.strictObject(chamamento)
export const esquemaPreviaChamamento = z.strictObject({ ...chamamento, ...simular })
export const esquemaExcluirOsc = z.strictObject(osc)
export const esquemaPreviaOsc = z.strictObject({ ...osc, ...simular })
export const esquemaExcluirProposta = z.strictObject(proposta)
export const esquemaPreviaProposta = z.strictObject({ ...proposta, ...simular })
export const esquemaExcluirSessao = z.strictObject(sessao)
export const esquemaPreviaSessao = z.strictObject({ ...sessao, ...simular })
/** Experiência inteira ou, com `documento` (índice), só aquele documento. */
export const esquemaExcluirExperiencia = z.strictObject(experiencia)
export const esquemaPreviaExperiencia = z.strictObject({ ...experiencia, ...simular })
export const esquemaExcluirNivel = z.strictObject(nivel)
export const esquemaPreviaNivel = z.strictObject({ ...nivel, ...simular })
