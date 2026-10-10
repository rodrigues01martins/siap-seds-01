// Estado de erro (falha ao carregar): alerta com mensagem e "Tentar novamente".

import { CircleX, RotateCw } from 'lucide-react'
import { Button } from './Button'
import { Icone } from './Icone'

export function ErrorState({
  titulo = 'Não foi possível carregar',
  mensagem,
  onTentarNovamente,
}: {
  titulo?: string
  mensagem: string
  onTentarNovamente?: () => void
}) {
  return (
    <div role="alert" className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <span className="text-status-error">
        <Icone icone={CircleX} tamanho={24} />
      </span>
      <h3 className="text-heading-4 text-text-primary">{titulo}</h3>
      <p className="max-w-md text-body-sm text-text-secondary">{mensagem}</p>
      {onTentarNovamente && (
        <Button variante="secondary" tamanho="sm" icone={RotateCw} onClick={onTentarNovamente} className="mt-2">
          Tentar novamente
        </Button>
      )}
    </div>
  )
}
