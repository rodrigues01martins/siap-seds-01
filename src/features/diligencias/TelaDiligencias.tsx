// /chamamentos/:ch/propostas/:p/diligencias — diligências da proposta (RF-28). Escrita: presidente e
// relator; proposta homologada fica somente leitura. Diligência em aberto impede a homologação.

import { useParams } from 'react-router'
import { EstadoLeitura } from '../../componentes/basicos'
import { podeFazer } from '../../domain/permissoes'
import { chamarApi } from '../../lib/api'
import { useColecao } from '../../lib/firestore'
import { useUsuario } from '../auth/useUsuario'
import { CabecalhoProposta, useDadosProposta } from '../avaliacao/CabecalhoProposta'
import { ListaDiligencias, type DiligenciaGravada } from './ListaDiligencias'

export function TelaDiligencias() {
  const { ch = '', p = '' } = useParams()
  const { usuario } = useUsuario()
  const leitura = useDadosProposta(ch, p)
  const diligencias = useColecao<Omit<DiligenciaGravada, 'id'>>(`chamamentos/${ch}/propostas/${p}/diligencias`)

  const carregando = leitura.carregando || diligencias.carregando
  const erro = leitura.erro ?? diligencias.erro
  if (carregando || erro) return <EstadoLeitura carregando={carregando} erro={erro} />
  if (!leitura.dados) return <p className="text-slate-600">Proposta não encontrada.</p>

  const { proposta } = leitura.dados
  const motivo = proposta.bloqueada
    ? 'Proposta homologada: somente leitura.'
    : !podeFazer(usuario?.perfil ?? null, 'diligencias')
      ? 'Seu perfil consulta as diligências; o registro é do presidente ou do relator.'
      : null
  const base = { chamamentoId: ch, propostaId: p }
  const lista = [...diligencias.dados].sort((a, b) => a.prazo.localeCompare(b.prazo))

  return (
    <>
      <CabecalhoProposta dados={leitura.dados} ch={ch} aba="diligencias" />
      {motivo && <p className="mb-3 rounded-md bg-slate-100 p-2 text-sm text-slate-700">{motivo}</p>}
      <ListaDiligencias
        diligencias={lista}
        somenteLeitura={motivo !== null}
        onCriar={async (dados) => {
          await chamarApi('/api/diligencias', { metodo: 'POST', corpo: { ...base, ...dados } })
        }}
        onResponder={async (id, resposta) => {
          await chamarApi('/api/diligencias', { metodo: 'PATCH', corpo: { ...base, id, acao: 'responder', resposta } })
        }}
        onEncerrar={async (id, conclusao) => {
          await chamarApi('/api/diligencias', { metodo: 'PATCH', corpo: { ...base, id, acao: 'encerrar', conclusao } })
        }}
      />
    </>
  )
}
