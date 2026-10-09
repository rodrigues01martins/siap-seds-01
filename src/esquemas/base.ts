// Esquemas zod compartilhados entre a /api (validação no servidor) e os formulários do app.
// Código puro: só zod e src/domain. Imports com .js porque também rodam nas funções da Vercel.

import { z } from 'zod'
import { cnpjValido, normalizarCnpj } from '../domain/cnpj.js'
import { paraDia } from '../domain/intervalos.js'

z.config(z.locales.ptBR())

export { z }

/** Identificador de documento do Firestore: sem "/", para não escapar da coleção. */
export const idDocumento = z
  .string({ error: 'Informe o identificador.' })
  .regex(/^[A-Za-z0-9_-]{1,128}$/, 'Identificador inválido.')

export const cnpj = z
  .string({ error: 'Informe o CNPJ.' })
  .refine(cnpjValido, 'CNPJ inválido.')
  .transform(normalizarCnpj)

/** Data AAAA-MM-DD existente no calendário. */
export const dataIso = z.string({ error: 'Informe a data (AAAA-MM-DD).' }).refine((valor) => {
  try {
    paraDia(valor)
    return true
  } catch {
    return false
  }
}, 'Data inválida (use AAAA-MM-DD).')

/** Campo opcional em que texto vazio (formulário em branco) ou null equivale a ausente. */
export function opcional<T extends z.ZodType>(esquema: T) {
  return z.preprocess((valor) => (valor === '' || valor === null ? undefined : valor), esquema.optional())
}

/** Exige ao menos um campo além das chaves de identificação (para edições). */
export function algumCampoAlem(chaves: string[]) {
  return (dados: Record<string, unknown>) =>
    Object.entries(dados).some(([chave, valor]) => !chaves.includes(chave) && valor !== undefined)
}

/** Lista sem repetições (comparando por `chave`). */
export function semRepeticao<T>(chave: (item: T) => unknown = (item) => item) {
  return (lista: T[]) => new Set(lista.map(chave)).size === lista.length
}

/** Raiz do objeto (ex.: "Informe ao menos um campo para alterar."). */
export const CAMPO_RAIZ = '_'

/**
 * Erro do zod → { "caminho.do.campo": mensagem }, a primeira mensagem de cada campo.
 * Mesmo formato do 400 da /api ({ erro, campos }), para o formulário tratar os dois igual.
 */
export function camposDoErro(erro: z.ZodError): Record<string, string> {
  const campos: Record<string, string> = {}
  for (const problema of erro.issues) {
    if (problema.code === 'unrecognized_keys') {
      for (const chave of problema.keys) campos[[...problema.path, chave].join('.')] ??= 'Campo não permitido.'
      continue
    }
    campos[problema.path.length > 0 ? problema.path.join('.') : CAMPO_RAIZ] ??= problema.message
  }
  return campos
}

/** Data de hoje (AAAA-MM-DD) no fuso de Goiânia, para prazos. */
export function hojeEmGoias(agora: Date = new Date()): string {
  return agora.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}
