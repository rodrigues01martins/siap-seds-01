// Exclusão nas telas de lista: abrir(alvo) mostra o DialogoExclusao; ao concluir, aviso (toast) e fecha.
// Também o selo "Em exclusão" para registro marcado pela /api (status "excluindo") cuja exclusão não terminou.

import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { ItemMenuAcoes } from '../../components/ui/MenuAcoes'
import { Badge } from '../../components/ui/StatusBadge'
import { useToast } from '../../components/ui/Toast'
import { DialogoExclusao, type AlvoDialogoExclusao } from './DialogoExclusao'

export const emExclusao = (registro: { status?: string }) => registro.status === 'excluindo'

export function SeloEmExclusao() {
  return <Badge tom="error">Em exclusão</Badge>
}

export function useExclusao() {
  const [alvo, setAlvo] = useState<AlvoDialogoExclusao | null>(null)
  const { mostrar } = useToast()

  const dialogo = (
    <DialogoExclusao
      alvo={alvo}
      onFechar={() => setAlvo(null)}
      onExcluido={({ total }) => {
        mostrar({ tom: 'success', titulo: 'Exclusão concluída', mensagem: `${alvo?.nome ?? 'Registro'}: ${total} ${total === 1 ? 'documento apagado' : 'documentos apagados'}.` })
        setAlvo(null)
      }}
    />
  )

  /** Item "Excluir" do menu de ações da linha. */
  const itemExcluir = (novo: AlvoDialogoExclusao): ItemMenuAcoes => ({ rotulo: 'Excluir', icone: Trash2, destrutivo: true, onSelecionar: () => setAlvo(novo) })

  return { dialogo, itemExcluir }
}
