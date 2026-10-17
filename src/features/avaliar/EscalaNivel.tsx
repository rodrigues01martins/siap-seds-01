// Escala 0–4 em botões lado a lado (segmented control, padrão WAI-ARIA radiogroup): só o nível escolhido (ou o 0)
// entra no Tab; setas trocam e escolhem; com o foco no grupo, as teclas 0–4 escolhem direto. Cada clique grava na
// hora (salvamento automático); o descritor do nível escolhido aparece logo abaixo (quem usa o componente mostra).

import { useRef, type KeyboardEvent } from 'react'
import { cx } from '../../components/ui/cx'
import { MATRIZ_2026 } from '../../domain/matriz'

const NIVEIS = MATRIZ_2026.dimensao1.escala.map((e) => e.nivel)

interface Props {
  /** Nome do grupo para o leitor de tela (ex.: "Nível do 1.1"). */
  rotulo: string
  valor: number | null
  onEscolher: (nivel: number) => void
  desabilitado?: boolean
  /** Id do texto que descreve o nível escolhido (descritor). */
  descricao?: string
}

export function EscalaNivel({ rotulo, valor, onEscolher, desabilitado, descricao }: Props) {
  const botoes = useRef<(HTMLButtonElement | null)[]>([])
  const focavel = valor ?? NIVEIS[0]!

  function escolher(nivel: number) {
    botoes.current[NIVEIS.indexOf(nivel)]?.focus()
    if (nivel !== valor) onEscolher(nivel)
  }

  function aoTeclar(evento: KeyboardEvent) {
    if (desabilitado) return
    const atual = NIVEIS.indexOf(valor ?? NIVEIS[0]!)
    let destino: number | undefined
    if (/^[0-9]$/.test(evento.key) && NIVEIS.includes(Number(evento.key))) destino = Number(evento.key)
    else if (evento.key === 'ArrowRight' || evento.key === 'ArrowUp') destino = NIVEIS[Math.min(atual + 1, NIVEIS.length - 1)]
    else if (evento.key === 'ArrowLeft' || evento.key === 'ArrowDown') destino = NIVEIS[Math.max(atual - 1, 0)]
    else if (evento.key === 'Home') destino = NIVEIS[0]
    else if (evento.key === 'End') destino = NIVEIS.at(-1)
    if (destino === undefined) return
    evento.preventDefault()
    escolher(destino)
  }

  return (
    <div role="radiogroup" aria-label={rotulo} aria-describedby={descricao} onKeyDown={aoTeclar} className="inline-flex overflow-hidden rounded-button border border-border-input">
      {NIVEIS.map((nivel, i) => {
        const marcado = nivel === valor
        return (
          <button
            key={nivel}
            ref={(el) => {
              botoes.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={marcado}
            aria-label={`Nível ${nivel}`}
            tabIndex={nivel === focavel ? 0 : -1}
            disabled={desabilitado}
            onClick={() => escolher(nivel)}
            className={cx(
              'h-(--sds-button-height-md) min-w-11 border-l border-border-input px-3 text-label-md tabular-nums first:border-l-0',
              'transition-colors duration-fast ease-standard disabled:cursor-not-allowed disabled:opacity-60',
              marcado ? 'bg-action-primary text-text-inverse' : 'bg-input-bg text-text-primary hover:bg-action-subtle',
            )}
          >
            {nivel}
          </button>
        )
      })}
    </div>
  )
}
