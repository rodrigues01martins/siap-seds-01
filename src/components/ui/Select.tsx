// Lista de seleção nativa (teclado e leitor de tela do próprio navegador).

import { forwardRef, type SelectHTMLAttributes } from 'react'
import { Field, classeEntrada, type PropsCampoBase } from './Field'

export interface OpcaoSelect {
  valor: string
  rotulo: string
}

export type PropsSelect = PropsCampoBase &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, 'disabled' | 'required'> & {
    opcoes: OpcaoSelect[]
    /** Texto da opção vazia (valor ""), ex.: "Selecione…". */
    vazio?: string
  }

export const Select = forwardRef<HTMLSelectElement, PropsSelect>(function Select(
  { rotulo, ajuda, erro, sucesso, obrigatorio, desabilitado, somenteLeitura, id, className, opcoes, vazio, ...entrada },
  ref,
) {
  return (
    <Field id={id} rotulo={rotulo} ajuda={ajuda} erro={erro} sucesso={sucesso} obrigatorio={obrigatorio} desabilitado={desabilitado || somenteLeitura} className={className}>
      {({ readOnly: _r, ...atributos }) => (
        <select ref={ref} {...entrada} {...atributos} className={classeEntrada({ erro, sucesso }, 'h-(--sds-input-height)')}>
          {vazio !== undefined && <option value="">{vazio}</option>}
          {opcoes.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.rotulo}
            </option>
          ))}
        </select>
      )}
    </Field>
  )
})
