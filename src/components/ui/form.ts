// Integração react-hook-form + zod: o mesmo esquema da /api valida o formulário no navegador e os erros
// caem nos campos ("lotes.0.codigo"), no formato que Formulario e a /api já usam.

import type { FieldErrors, FieldValues, Resolver } from 'react-hook-form'
import { paraErros } from '../../componentes/Formulario'
import { camposDoErro, type z } from '../../esquemas/base'

export function resolverZod<E extends z.ZodType<FieldValues>>(esquema: E): Resolver<z.input<E> & FieldValues, unknown, z.output<E>> {
  return async (valores) => {
    const resultado = esquema.safeParse(valores)
    if (resultado.success) return { values: resultado.data, errors: {} }
    return { values: {}, errors: paraErros(camposDoErro(resultado.error)) as FieldErrors<z.input<E> & FieldValues> }
  }
}
