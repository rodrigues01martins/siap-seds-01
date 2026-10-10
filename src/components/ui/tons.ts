// Tons de status (§7): cor da aplicação, não institucional. Ícone sempre acompanha o texto.

import { CircleCheck, CircleX, Info, TriangleAlert, type LucideIcon } from 'lucide-react'

export type Tom = 'success' | 'info' | 'warning' | 'error'

export const ICONE_TOM: Record<Tom, LucideIcon> = {
  success: CircleCheck,
  info: Info,
  warning: TriangleAlert,
  error: CircleX,
}

/** Classes de fundo, texto e borda de cada tom (tokens status-*). */
export const CLASSES_TOM: Record<Tom, string> = {
  success: 'bg-status-success-surface text-status-success-text border-status-success',
  info: 'bg-status-info-surface text-status-info-text border-status-info',
  warning: 'bg-status-warning-surface text-status-warning-text border-status-warning',
  error: 'bg-status-error-surface text-status-error-text border-status-error',
}
