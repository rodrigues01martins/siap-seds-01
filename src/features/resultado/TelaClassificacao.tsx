// /chamamentos/:ch/lotes/:lote/classificacao (ListPage) — classificação do lote, com homologação (C5),
// reabertura (RF-18) e registro do desempate (RF-27) por quem tem a permissão. Demais perfis só leem.
// Quadro-resumo do lote em PDF e XLSX, gerado no navegador com a mesma tabela.
// O desempate é decisão da Comissão: só em sessão aberta (o sessaoId vai na gravação).

import { collection, query, where } from 'firebase/firestore'
import { useParams } from 'react-router'
import { ListPage } from '../../components/templates/paginas'
import { Alert } from '../../components/ui/Alert'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { Skeleton } from '../../components/ui/Skeleton'
import { useToast } from '../../components/ui/Toast'
import { podeFazer } from '../../domain/permissoes'
import { chamarApi } from '../../lib/api'
import { useColecao, useConsulta, useDocumento } from '../../lib/firestore'
import type { Chamamento, Osc, Sessao } from '../../lib/tipos'
import { useUsuario } from '../auth/useUsuario'
import { BotoesQuadro } from '../relatorios/BotoesRelatorio'
import { TabelaClassificacao, type DecisaoRegistrada, type LinhaClassificacao } from './TabelaClassificacao'

export function TelaClassificacao() {
  const { ch = '', lote = '' } = useParams()
  const { usuario } = useUsuario()
  const { mostrar } = useToast()
  const acesso = usuario?.acesso ?? null
  const chamamento = useDocumento<Chamamento>(`chamamentos/${ch}`)
  const propostas = useColecao<Omit<LinhaClassificacao, 'id' | 'nomeOsc'> & { loteCodigo: string; oscCnpj: string }>(`chamamentos/${ch}/propostas`)
  const oscs = useColecao<Osc>('oscs')
  const desempates = useColecao<Omit<DecisaoRegistrada, 'id'> & { loteCodigo: string }>(`chamamentos/${ch}/desempates`)
  const abertas = useConsulta<Sessao>(`sessoes-abertas-${ch}`, (db) => query(collection(db, `chamamentos/${ch}/sessoes`), where('status', '==', 'aberta')))

  const carregando = chamamento.carregando || propostas.carregando || oscs.carregando || desempates.carregando || abertas.carregando
  const erro = chamamento.erro ?? propostas.erro ?? oscs.erro ?? desempates.erro ?? abertas.erro
  if (carregando) return <Skeleton linhas={8} rotulo="Carregando classificação" />
  if (erro) return <ErrorState mensagem={erro} />
  const dadosLote = chamamento.dados?.lotes.find((l) => l.codigo === lote)
  if (!chamamento.dados || !dadosLote) return <EmptyState titulo="Lote não encontrado" descricao="Confira o endereço ou volte ao painel do chamamento." />

  const nomeOsc = new Map(oscs.dados.map((o) => [o.cnpj, o.razaoSocial]))
  const linhas: LinhaClassificacao[] = propostas.dados.filter((p) => p.loteCodigo === lote).map((p) => ({ ...p, nomeOsc: nomeOsc.get(p.oscCnpj) ?? p.oscCnpj }))
  const alvo = (propostaId: string) => ({ chamamentoId: ch, propostaId })
  const decisoes = desempates.dados.filter((d) => d.loteCodigo === lote)
  const nome = (id: string) => linhas.find((l) => l.id === id)?.nomeOsc ?? id
  const sessaoAberta = abertas.dados[0] ?? null
  const temPermissaoDesempate = podeFazer(acesso, 'desempate')

  return (
    <ListPage
      cabecalho={{
        trilha: [
          { rotulo: 'Chamamentos', para: '/' },
          { rotulo: `Chamamento ${chamamento.dados.numero}`, para: `/chamamentos/${ch}` },
          { rotulo: `Classificação — Lote ${dadosLote.codigo}` },
        ],
        titulo: `Classificação — Lote ${dadosLote.codigo}`,
        descricao: `${dadosLote.descricao}. Empates de NF são resolvidos pelos critérios do Edital (I a VI, na ordem); se persistirem, a Comissão decide e registra a ordem.`,
        acoesSecundarias: (
          <BotoesQuadro
            cabecalho={{ chamamento: { numero: chamamento.dados.numero, titulo: chamamento.dados.titulo }, lote: dadosLote }}
            propostas={linhas}
            decisoes={decisoes}
          />
        ),
      }}
    >
      {temPermissaoDesempate && !sessaoAberta && (
        <Alert tom="info" titulo="Desempate só em sessão aberta">
          O registro do desempate é decisão da Comissão: o presidente precisa abrir a sessão.
        </Alert>
      )}
      <TabelaClassificacao
        lote={dadosLote}
        propostas={linhas}
        decisoes={decisoes}
        podeHomologar={podeFazer(acesso, 'homologar')}
        podeDesempatar={temPermissaoDesempate && sessaoAberta !== null}
        podeReabrir={podeFazer(acesso, 'reabrir')}
        onHomologar={async (id) => {
          await chamarApi('/api/homologar', { metodo: 'POST', corpo: alvo(id) })
          mostrar({ tom: 'success', titulo: 'Proposta homologada', mensagem: nome(id) })
        }}
        onReabrir={async (id, motivo) => {
          await chamarApi('/api/reabrir', { metodo: 'POST', corpo: { ...alvo(id), motivo } })
          mostrar({ tom: 'info', titulo: 'Proposta reaberta', mensagem: nome(id) })
        }}
        onDesempatar={async (ordem, justificativa) => {
          await chamarApi('/api/desempate', { metodo: 'PUT', corpo: { chamamentoId: ch, sessaoId: sessaoAberta?.id, loteCodigo: lote, ordem, justificativa } })
          mostrar({ tom: 'success', titulo: 'Desempate registrado' })
        }}
      />
    </ListPage>
  )
}
