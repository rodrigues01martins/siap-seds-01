// CNPJ (numérico ou alfanumérico, IN RFB 2.229/2024): máscara ao digitar e validação de src/domain/cnpj.
// Com react-hook-form, o valor do formulário já sai mascarado; o esquema zod (cnpj) normaliza e valida.

import { forwardRef, useState, type ChangeEvent, type FocusEvent } from 'react'
import { cnpjValido, mascararCnpj, normalizarCnpj } from '../../domain/cnpj'
import { TextField, type PropsTextField } from './TextField'

export const CNPJField = forwardRef<HTMLInputElement, Omit<PropsTextField, 'type' | 'maxLength'>>(function CNPJField(
  { onChange, onBlur, erro, placeholder = '00.000.000/0000-00', ...props },
  ref,
) {
  const [invalido, setInvalido] = useState(false)
  return (
    <TextField
      ref={ref}
      {...props}
      placeholder={placeholder}
      autoComplete="off"
      maxLength={18}
      erro={erro ?? (invalido ? 'CNPJ inválido.' : undefined)}
      onChange={(evento: ChangeEvent<HTMLInputElement>) => {
        evento.target.value = mascararCnpj(evento.target.value)
        setInvalido(false)
        onChange?.(evento)
      }}
      onBlur={(evento: FocusEvent<HTMLInputElement>) => {
        const valor = normalizarCnpj(evento.target.value)
        setInvalido(valor.length === 14 && !cnpjValido(valor))
        onBlur?.(evento)
      }}
    />
  )
})
