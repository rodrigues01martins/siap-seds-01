// Diligências da proposta (RF-28). Escrita: quem tem a permissão "Diligências"; proposta homologada fica
// somente leitura. Diligência em aberto impede a homologação.
// - /chamamentos/:ch/propostas/:p/diligencias (ListPage): lista e "Nova diligência".
// - …/diligencias/nova (FormPage): abertura (objeto e prazo).
// - …/diligencias/:d (FormPage): resposta e encerramento.

import { Plus } from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import { FormPage, ListPage } from '../../components/templates/paginas'
import { ButtonLink } from '../../components/ui/ButtonLink'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { Skeleton } from '../../components/ui/Skeleton'
import { useToast } from '../../components/ui/Toast'
import { chamarApi } from '../../lib/api'
import { useColecao } from '../../lib/firestore'
import { AvisoSomenteLeitura, cabecalhoDaProposta, ContextoProposta, useDadosProposta, type DadosProposta } from '../avaliacao/CabecalhoProposta'
import { AvisoConteudoNovo, FormNovaDiligencia, ListaDiligencias, TratarDiligencia, type DiligenciaGravada } from './ListaDiligencias'

function useDiligencias() {
  const { ch = '', p = '' } = useParams()
  const leitura = useDadosProposta(ch, p)
  const diligencias = useColecao<Omit<DiligenciaGravada, 'id'>>(`chamamentos/${ch}/propostas/${p}/diligencias`)
  const carregando = leitura.carregando || diligencias.carregando
  const erro = leitura.erro ?? diligencias.erro
  const motivo = (dados: DadosProposta) => (dados.proposta.bloqueada ? 'Proposta homologada.' : null)
  const base = { chamamentoId: ch, propostaId: p }
  const caminho = `/chamamentos/${ch}/propostas/${p}/diligencias`
  const lista = [...diligencias.dados].sort((a, b) => a.prazo.localeCompare(b.prazo))
  return { ch, carregando, erro, dados: leitura.dados, lista, motivo, base, caminho }
}

function Estado({ carregando, erro }: { carregando: boolean; erro: string | null }) {
  if (carregando) return <Skeleton linhas={6} rotulo="Carregando diligências" />
  if (erro) return <ErrorState mensagem={erro} />
  return <EmptyState titulo="Proposta não encontrada" descricao="Confira o endereço ou volte ao painel do chamamento." />
}

/** Trilha das telas filhas: … / Diligências / <página>. */
function cabecalhoFilho(dados: DadosProposta, ch: string, caminho: string, titulo: string) {
  const c = cabecalhoDaProposta(dados, ch, 'diligencias')
  return {
    ...c,
    trilha: [...c.trilha!.slice(0, -1), { rotulo: 'Diligências', para: caminho }, { rotulo: titulo }],
    titulo,
    descricao: `${dados.osc?.razaoSocial ?? 'OSC'} · ${c.descricao as string}`,
    acoesSecundarias: undefined,
  }
}

export function TelaDiligencias() {
  const { ch, carregando, erro, dados, lista, motivo, caminho } = useDiligencias()
  if (carregando || erro || !dados) return <Estado carregando={carregando} erro={erro} />
  const somenteLeitura = motivo(dados)
  return (
    <ListPage
      cabecalho={cabecalhoDaProposta(dados, ch, 'diligencias', {
        acaoPrimaria: somenteLeitura ? undefined : (
          <ButtonLink para={`${caminho}/nova`} icone={Plus}>
            Nova diligência
          </ButtonLink>
        ),
      })}
    >
      <ContextoProposta dados={dados} ch={ch} aba="diligencias" />
      <AvisoConteudoNovo />
      <AvisoSomenteLeitura motivo={somenteLeitura} />
      <Card titulo="Diligências" descricao="Diligência aberta ou respondida (sem encerramento) impede a homologação da proposta.">
        <ListaDiligencias diligencias={lista} caminho={(id) => `${caminho}/${id}`} somenteLeitura={somenteLeitura !== null} />
      </Card>
    </ListPage>
  )
}

export function TelaNovaDiligencia() {
  const navegar = useNavigate()
  const { mostrar } = useToast()
  const { ch, carregando, erro, dados, motivo, base, caminho } = useDiligencias()
  if (carregando || erro || !dados) return <Estado carregando={carregando} erro={erro} />
  const somenteLeitura = motivo(dados)
  return (
    <FormPage cabecalho={cabecalhoFilho(dados, ch, caminho, 'Nova diligência')}>
      <AvisoConteudoNovo />
      {somenteLeitura ? (
        <AvisoSomenteLeitura motivo={somenteLeitura} />
      ) : (
        <FormNovaDiligencia
          acoesSecundarias={
            <ButtonLink para={caminho} variante="secondary">
              Cancelar
            </ButtonLink>
          }
          onCriar={async (corpo) => {
            await chamarApi('/api/diligencias', { metodo: 'POST', corpo: { ...base, ...corpo } })
            mostrar({ tom: 'success', titulo: 'Diligência aberta' })
            navegar(caminho)
          }}
        />
      )}
    </FormPage>
  )
}

export function TelaDiligencia() {
  const { d = '' } = useParams()
  const { mostrar } = useToast()
  const { ch, carregando, erro, dados, lista, motivo, base, caminho } = useDiligencias()
  if (carregando || erro || !dados) return <Estado carregando={carregando} erro={erro} />
  const diligencia = lista.find((x) => x.id === d)
  if (!diligencia) return <EmptyState titulo="Diligência não encontrada" acao={<ButtonLink para={caminho} variante="secondary">Voltar às diligências</ButtonLink>} />
  const somenteLeitura = motivo(dados)
  return (
    <FormPage cabecalho={cabecalhoFilho(dados, ch, caminho, 'Diligência')}>
      <AvisoConteudoNovo />
      <AvisoSomenteLeitura motivo={somenteLeitura} />
      <TratarDiligencia
        diligencia={diligencia}
        somenteLeitura={somenteLeitura !== null}
        onResponder={async (resposta) => {
          await chamarApi('/api/diligencias', { metodo: 'PATCH', corpo: { ...base, id: d, acao: 'responder', resposta } })
          mostrar({ tom: 'success', titulo: 'Resposta registrada' })
        }}
        onEncerrar={async (conclusao) => {
          await chamarApi('/api/diligencias', { metodo: 'PATCH', corpo: { ...base, id: d, acao: 'encerrar', conclusao } })
          mostrar({ tom: 'success', titulo: 'Diligência encerrada' })
        }}
      />
    </FormPage>
  )
}
