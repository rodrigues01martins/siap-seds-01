// Foco preso em diálogos e painéis modais: ao abrir, o foco vai para [data-autofocus] ou o primeiro campo do
// conteúdo; Tab e Shift+Tab circulam dentro; Esc fecha; ao fechar, o foco volta para quem abriu.

import { useEffect, useRef, type KeyboardEvent, type RefObject } from 'react'

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const focaveis = (raiz: HTMLElement, seletor = '') => [...raiz.querySelectorAll<HTMLElement>(`${seletor} :is(${FOCAVEIS})`.trim())]

export function useFocoPreso(aberto: boolean, ref: RefObject<HTMLElement | null>, onFechar: () => void) {
  const anterior = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!aberto) return
    anterior.current = document.activeElement as HTMLElement | null
    const raiz = ref.current
    if (raiz) {
      const inicial =
        raiz.querySelector<HTMLElement>('[data-autofocus]') ?? focaveis(raiz, '[data-conteudo]')[0] ?? focaveis(raiz)[0] ?? raiz
      inicial.focus()
    }
    return () => {
      const voltar = anterior.current
      if (voltar && document.contains(voltar)) voltar.focus()
    }
  }, [aberto, ref])

  return (evento: KeyboardEvent<HTMLElement>) => {
    if (evento.key === 'Escape') {
      evento.stopPropagation()
      onFechar()
      return
    }
    if (evento.key !== 'Tab' || !ref.current) return
    const lista = focaveis(ref.current)
    if (lista.length === 0) return
    const primeiro = lista[0]!
    const ultimo = lista.at(-1)!
    if (evento.shiftKey && document.activeElement === primeiro) {
      evento.preventDefault()
      ultimo.focus()
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault()
      primeiro.focus()
    }
  }
}
