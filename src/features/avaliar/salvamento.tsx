// Salvamento automático na tela de avaliação (Simplificação 3/4): sem botão Salvar. Cada campo mostra na hora o
// que foi digitado ou clicado (rascunho otimista da FilaSalvamento) e a gravação na /api vem em seguida.
// - ProvedorSalvamento: uma fila por tela; avisa ao sair da página com gravação pendente (beforeunload) e, ao
//   sair da tela pelo app, envia na hora o que esperava o debounce.
// - useCampo: valor do servidor ou o rascunho, que some quando o servidor confirma o mesmo valor.
// - IndicadorSalvamento: "Salvando…" / "Tudo salvo" / "Erro ao salvar — tentar de novo" (região aria-live).

import { CircleCheck, LoaderCircle, TriangleAlert } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { cx } from '../../components/ui/cx'
import { Icone } from '../../components/ui/Icone'
import { FilaSalvamento } from '../../lib/salvamento'

/** Debounce dos textos (justificativa, motivo, páginas, campos da experiência). */
export const ATRASO_TEXTO = 800

const Contexto = createContext<FilaSalvamento | null>(null)

export function ProvedorSalvamento({ fila: externa, children }: { fila?: FilaSalvamento; children: ReactNode }) {
  const [fila] = useState(() => externa ?? new FilaSalvamento())
  useEffect(() => {
    const aoSair = (evento: BeforeUnloadEvent) => {
      if (!fila.pendente()) return
      evento.preventDefault()
      evento.returnValue = ''
    }
    window.addEventListener('beforeunload', aoSair)
    return () => {
      window.removeEventListener('beforeunload', aoSair)
      fila.descarregar()
    }
  }, [fila])
  return <Contexto.Provider value={fila}>{children}</Contexto.Provider>
}

/** A fila da tela; o componente redesenha a cada mudança dela. */
export function useFila(): FilaSalvamento {
  const fila = useContext(Contexto)
  if (!fila) throw new Error('useFila() precisa estar dentro de <ProvedorSalvamento>')
  const assinar = useCallback((ouvinte: () => void) => fila.assinar(ouvinte), [fila])
  useSyncExternalStore(assinar, () => fila.instantaneo())
  return fila
}

/** Valor do campo na tela: o rascunho (otimista) ou o do servidor. */
export function useCampo<T>(chave: string, servidor: T): T {
  const fila = useFila()
  const rascunho = fila.rascunho<T>(chave)
  const versao = fila.instantaneo()
  const comparavel = JSON.stringify(servidor)
  useEffect(() => {
    fila.confirmar(chave, servidor)
    // `comparavel` representa `servidor` (listas e objetos mudam de identidade a cada leitura).
  }, [fila, chave, comparavel, versao])
  return rascunho !== undefined ? rascunho : servidor
}

export function IndicadorSalvamento({ className }: { className?: string }) {
  const fila = useFila()
  const estado = fila.estado()
  return (
    <div className={cx('flex flex-wrap items-center gap-2 text-body-sm', className)}>
      <span role="status" aria-live="polite" aria-label="Salvamento" className="inline-flex items-center gap-1.5">
        {estado === 'salvando' && (
          <>
            <Icone icone={LoaderCircle} tamanho={16} className="animate-spin text-text-secondary" />
            <span className="text-text-secondary">Salvando…</span>
          </>
        )}
        {estado === 'salvo' && (
          <>
            <Icone icone={CircleCheck} tamanho={16} className="text-status-success" />
            <span className="text-text-secondary">Tudo salvo</span>
          </>
        )}
        {estado === 'erro' && (
          <>
            <Icone icone={TriangleAlert} tamanho={16} className="text-status-error" />
            <span className="text-status-error-text">Erro ao salvar: {fila.ultimoErro()}</span>
          </>
        )}
        {estado === 'incompleto' && (
          <>
            <Icone icone={TriangleAlert} tamanho={16} className="text-status-warning" />
            <span className="text-status-warning-text">Não salvo: {fila.ultimoErro()}</span>
          </>
        )}
      </span>
      {estado === 'erro' && (
        <button type="button" onClick={() => fila.tentarDeNovo()} className="rounded-button px-1 text-label-md text-text-link underline underline-offset-2">
          Tentar de novo
        </button>
      )}
    </div>
  )
}
