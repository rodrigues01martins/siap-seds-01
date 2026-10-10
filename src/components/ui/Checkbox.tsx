// Caixa de seleção nativa (Espaço marca), com a cor de ação do DS e mensagem de erro com ícone.

import { forwardRef, type InputHTMLAttributes } from 'react'
import { MensagensCampo, atributosEntrada, useIdsCampo, type PropsCampoBase } from './Field'
import { cx } from './cx'

export type PropsCheckbox = PropsCampoBase & Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'disabled' | 'readOnly' | 'required'>

export const Checkbox = forwardRef<HTMLInputElement, PropsCheckbox>(function Checkbox(
  { rotulo, ajuda, erro, sucesso, obrigatorio, desabilitado, somenteLeitura, id, className, ...entrada },
  ref,
) {
  const ids = useIdsCampo(id)
  const { readOnly: _r, ...atributos } = atributosEntrada(ids, { ajuda, erro, sucesso, obrigatorio, desabilitado: desabilitado || somenteLeitura })
  return (
    <div className={className}>
      <div className="flex items-start gap-2">
        <input
          ref={ref}
          type="checkbox"
          {...entrada}
          {...atributos}
          className={cx('mt-0.5 size-5 shrink-0 cursor-pointer accent-action-primary disabled:cursor-not-allowed', erro && 'outline outline-1 outline-input-border-error')}
        />
        <label htmlFor={ids.id} className="cursor-pointer text-body-md text-text-primary">
          {rotulo}
        </label>
      </div>
      <MensagensCampo ids={ids} ajuda={ajuda} erro={erro} sucesso={sucesso} />
    </div>
  )
})
