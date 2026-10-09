// Validação dos dados de entrada com zod: erro → 400 { erro, campos } em português.

import { camposDoErro, type z } from '../../src/esquemas/base.js'
import { ErroApi, MENSAGENS } from './erros.js'

// Os esquemas básicos vivem em src/esquemas (compartilhados com os formulários do app).
export { algumCampoAlem, cnpj, dataIso, idDocumento, opcional } from '../../src/esquemas/base.js'

/** Converte problemas de regra de negócio (por campo) em 400. */
export function exigirSemProblemas(problemas: Record<string, string>): void {
  if (Object.keys(problemas).length > 0) throw new ErroApi(400, MENSAGENS.dadosInvalidos, problemas)
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
