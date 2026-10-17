// Editor da minuta de ata: o texto gerado dos registros pode ser ajustado pelo relator antes de exportar.
// A edição fica só na página (não é gravada); o PDF e o código de verificação usam o texto final.

import { FileDown, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { TextArea } from '../../components/ui/TextArea'

interface Props {
  textoInicial: string
  minuta: boolean
  onExportar: (texto: string) => Promise<void>
  exportando?: boolean
}

export function EditorAta({ textoInicial, minuta, onExportar, exportando = false }: Props) {
  const [texto, setTexto] = useState(textoInicial)
  const [aviso, setAviso] = useState<string | undefined>()
  return (
    <div className="space-y-4">
      {minuta && (
        <Alert tom="warning" papel="status" titulo="Documento sai como MINUTA">
          Há proposta da pauta não concluída: o PDF sai com a marca d’água "MINUTA".
        </Alert>
      )}
      <TextArea
        id="texto-ata"
        rotulo="Texto da ata"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={28}
        className="[&_textarea]:font-mono"
        ajuda='A 1ª linha é o título; linhas como "1. PRESENTES" viram títulos de seção. A edição não é gravada no sistema.'
        erro={aviso}
      />
      <div className="flex flex-wrap justify-end gap-3">
        <Button
          variante="secondary"
          icone={RotateCcw}
          onClick={() => {
            setTexto(textoInicial)
            setAviso(undefined)
          }}
        >
          Restaurar texto gerado
        </Button>
        <Button
          icone={FileDown}
          carregando={exportando}
          onClick={async () => {
            if (texto.trim() === '') {
              setAviso('O texto da ata está vazio.')
              return
            }
            setAviso(undefined)
            await onExportar(texto)
          }}
        >
          {exportando ? 'Gerando…' : 'Exportar PDF'}
        </Button>
      </div>
    </div>
  )
}
