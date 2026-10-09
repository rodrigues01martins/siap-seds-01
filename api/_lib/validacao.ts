// Validação dos dados de entrada com zod: erro → 400 { erro, campos } em português.

import { z } from 'zod'
import { cnpjValido, normalizarCnpj } from '../../src/domain/cnpj.js'
import { paraDia } from '../../src/domain/intervalos.js'
import { ErroApi, MENSAGENS } from './erros.js'

z.config(z.locales.ptBR())

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

/** Converte problemas de regra de negócio (por campo) em 400. */
export function exigirSemProblemas(problemas: Record<string, string>): void {
  if (Object.keys(problemas).length > 0) throw new ErroApi(400, MENSAGENS.dadosInvalidos, problemas)
}

/** Exige ao menos um campo além das chaves de identificação (para edições). */
export function algumCampoAlem(chaves: string[]) {
  return (dados: Record<string, unknown>) =>
    Object.entries(dados).some(([chave, valor]) => !chaves.includes(chave) && valor !== undefined)
}

function camposDoErro(erro: z.ZodError): Record<string, string> {
  const campos: Record<string, string> = {}
  for (const problema of erro.issues) {
    if (problema.code === 'unrecognized_keys') {
      for (const chave of problema.keys) campos[[...problema.path, chave].join('.')] ??= 'Campo não permitido.'
      continue
    }
    campos[problema.path.length > 0 ? problema.path.join('.') : '_'] ??= problema.message
  }
  return campos
}

export async function lerCorpo<T extends z.ZodType>(requisicao: Request, esquema: T): Promise<z.output<T>> {
  let dados: unknown
  try {
    dados = await requisicao.json()
  } catch {
    throw new ErroApi(400, MENSAGENS.jsonInvalido)
  }
  const resultado = esquema.safeParse(dados)
  if (!resultado.success) throw new ErroApi(400, MENSAGENS.dadosInvalidos, camposDoErro(resultado.error))
  return resultado.data
}
