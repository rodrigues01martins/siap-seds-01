// Exclusão nas telas: botao(alvo) é a lixeira do item; abre o DialogoExclusao; ao concluir, aviso (toast) com
// o que foi apagado e fecha. A lista se atualiza sozinha (as telas leem com onSnapshot).

import { useState, type ReactNode } from 'react'
import { useToast } from '../../components/ui/Toast'
import { BotaoExcluir, DialogoExclusao, type AlvoDialogoExclusao } from './DialogoExclusao'

export function useExclusao(opcoes: { aoExcluir?: () => void } = {}) {
  const [alvo, setAlvo] = useState<AlvoDialogoExclusao | null>(null)
  const { mostrar } = useToast()

  const dialogo = (
    <DialogoExclusao
      alvo={alvo}
      onFechar={() => setAlvo(null)}
      onExcluido={({ resumo }) => {
        mostrar({ tom: 'success', titulo: 'Exclusão concluída', mensagem: `${alvo?.nome ?? 'Registro'}: apagados ${resumo}.` })
        setAlvo(null)
        opcoes.aoExcluir?.()
      }}
    />
  )

  const botao = (novo: AlvoDialogoExclusao): ReactNode => <BotaoExcluir nome={novo.nome} onClick={() => setAlvo(novo)} />

  return { dialogo, botao, abrir: setAlvo }
}
