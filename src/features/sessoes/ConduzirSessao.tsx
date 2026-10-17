// /sessao/:id?ch= (DetailPage) — sessão (Simplificação 3/4): presentes (nome e papel, editáveis com o mesmo bloco
// da abertura) e a pauta — as propostas dos lotes da sessão, cada uma com o progresso ("D1 18/28 · D2 ok"), o
// status e "Avaliar" (/avaliar, a proposta inteira numa tela). O telão acompanha a tela de avaliação
// (interruptor "Projetar"); aqui só se vê o que está projetado. Encerrar (confirmação destrutiva) e, numa seção
// própria no fim, excluir a sessão e tudo o que foi registrado com ela (prévia no DialogoExclusao).

import { ClipboardCheck, FileText, MonitorUp, Power, SquarePen, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { DetailPage } from '../../components/templates/paginas'
import { AlertaErroApi } from '../../components/ui/AlertaErroApi'
import { Button, classesBotao } from '../../components/ui/Button'
import { ButtonLink } from '../../components/ui/ButtonLink'
import { Card } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { DataTable } from '../../components/ui/DataTable'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { FormularioApi } from '../../components/ui/FormularioApi'
import { Icone } from '../../components/ui/Icone'
import { Skeleton } from '../../components/ui/Skeleton'
import { Badge, StatusBadge } from '../../components/ui/StatusBadge'
import { situacaoDaProposta } from '../../domain/situacaoProposta'
import { rotaAvaliar } from '../../lib/rotas'
import { ROTULO_PAPEL } from '../../domain/comissao'
import { podeFazer } from '../../domain/permissoes'
import type { z } from '../../esquemas/base'
import { esquemaAbrirSessao } from '../../esquemas/sessao'
import { chamarApi } from '../../lib/api'
import { dataBr } from '../../lib/datas'
import { useColecao, useDocumento, type ComId } from '../../lib/firestore'
import type { Avaliacao, Chamamento, Osc, Proposta, Sessao } from '../../lib/tipos'
import { useUsuario } from '../auth/useUsuario'
import { descreverFoco } from '../projecao/foco'
import { ordenarPauta, progressoD1, textoProgresso } from '../avaliar/pauta'
import { useExclusao } from '../exclusao/useExclusao'
import { CamposPresentes, PRESENTES_INICIAIS } from './FormAberturaSessao'
import { SeloSessao } from './SeloSessao'

type Presente = Sessao['presentes'][number]

export function ConduzirSessao() {
  const { id: s = '' } = useParams()
  const [consulta] = useSearchParams()
  const ch = consulta.get('ch') ?? ''
  const { usuario } = useUsuario()
  const acesso = usuario?.acesso ?? null
  const chamamento = useDocumento<Chamamento>(`chamamentos/${ch}`)
  const sessao = useDocumento<Sessao>(`chamamentos/${ch}/sessoes/${s}`)
  const propostas = useColecao<Proposta>(`chamamentos/${ch}/propostas`)
  const oscs = useColecao<Osc>('oscs')
  const navegar = useNavigate()
  const exclusao = useExclusao({ aoExcluir: () => navegar(`/chamamentos/${ch}`) })
  const [erro, setErro] = useState<unknown>(null)
  const [confirmarEncerrar, setConfirmarEncerrar] = useState(false)
  const [encerrando, setEncerrando] = useState(false)
  const [editandoPresentes, setEditandoPresentes] = useState(false)

  const carregando = chamamento.carregando || sessao.carregando || propostas.carregando || oscs.carregando
  const erroLeitura = chamamento.erro ?? sessao.erro ?? propostas.erro ?? oscs.erro
  if (carregando) return <Skeleton linhas={6} rotulo="Carregando sessão" />
  if (erroLeitura) return <ErrorState mensagem={erroLeitura} />
  if (!sessao.dados) return <EmptyState titulo="Sessão não encontrada" descricao="Confira o endereço ou volte ao painel do chamamento." />

  const dados = sessao.dados
  const aberta = dados.status === 'aberta'
  // Admin e presidente fazem tudo (a rota já exige um dos perfis).
  const podeGravar = podeFazer(acesso)
  const conduz = aberta && podeGravar
  const encerra = aberta && podeGravar
  const nomeOsc = new Map(oscs.dados.map((o) => [o.cnpj, o.razaoSocial]))
  // Pauta: as propostas dos lotes da sessão, por lote e nome da OSC.
  const lotesPauta = dados.lotes ?? []
  const pauta = ordenarPauta(propostas.dados, lotesPauta, nomeOsc)
  const rotuloProposta = (id: string) => {
    const p = propostas.dados.find((x) => x.id === id)
    return p ? `${nomeOsc.get(p.oscCnpj) ?? p.oscCnpj} — Lote ${p.loteCodigo}` : id
  }
  const alterar = (corpo: Record<string, unknown>) => chamarApi('/api/sessao', { metodo: 'PATCH', corpo: { chamamentoId: ch, sessaoId: s, ...corpo } })

  async function executar(acao: () => Promise<unknown>) {
    setErro(null)
    try {
      await acao()
    } catch (e) {
      setErro(e)
    }
  }

  const caminho = `/chamamentos/${ch}`
  const titulo = `Sessão de ${dataBr(dados.data)}`

  return (
    <DetailPage
      cabecalho={{
        trilha: [{ rotulo: 'Chamamentos', para: '/' }, { rotulo: `Chamamento ${chamamento.dados?.numero ?? ch}`, para: caminho }, { rotulo: titulo }],
        titulo,
        descricao: aberta ? 'Sessão aberta: escolha a proposta e avalie; o telão acompanha a tela de avaliação.' : 'Sessão encerrada: somente consulta.',
        acoesSecundarias: (
          <>
            <ButtonLink para={`${caminho}/sessoes/${s}/ata`} variante="secondary" icone={FileText}>
              Minuta de ata
            </ButtonLink>
            {aberta && (
              <a href={`/projecao/${ch}/${s}`} target="_blank" rel="noreferrer" className={classesBotao({ variante: 'secondary' })}>
                <Icone icone={MonitorUp} tamanho={16} />
                Abrir projeção (telão)
                <span className="sr-only"> (abre em nova aba)</span>
              </a>
            )}
            {encerra && (
              <Button variante="destructive" icone={Power} onClick={() => setConfirmarEncerrar(true)}>
                Encerrar sessão
              </Button>
            )}
          </>
        ),
      }}
      resumo={[
        { termo: 'Situação', valor: <SeloSessao status={dados.status} /> },
        { termo: 'Data', valor: dataBr(dados.data) },
        { termo: 'Presentes', valor: dados.presentes.length },
        { termo: 'Lotes em pauta', valor: lotesPauta.join(', ') || '—' },
        { termo: 'Propostas na pauta', valor: pauta.length },
        { termo: 'No telão', valor: dados.foco ? `${rotuloProposta(dados.foco.propostaId)} · ${descreverFoco(dados.foco)}` : 'Pauta (sem foco)' },
      ]}
    >
      <AlertaErroApi erro={erro} />

      <Card
        titulo="Presentes"
        acoes={
          conduz && !editandoPresentes ? (
            <Button variante="secondary" tamanho="sm" icone={SquarePen} onClick={() => setEditandoPresentes(true)}>
              Alterar presentes
            </Button>
          ) : undefined
        }
      >
        {editandoPresentes ? (
          <EditorPresentes sessao={dados} alterar={alterar} aoConcluir={() => setEditandoPresentes(false)} />
        ) : (
          <DataTable<Presente & { indice: number }>
            rotulo="Presentes"
            linhas={dados.presentes.map((p, indice) => ({ ...p, indice }))}
            chave={(p) => String(p.indice)}
            vazio={{ titulo: 'Nenhum presente registrado' }}
            colunas={[
              { id: 'nome', titulo: 'Nome', celula: (p) => p.nome },
              { id: 'papel', titulo: 'Papel', celula: (p) => <Badge tom={p.papel === 'presidente' ? 'info' : 'neutral'}>{ROTULO_PAPEL[p.papel] ?? p.papel}</Badge> },
            ]}
          />
        )}
      </Card>

      <Card titulo="Pauta" descricao={`Propostas do(s) lote(s) ${lotesPauta.join(', ') || '—'}, analisadas nesta sessão.`}>
        {pauta.length === 0 ? (
          <p className="text-body-sm text-text-secondary">Nenhuma proposta nos lotes da pauta.</p>
        ) : (
          <ol aria-label="Propostas da pauta" className="divide-y divide-border-default">
            {pauta.map((id, i) => (
              <LinhaPauta key={id} ch={ch} numero={i + 1} proposta={propostas.dados.find((x) => x.id === id)!} rotulo={rotuloProposta(id)} justificativaMinima={chamamento.dados?.justificativaMinima} />
            ))}
          </ol>
        )}
      </Card>

      {podeGravar && (
        <Card
          titulo="Exclusão da sessão"
          descricao="Apaga a sessão e tudo o que a Comissão registrou com ela (admissibilidade, níveis, experiências e desempates); os totais das propostas são recalculados."
        >
          <Button
            variante="destructive"
            icone={Trash2}
            onClick={() => exclusao.abrir({ rota: '/api/sessao', ids: { chamamentoId: ch, sessaoId: s }, nome: `sessão de ${dataBr(dados.data)}` })}
          >
            Excluir sessão
          </Button>
        </Card>
      )}
      {exclusao.dialogo}

      <ConfirmDialog
        aberto={confirmarEncerrar}
        titulo="Encerrar a sessão?"
        mensagem="Depois de encerrada, não será possível registrar avaliações nesta sessão. A ata continua disponível."
        rotuloConfirmar="Encerrar sessão"
        confirmando={encerrando}
        onCancelar={() => setConfirmarEncerrar(false)}
        onConfirmar={async () => {
          setEncerrando(true)
          await executar(() => alterar({ acao: 'encerrar' }))
          setEncerrando(false)
          setConfirmarEncerrar(false)
        }}
      />
    </DetailPage>
  )
}

const esquemaPresentes = esquemaAbrirSessao.pick({ presentes: true })

/** Mesma lista de presentes da abertura (nome e papel), aplicada à sessão. */
function EditorPresentes({
  sessao,
  alterar,
  aoConcluir,
}: {
  sessao: Sessao
  alterar: (corpo: Record<string, unknown>) => Promise<unknown>
  aoConcluir: () => void
}) {
  return (
    <FormularioApi
      rotulo="Presentes"
      esquema={esquemaPresentes}
      valoresIniciais={{ presentes: sessao.presentes.length > 0 ? sessao.presentes : PRESENTES_INICIAIS }}
      rotuloEnviar="Salvar presentes"
      acoesSecundarias={
        <Button variante="secondary" onClick={aoConcluir}>
          Cancelar
        </Button>
      }
      onEnviar={async ({ presentes }: z.output<typeof esquemaPresentes>) => {
        await alterar({ acao: 'presentes', presentes })
        aoConcluir()
      }}
    >
      <CamposPresentes />
    </FormularioApi>
  )
}

/** Proposta da pauta: progresso (D1 completos de 28 · D2 com experiência), status e "Avaliar". */
function LinhaPauta({
  ch,
  numero,
  proposta,
  rotulo,
  justificativaMinima,
}: {
  ch: string
  numero: number
  proposta: ComId<Proposta>
  rotulo: string
  justificativaMinima?: number
}) {
  const base = `chamamentos/${ch}/propostas/${proposta.id}`
  const avaliacoes = useColecao<Avaliacao>(`${base}/avaliacoes`)
  const experiencias = useColecao(`${base}/experiencias`)
  const progresso = textoProgresso(progressoD1(avaliacoes.dados, justificativaMinima), experiencias.dados.length)
  const admissao = proposta.admissibilidade ? 'Admissão ok' : 'Admissão pendente'
  return (
    <li aria-label={rotulo} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
      <span className="min-w-0 flex-1 text-body-md text-text-primary">
        <span className="mr-2 text-label-md text-text-secondary">{numero}.</span>
        {rotulo}
      </span>
      <span className="text-body-sm text-text-secondary tabular-nums">
        {admissao} · {avaliacoes.carregando || experiencias.carregando ? '…' : progresso}
      </span>
      <span className="flex gap-2">
        <StatusBadge status={situacaoDaProposta(proposta)} />
        {proposta.concluida && <StatusBadge status="concluida" />}
      </span>
      <ButtonLink para={rotaAvaliar(ch, proposta.id)} variante="secondary" tamanho="sm" icone={ClipboardCheck} aria-label={`Avaliar ${rotulo}`}>
        Avaliar
      </ButtonLink>
    </li>
  )
}
