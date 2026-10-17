// Endereços antigos (antes da Simplificação 3/4) levam à tela nova: a sessão em /sessao/:id e a avaliação da
// proposta, inteira, em /avaliar/:propostaId (na aba correspondente).

import { Navigate, useParams } from 'react-router'
import { rotaAvaliar, rotaSessao, type AbaAvaliacao } from '../../lib/rotas'

export function RedirecionarSessao() {
  const { ch = '', s = '' } = useParams()
  return <Navigate to={rotaSessao(ch, s)} replace />
}

export function RedirecionarAvaliacao({ aba }: { aba: AbaAvaliacao }) {
  const { ch = '', p = '' } = useParams()
  return <Navigate to={rotaAvaliar(ch, p, aba)} replace />
}
