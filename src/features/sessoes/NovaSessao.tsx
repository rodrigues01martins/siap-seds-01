// /chamamentos/:ch/sessoes/nova (presidente): carrega Comissão e propostas e abre a sessão (POST /api/sessao).

import { useNavigate, useParams } from 'react-router'
import { EstadoLeitura, Titulo } from '../../componentes/basicos'
import { chamarApi } from '../../lib/api'
import { useColecao } from '../../lib/firestore'
import type { Osc, Proposta } from '../../lib/tipos'
import { FormAberturaSessao } from './FormAberturaSessao'
import { useComissao } from './useComissao'

export function NovaSessao() {
  const { ch } = useParams()
  const navegar = useNavigate()
  const comissao = useComissao()
  const propostas = useColecao<Proposta>(`chamamentos/${ch}/propostas`)
  const oscs = useColecao<Osc>('oscs')

  const carregando = comissao.carregando || propostas.carregando || oscs.carregando
  const erro = comissao.erro ?? propostas.erro ?? oscs.erro
  if (carregando || erro) return <EstadoLeitura carregando={carregando} erro={erro} />

  const nomeOsc = new Map(oscs.dados.map((o) => [o.cnpj, o.razaoSocial]))
  const pauta = propostas.dados
    .filter((p) => !p.bloqueada)
    .map((p) => ({ id: p.id, rotulo: `${nomeOsc.get(p.oscCnpj) ?? p.oscCnpj} — Lote ${p.loteCodigo}` }))
    .sort((a, b) => a.rotulo.localeCompare(b.rotulo))

  return (
    <>
      <Titulo>Abertura de sessão</Titulo>
      <div className="max-w-3xl rounded-lg border border-slate-200 bg-white p-6">
        <FormAberturaSessao
          membros={comissao.dados}
          propostas={pauta}
          onAbrir={async (corpo) => {
            const { id } = await chamarApi<{ id: string }>('/api/sessao', {
              metodo: 'POST',
              corpo: { chamamentoId: ch, ...corpo },
            })
            navegar(`/chamamentos/${ch}/sessoes/${id}`)
          }}
        />
      </div>
    </>
  )
}
