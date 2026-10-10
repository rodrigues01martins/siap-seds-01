// Valor em reais (R$), guardado em centavos (inteiro), como os valores da D2.
// Digitação da direita para a esquerda: "123456" → 1.234,56. Controlado (valor/onMudar); com
// react-hook-form, use Controller.

import { Field, classeEntrada, type PropsCampoBase } from './Field'

const FORMATO = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function formatarCentavos(centavos: number | null | undefined): string {
  return centavos === null || centavos === undefined ? '' : FORMATO.format(centavos / 100)
}

/** Só os dígitos contam: "R$ 1.234,56" → 123456; vazio → null. */
export function centavosDoTexto(texto: string): number | null {
  const digitos = texto.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
  return digitos ? Number(digitos.slice(0, 15)) : null
}

export interface PropsCurrencyField extends PropsCampoBase {
  id?: string
  className?: string
  valor: number | null
  onMudar: (centavos: number | null) => void
  onBlur?: () => void
  name?: string
}

export function CurrencyField({ valor, onMudar, onBlur, name, rotulo, className, ...props }: PropsCurrencyField) {
  return (
    <Field rotulo={`${rotulo} (R$)`} className={className} {...props}>
      {(atributos) => (
        <div className="relative">
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-body-md text-text-secondary">
            R$
          </span>
          <input
            {...atributos}
            name={name}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={formatarCentavos(valor)}
            onChange={(evento) => onMudar(centavosDoTexto(evento.target.value))}
            onBlur={onBlur}
            className={classeEntrada(props, 'h-(--sds-input-height) pl-10 text-right tabular-nums')}
          />
        </div>
      )}
    </Field>
  )
}
