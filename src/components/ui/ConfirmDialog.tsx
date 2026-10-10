// Confirmação de ação destrutiva: alertdialog, foco inicial em "Cancelar" (o caminho seguro), botão
// destrutivo com o verbo da ação (ex.: "Desativar"), carregando enquanto confirma.

import type { ReactNode } from 'react'
import { Button } from './Button'
import { Dialog } from './Dialog'

export interface PropsConfirmDialog {
  aberto: boolean
  titulo: string
  mensagem: ReactNode
  rotuloConfirmar: string
  rotuloCancelar?: string
  onConfirmar: () => void
  onCancelar: () => void
  confirmando?: boolean
}

export function ConfirmDialog({ aberto, titulo, mensagem, rotuloConfirmar, rotuloCancelar = 'Cancelar', onConfirmar, onCancelar, confirmando }: PropsConfirmDialog) {
  return (
    <Dialog
      aberto={aberto}
      papel="alertdialog"
      largura="sm"
      titulo={titulo}
      descricao={mensagem}
      onFechar={onCancelar}
      rodape={
        <>
          <Button variante="secondary" onClick={onCancelar} data-autofocus>
            {rotuloCancelar}
          </Button>
          <Button variante="destructive" onClick={onConfirmar} carregando={confirmando}>
            {rotuloConfirmar}
          </Button>
        </>
      }
    />
  )
}
