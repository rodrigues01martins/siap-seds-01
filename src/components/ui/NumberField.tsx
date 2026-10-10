// Número: campo numérico nativo (setas do teclado, min, max e step).

import { forwardRef } from 'react'
import { TextField, type PropsTextField } from './TextField'

export const NumberField = forwardRef<HTMLInputElement, Omit<PropsTextField, 'type'>>(function NumberField(props, ref) {
  return <TextField ref={ref} inputMode="decimal" {...props} type="number" />
})
