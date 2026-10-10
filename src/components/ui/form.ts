// Integração react-hook-form + zod: o mesmo esquema da /api valida o formulário no navegador e os erros
// caem nos campos ("lotes.0.codigo"), no formato que a /api já usa.

import type { FieldErrors, FieldValues, Resolver } from 'react-hook-form'
import { CAMPO_RAIZ, camposDoErro, type z } from '../../esquemas/base'

/** { "a.0.b": msg } → { a: { 0: { b: { message } } } }, o formato de erros do react-hook-form. */
export function paraErros(campos: Record<string, string>): FieldErrors {
  const erros: Record<string, unknown> = {}
  for (const [caminho, message] of Object.entries(campos)) {
    const partes = caminho === CAMPO_RAIZ ? ['root'] : caminho.split('.')
    let alvo = erros
    partes.slice(0, -1).forEach((parte) => {
      alvo[parte] ??= {}
      alvo = alvo[parte] as Record<string, unknown>
    })
    alvo[partes.at(-1)!] = { type: 'validacao', message }
  }
  return erros as FieldErrors
}

/** Mensagem de erro de um campo ("lotes.0.codigo") dentro de FieldErrors. */
export function mensagemDoCampo(erros: FieldErrors, nome: string): string | undefined {
  const erro = nome.split('.').reduce<unknown>((atual, parte) => (atual as Record<string, unknown> | undefined)?.[parte], erros)
  return (erro as { message?: string } | undefined)?.message
}

export function resolverZod<E extends z.ZodType<FieldValues>>(esquema: E): Resolver<z.input<E> & FieldValues, unknown, z.output<E>> {
  return async (valores) => {
    const resultado = esquema.safeParse(valores)
    if (resultado.success) return { values: resultado.data, errors: {} }
    return { values: {}, errors: paraErros(camposDoErro(resultado.error)) as FieldErrors<z.input<E> & FieldValues> }
  }
}
