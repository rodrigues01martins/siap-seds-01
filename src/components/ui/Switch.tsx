// Chave liga/desliga (role="switch", aria-checked); Espaço e Enter alternam. Com react-hook-form, use Controller.

import { MensagensCampo, useIdsCampo } from './Field'
import { cx } from './cx'

export interface PropsSwitch {
  rotulo: string
  ligado: boolean
  onMudar: (ligado: boolean) => void
  ajuda?: string
  erro?: string
  desabilitado?: boolean
  id?: string
  className?: string
}

export function Switch({ rotulo, ligado, onMudar, ajuda, erro, desabilitado, id, className }: PropsSwitch) {
  const ids = useIdsCampo(id)
  const descricao = [ajuda && ids.ajuda, erro && ids.mensagem].filter(Boolean).join(' ') || undefined
  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-3">
        <span id={`${ids.id}-rotulo`} className="text-body-md text-text-primary">
          {rotulo}
        </span>
        <button
          type="button"
          role="switch"
          id={ids.id}
          aria-checked={ligado}
          aria-labelledby={`${ids.id}-rotulo`}
          aria-describedby={descricao}
          disabled={desabilitado}
          onClick={() => onMudar(!ligado)}
          className={cx(
            'relative h-6 w-11 shrink-0 rounded-badge transition-colors duration-fast ease-standard disabled:cursor-not-allowed disabled:opacity-60',
            ligado ? 'bg-action-primary' : 'bg-status-neutral',
          )}
        >
          <span
            aria-hidden="true"
            className={cx(
              'absolute top-0.5 size-5 rounded-badge bg-background-surface shadow-dropdown transition-[left] duration-fast ease-standard',
              ligado ? 'left-5.5' : 'left-0.5',
            )}
          />
        </button>
      </div>
      <MensagensCampo ids={ids} ajuda={ajuda} erro={erro} />
    </div>
  )
}
