// Editor da minuta de ata: o texto gerado dos registros pode ser ajustado pelo relator antes de exportar.
// A edição fica só na página (não é gravada); o PDF e o código de verificação usam o texto final.

import { useState } from 'react'

interface Props {
  textoInicial: string
  minuta: boolean
  onExportar: (texto: string) => Promise<void>
  exportando?: boolean
}

export function EditorAta({ textoInicial, minuta, onExportar, exportando = false }: Props) {
  const [texto, setTexto] = useState(textoInicial)
  const [aviso, setAviso] = useState<string | null>(null)
  return (
    <div className="space-y-3">
      {minuta && (
        <p className="rounded-md border-2 border-amber-500 bg-amber-50 p-3 text-sm font-medium text-amber-900">
          Há proposta da pauta não homologada: o PDF sai com a marca d’água "MINUTA".
        </p>
      )}
      <div>
        <label htmlFor="texto-ata" className="block text-sm font-medium">
          Texto da ata
        </label>
        <textarea
          id="texto-ata"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={28}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm"
        />
        <p className="mt-1 text-xs text-slate-500">
          A 1ª linha é o título; linhas como "1. PRESENTES" viram títulos de seção. A edição não é gravada no sistema.
        </p>
        {aviso && <p className="mt-1 text-sm text-red-700">{aviso}</p>}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={exportando}
          onClick={async () => {
            if (texto.trim() === '') {
              setAviso('O texto da ata está vazio.')
              return
            }
            setAviso(null)
            await onExportar(texto)
          }}
          className="rounded-md bg-sky-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-50"
        >
          {exportando ? 'Gerando…' : 'Exportar PDF'}
        </button>
        <button
          type="button"
          onClick={() => {
            setTexto(textoInicial)
            setAviso(null)
          }}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
        >
          Restaurar texto gerado
        </button>
      </div>
    </div>
  )
}
