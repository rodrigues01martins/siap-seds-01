// Rota inexistente dentro do app (ex.: o antigo catálogo /ui, removido na Manutenção 2): diz que a página não
// existe, mostra o endereço pedido e leva de volta ao início. Fica dentro do AppShell (menu continua disponível).

import { House, SearchX } from 'lucide-react'
import { useLocation } from 'react-router'
import { DetailPage } from '../../components/templates/paginas'
import { ButtonLink } from '../../components/ui/ButtonLink'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'

export function NaoEncontrado() {
  const { pathname } = useLocation()
  return (
    <DetailPage cabecalho={{ titulo: 'Página não encontrada', descricao: 'O endereço não existe no sistema ou foi removido.' }}>
      <Card>
        <EmptyState
          icone={SearchX}
          titulo="Nada neste endereço"
          descricao="Confira o endereço digitado ou use o menu. Endereço pedido:"
          acao={
            <div className="flex flex-col items-center gap-4">
              <code className="rounded-input bg-background-default px-2 py-1 text-body-sm text-text-primary">{pathname}</code>
              <ButtonLink para="/" variante="secondary" icone={House}>
                Voltar ao início
              </ButtonLink>
            </div>
          }
        />
      </Card>
    </DetailPage>
  )
}
