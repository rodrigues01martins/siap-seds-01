// Confirmação de ação: alertdialog, foco inicial em "Cancelar" (o caminho seguro), botão com o verbo da
// ação (ex.: "Desativar"), carregando enquanto confirma. Destrutiva por padrão; variante "primary" para
// atos importantes que não destroem (ex.: concluir a proposta). Conteúdo extra (ex.: justificativa) em children.

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
  variante?: 'destructive' | 'primary'
  /** Botão de confirmar desabilitado (ex.: até marcar "Conferi"). */
  confirmarDesabilitado?: boolean
  children?: ReactNode
}

export function ConfirmDialog({ aberto, titulo, mensagem, rotuloConfirmar, rotuloCancelar = 'Cancelar', onConfirmar, onCancelar, confirmando, variante = 'destructive', confirmarDesabilitado, children }: PropsConfirmDialog) {
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
          <Button variante={variante} onClick={onConfirmar} carregando={confirmando} desabilitado={confirmarDesabilitado}>
            {rotuloConfirmar}
          </Button>
        </>
      }
    >
      {children}
    </Dialog>
  )
}
