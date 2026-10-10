// Grupo de opções exclusivas: fieldset + legend (role radiogroup), radios nativos (setas do teclado).
// Com react-hook-form: {...register('campo')} vale para o grupo inteiro.

import { forwardRef, type InputHTMLAttributes } from 'react'
import { MensagensCampo, useIdsCampo, type PropsCampoBase } from './Field'

export interface OpcaoRadio {
  valor: string
  rotulo: string
  ajuda?: string
}

export type PropsRadioGroup = PropsCampoBase &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'disabled' | 'readOnly' | 'required' | 'value'> & {
    name: string
    opcoes: OpcaoRadio[]
    /** Valor marcado (modo controlado). */
    valor?: string
  }

export const RadioGroup = forwardRef<HTMLInputElement, PropsRadioGroup>(function RadioGroup(
  { rotulo, ajuda, erro, sucesso, obrigatorio, desabilitado, somenteLeitura, id, className, opcoes, valor, ...entrada },
  ref,
) {
  const ids = useIdsCampo(id)
  const descricao = [ajuda && ids.ajuda, (erro || sucesso) && ids.mensagem].filter(Boolean).join(' ') || undefined
  return (
    <fieldset
      role="radiogroup"
      aria-describedby={descricao}
      aria-invalid={erro ? true : undefined}
      aria-required={obrigatorio || undefined}
      disabled={desabilitado || somenteLeitura}
      className={className}
    >
      <legend className="mb-1 text-label-md text-text-primary">{rotulo}</legend>
      <div className="flex flex-col gap-2">
        {opcoes.map((opcao, i) => (
          <div key={opcao.valor} className="flex items-start gap-2">
            <input
              ref={ref}
              type="radio"
              id={`${ids.id}-${i}`}
              value={opcao.valor}
              {...(valor !== undefined ? { checked: valor === opcao.valor } : {})}
              {...entrada}
              className="mt-0.5 size-5 shrink-0 cursor-pointer accent-action-primary disabled:cursor-not-allowed"
            />
            <label htmlFor={`${ids.id}-${i}`} className="cursor-pointer text-body-md text-text-primary">
              {opcao.rotulo}
              {opcao.ajuda && <span className="block text-body-sm text-text-secondary">{opcao.ajuda}</span>}
            </label>
          </div>
        ))}
      </div>
      <MensagensCampo ids={ids} ajuda={ajuda} erro={erro} sucesso={sucesso} />
    </fieldset>
  )
})
