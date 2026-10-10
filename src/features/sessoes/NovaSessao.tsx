// /chamamentos/:ch/sessoes/nova (WizardPage): carrega Comissão e propostas e abre a sessão (POST /api/sessao)
// em três etapas — abertura, presentes e declarações, pauta.

import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { WizardPage } from '../../components/templates/paginas'
import { ErrorState } from '../../components/ui/ErrorState'
import { Skeleton } from '../../components/ui/Skeleton'
import { chamarApi } from '../../lib/api'
import { useColecao, useDocumento } from '../../lib/firestore'
import type { Chamamento, Osc, Proposta } from '../../lib/tipos'
import { FormAberturaSessao, PASSOS_ABERTURA } from './FormAberturaSessao'
import { useComissao } from './useComissao'

export function NovaSessao() {
  const { ch } = useParams()
  const navegar = useNavigate()
  const [passo, setPasso] = useState(0)
  const chamamento = useDocumento<Chamamento>(`chamamentos/${ch}`)
  const comissao = useComissao()
  const propostas = useColecao<Proposta>(`chamamentos/${ch}/propostas`)
  const oscs = useColecao<Osc>('oscs')

  const carregando = chamamento.carregando || comissao.carregando || propostas.carregando || oscs.carregando
  const erro = chamamento.erro ?? comissao.erro ?? propostas.erro ?? oscs.erro
  if (carregando) return <Skeleton linhas={6} rotulo="Carregando abertura de sessão" />
  if (erro) return <ErrorState mensagem={erro} />

  const nomeOsc = new Map(oscs.dados.map((o) => [o.cnpj, o.razaoSocial]))
  const pauta = propostas.dados
    .filter((p) => !p.bloqueada)
    .map((p) => ({ id: p.id, rotulo: `${nomeOsc.get(p.oscCnpj) ?? p.oscCnpj} — Lote ${p.loteCodigo}` }))
    .sort((a, b) => a.rotulo.localeCompare(b.rotulo))
  const numero = chamamento.dados?.numero ?? ch ?? ''

  return (
    <WizardPage
      cabecalho={{
        trilha: [{ rotulo: 'Chamamentos', para: '/' }, { rotulo: `Chamamento ${numero}`, para: `/chamamentos/${ch}` }, { rotulo: 'Abertura de sessão' }],
        titulo: 'Abertura de sessão',
        descricao: 'A sessão registra quem está presente, as declarações de impedimento e a pauta. Só com ela aberta a Comissão registra avaliações.',
      }}
      passos={[...PASSOS_ABERTURA]}
      passoAtual={passo}
    >
      <FormAberturaSessao
        membros={comissao.dados}
        propostas={pauta}
        passo={passo}
        onPasso={setPasso}
        onAbrir={async (corpo) => {
          const { id } = await chamarApi<{ id: string }>('/api/sessao', {
            metodo: 'POST',
            corpo: { chamamentoId: ch, ...corpo },
          })
          navegar(`/chamamentos/${ch}/sessoes/${id}`)
        }}
      />
    </WizardPage>
  )
}
