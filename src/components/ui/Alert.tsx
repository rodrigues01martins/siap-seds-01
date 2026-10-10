// Alerta (§13): [ícone] título, mensagem e ação opcional. Erro e atenção usam role="alert" (anunciados
// na hora); sucesso e informação, role="status".

import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cx } from './cx'
import { Icone } from './Icone'
import { CLASSES_TOM, ICONE_TOM, type Tom } from './tons'

export interface PropsAlert {
  tom: Tom
  titulo: string
  children?: ReactNode
  acao?: ReactNode
  onFechar?: () => void
  className?: string
  /** Nome acessível do alerta (aria-label), quando o título não basta para identificá-lo. */
  rotulo?: string
  /** Papel ARIA: por padrão alert (erro, atenção) ou status (sucesso, informação). Aviso permanente de
   *  atenção que não deve interromper o leitor de tela ao abrir a página usa "status". */
  papel?: 'alert' | 'status'
}

export function Alert({ tom, titulo, children, acao, onFechar, className, rotulo, papel }: PropsAlert) {
  return (
    <div
      role={papel ?? (tom === 'error' || tom === 'warning' ? 'alert' : 'status')}
      aria-label={rotulo}
      className={cx('flex gap-3 rounded-input border-l-4 p-4', CLASSES_TOM[tom], className)}
    >
      <Icone icone={ICONE_TOM[tom]} tamanho={20} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-label-md">{titulo}</p>
        {children && <div className="mt-1 text-body-sm text-text-primary">{children}</div>}
        {acao && <div className="mt-3">{acao}</div>}
      </div>
      {onFechar && (
        <button type="button" onClick={onFechar} aria-label="Fechar aviso" className="h-8 w-8 shrink-0 rounded-button hover:bg-action-subtle">
          <Icone icone={X} tamanho={16} className="mx-auto" />
        </button>
      )}
    </div>
  )
}
