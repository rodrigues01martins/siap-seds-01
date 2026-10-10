// Abas (padrão WAI-ARIA): tablist com rótulo, só a aba ativa no Tab (roving tabindex), setas trocam e
// ativam a aba (circulando), Home/End vão às pontas. Controlado (ativa/onMudar) ou não.

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { cx } from './cx'

export interface Aba {
  id: string
  rotulo: string
  conteudo: ReactNode
}

export function Tabs({ rotulo, abas, ativa, onMudar }: { rotulo: string; abas: Aba[]; ativa?: string; onMudar?: (id: string) => void }) {
  const base = useId()
  const [interna, setInterna] = useState(abas[0]?.id)
  const atual = ativa ?? interna
  const botoes = useRef<(HTMLButtonElement | null)[]>([])

  const ir = (indice: number) => {
    const alvo = abas[(indice + abas.length) % abas.length]!
    setInterna(alvo.id)
    onMudar?.(alvo.id)
    botoes.current[(indice + abas.length) % abas.length]?.focus()
  }

  const aoTeclar = (evento: KeyboardEvent, i: number) => {
    const destino = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: abas.length - 1 }[evento.key]
    if (destino === undefined) return
    evento.preventDefault()
    ir(destino)
  }

  const painel = abas.find((a) => a.id === atual)
  return (
    <div>
      <div role="tablist" aria-label={rotulo} className="flex gap-1 overflow-x-auto border-b border-border-default">
        {abas.map((aba, i) => {
          const selecionada = aba.id === atual
          return (
            <button
              key={aba.id}
              ref={(el) => {
                botoes.current[i] = el
              }}
              type="button"
              role="tab"
              id={`${base}-aba-${aba.id}`}
              aria-selected={selecionada}
              aria-controls={`${base}-painel-${aba.id}`}
              tabIndex={selecionada ? 0 : -1}
              onClick={() => ir(i)}
              onKeyDown={(e) => aoTeclar(e, i)}
              className={cx(
                '-mb-px h-12 border-b-2 px-4 text-label-md whitespace-nowrap transition-colors duration-fast ease-standard',
                selecionada ? 'border-action-primary text-text-link' : 'border-transparent text-text-secondary hover:text-text-primary',
              )}
            >
              {aba.rotulo}
            </button>
          )
        })}
      </div>
      {painel && (
        <div role="tabpanel" id={`${base}-painel-${painel.id}`} aria-labelledby={`${base}-aba-${painel.id}`} tabIndex={0} className="py-4">
          {painel.conteudo}
        </div>
      )}
    </div>
  )
}
