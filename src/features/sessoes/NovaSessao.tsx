// /chamamentos/:ch/sessoes/nova (FormPage): abertura da sessão em uma única página — data, lote(s) em pauta e
// presentes por nome (POST /api/sessao). Ao abrir, vai para a tela da sessão.

import { useNavigate, useParams } from 'react-router'
import { FormPage } from '../../components/templates/paginas'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { Skeleton } from '../../components/ui/Skeleton'
import { chamarApi } from '../../lib/api'
import { useDocumento } from '../../lib/firestore'
import type { Chamamento } from '../../lib/tipos'
import { FormAberturaSessao } from './FormAberturaSessao'

export function NovaSessao() {
  const { ch } = useParams()
  const navegar = useNavigate()
  const chamamento = useDocumento<Chamamento>(`chamamentos/${ch}`)

  if (chamamento.carregando) return <Skeleton linhas={6} rotulo="Carregando abertura de sessão" />
  if (chamamento.erro) return <ErrorState mensagem={chamamento.erro} />
  if (!chamamento.dados) return <EmptyState titulo="Chamamento não encontrado" descricao="Confira o endereço ou volte à lista de chamamentos." />
  const numero = chamamento.dados.numero

  return (
    <FormPage
      cabecalho={{
        trilha: [{ rotulo: 'Chamamentos', para: '/' }, { rotulo: `Chamamento ${numero}`, para: `/chamamentos/${ch}` }, { rotulo: 'Abertura de sessão' }],
        titulo: 'Abertura de sessão',
        descricao: 'Informe a data, o(s) lote(s) em pauta e quem está presente. Só com a sessão aberta a Comissão registra avaliações.',
      }}
    >
      <FormAberturaSessao
        lotes={chamamento.dados.lotes}
        onAbrir={async (corpo) => {
          const { id } = await chamarApi<{ id: string }>('/api/sessao', { metodo: 'POST', corpo: { chamamentoId: ch, ...corpo } })
          navegar(`/chamamentos/${ch}/sessoes/${id}`)
        }}
      />
    </FormPage>
  )
}
