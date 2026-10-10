// Data (AAAA-MM-DD): campo de data nativo, com calendário e teclado do próprio navegador.

import { forwardRef } from 'react'
import { TextField, type PropsTextField } from './TextField'

export const DatePicker = forwardRef<HTMLInputElement, Omit<PropsTextField, 'type'>>(function DatePicker(props, ref) {
  return <TextField ref={ref} {...props} type="date" />
})
