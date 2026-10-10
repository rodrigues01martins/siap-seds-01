// Área de texto com contador de caracteres (mínimo e/ou máximo), ex.: justificativa da avaliação.

import { forwardRef, useState, type ChangeEvent, type TextareaHTMLAttributes } from 'react'
import { Field, classeEntrada, type PropsCampoBase } from './Field'

export type PropsTextArea = PropsCampoBase &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'disabled' | 'readOnly' | 'required' | 'maxLength'> & {
    minimo?: number
    maximo?: number
  }

export function textoContador(tamanho: number, minimo?: number, maximo?: number): string {
  const limites = [minimo !== undefined && `mín. ${minimo}`, maximo !== undefined && `máx. ${maximo}`].filter(Boolean).join(' · ')
  return limites ? `${tamanho} / ${limites}` : `${tamanho} caracteres`
}

export const TextArea = forwardRef<HTMLTextAreaElement, PropsTextArea>(function TextArea(
  { rotulo, ajuda, erro, sucesso, obrigatorio, desabilitado, somenteLeitura, id, className, minimo, maximo, rows = 4, onChange, ...entrada },
  ref,
) {
  const inicial = String(entrada.value ?? entrada.defaultValue ?? '').length
  const [tamanho, setTamanho] = useState(inicial)
  const atual = entrada.value !== undefined ? String(entrada.value).length : tamanho
  return (
    <Field
      id={id}
      rotulo={rotulo}
      ajuda={ajuda}
      erro={erro}
      sucesso={sucesso}
      obrigatorio={obrigatorio}
      desabilitado={desabilitado}
      somenteLeitura={somenteLeitura}
      className={className}
      extra={textoContador(atual, minimo, maximo)}
    >
      {(atributos) => (
        <textarea
          ref={ref}
          rows={rows}
          maxLength={maximo}
          {...entrada}
          {...atributos}
          onChange={(evento: ChangeEvent<HTMLTextAreaElement>) => {
            setTamanho(evento.target.value.length)
            onChange?.(evento)
          }}
          className={classeEntrada({ erro, sucesso }, 'py-2')}
        />
      )}
    </Field>
  )
})
