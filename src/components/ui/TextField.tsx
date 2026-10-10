// Campo de texto (§13). Compatível com react-hook-form: {...register('campo')} e erro={errors.campo?.message}.

import { forwardRef, type InputHTMLAttributes } from 'react'
import { Field, classeEntrada, type PropsCampoBase } from './Field'

export type PropsTextField = PropsCampoBase & Omit<InputHTMLAttributes<HTMLInputElement>, 'disabled' | 'readOnly' | 'required' | 'size'>

export const TextField = forwardRef<HTMLInputElement, PropsTextField>(function TextField(
  { rotulo, ajuda, erro, sucesso, obrigatorio, desabilitado, somenteLeitura, id, className, type = 'text', ...entrada },
  ref,
) {
  return (
    <Field id={id} rotulo={rotulo} ajuda={ajuda} erro={erro} sucesso={sucesso} obrigatorio={obrigatorio} desabilitado={desabilitado} somenteLeitura={somenteLeitura} className={className}>
      {(atributos) => <input ref={ref} type={type} {...entrada} {...atributos} className={classeEntrada({ erro, sucesso }, 'h-(--sds-input-height)')} />}
    </Field>
  )
})
