// Notificações passageiras (toast): região aria-live="polite" fixa no canto; cada aviso some em 6 s ou
// pelo botão Fechar. Uso: <ToastProvider> na raiz e const { mostrar } = useToast().

import { X } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { cx } from './cx'
import { Icone } from './Icone'
import { CLASSES_TOM, ICONE_TOM, type Tom } from './tons'

export interface Aviso {
  tom: Tom
  titulo: string
  mensagem?: string
}

interface AvisoNaTela extends Aviso {
  id: number
}

const DURACAO_MS = 6000
const ContextoToast = createContext<{ mostrar: (aviso: Aviso) => void } | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<AvisoNaTela[]>([])
  const proximo = useRef(1)
  const fechar = useCallback((id: number) => setAvisos((lista) => lista.filter((a) => a.id !== id)), [])
  const mostrar = useCallback((aviso: Aviso) => {
    const id = proximo.current++
    setAvisos((lista) => [...lista, { ...aviso, id }])
  }, [])
  const valor = useMemo(() => ({ mostrar }), [mostrar])

  return (
    <ContextoToast.Provider value={valor}>
      {children}
      <section aria-label="Notificações" aria-live="polite" className="fixed right-4 bottom-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
        {avisos.map((aviso) => (
          <ItemToast key={aviso.id} aviso={aviso} onFechar={() => fechar(aviso.id)} />
        ))}
      </section>
    </ContextoToast.Provider>
  )
}

function ItemToast({ aviso, onFechar }: { aviso: AvisoNaTela; onFechar: () => void }) {
  useEffect(() => {
    const relogio = setTimeout(onFechar, DURACAO_MS)
    return () => clearTimeout(relogio)
  }, [onFechar])
  return (
    <div className={cx('flex gap-3 rounded-input border-l-4 p-3 shadow-dropdown', CLASSES_TOM[aviso.tom])}>
      <Icone icone={ICONE_TOM[aviso.tom]} tamanho={20} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-label-md">{aviso.titulo}</p>
        {aviso.mensagem && <p className="text-body-sm text-text-primary">{aviso.mensagem}</p>}
      </div>
      <button type="button" onClick={onFechar} aria-label="Fechar notificação" className="h-8 w-8 shrink-0 rounded-button hover:bg-action-subtle">
        <Icone icone={X} tamanho={16} className="mx-auto" />
      </button>
    </div>
  )
}

export function useToast() {
  const contexto = useContext(ContextoToast)
  if (!contexto) throw new Error('useToast() precisa estar dentro de <ToastProvider>')
  return contexto
}
