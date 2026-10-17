// /chamamentos/:ch/sessoes/:s (DetailPage) — sessão: foco da projeção { tipo, propostaId, subcriterio? }, presentes
// (nome e papel, editáveis com o mesmo bloco da abertura), pauta (propostas dos lotes da sessão) e encerrar (com
// confirmação destrutiva). Excluir a sessão: seção própria no fim da página, fora das ações do cabeçalho; apaga a
// sessão e tudo o que foi registrado com ela (prévia no DialogoExclusao). Admin e presidente fazem tudo.

import { FileText, MonitorUp, Power, SquarePen, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useWatch } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router'
import { DetailPage } from '../../components/templates/paginas'
import { AlertaErroApi } from '../../components/ui/AlertaErroApi'
import { Button, classesBotao } from '../../components/ui/Button'
import { ButtonLink } from '../../components/ui/ButtonLink'
import { Card } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { DataTable } from '../../components/ui/DataTable'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { CampoLista, FormularioApi } from '../../components/ui/FormularioApi'
import { Icone } from '../../components/ui/Icone'
import { Skeleton } from '../../components/ui/Skeleton'
import { Badge } from '../../components/ui/StatusBadge'
import { ROTULO_PAPEL } from '../../domain/comissao'
import { MATRIZ_2026 } from '../../domain/matriz'
import { podeFazer } from '../../domain/permissoes'
import type { z } from '../../esquemas/base'
import { TIPOS_FOCO, esquemaAbrirSessao, esquemaFoco } from '../../esquemas/sessao'
import { chamarApi } from '../../lib/api'
import { dataBr } from '../../lib/datas'
import { useColecao, useDocumento } from '../../lib/firestore'
import type { Chamamento, Osc, Proposta, Sessao } from '../../lib/tipos'
import { useUsuario } from '../auth/useUsuario'
import { ROTULO_TIPO_FOCO, descreverFoco } from '../projecao/foco'
import { useExclusao } from '../exclusao/useExclusao'
import { CamposPresentes, PRESENTES_INICIAIS } from './FormAberturaSessao'
import { SeloSessao } from './SeloSessao'

const SUBCRITERIOS = MATRIZ_2026.dimensao1.planos.flatMap((pa) =>
  pa.subcriterios.map((s) => ({ valor: s.codigo, rotulo: `${pa.codigo} · ${s.codigo} — ${s.titulo}` })),
)

/** Subcritério só aparece quando o tipo do foco é "subcritério". */
function CampoSubcriterio() {
  const tipo = useWatch({ name: 'tipo' }) as string | undefined
  return tipo === 'subcriterio' ? <CampoLista nome="subcriterio" rotulo="Subcritério" opcoes={SUBCRITERIOS} /> : null
}

type Presente = Sessao['presentes'][number]

export function ConduzirSessao() {
  const { ch, s } = useParams()
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
  // Pauta: as propostas dos lotes da sessão.
  const lotesPauta = dados.lotes ?? []
  const pauta = propostas.dados
    .filter((p) => lotesPauta.includes(p.loteCodigo))
    .sort((a, b) => a.loteCodigo.localeCompare(b.loteCodigo) || (nomeOsc.get(a.oscCnpj) ?? '').localeCompare(nomeOsc.get(b.oscCnpj) ?? ''))
    .map((p) => p.id)
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
        descricao: aberta ? 'Sessão aberta: a Comissão registra avaliações e conduz a projeção.' : 'Sessão encerrada: somente consulta.',
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
      ]}
    >
      <AlertaErroApi erro={erro} />

      <Card
        titulo="Foco da projeção"
        descricao={dados.foco ? `${rotuloProposta(dados.foco.propostaId)} · ${descreverFoco(dados.foco)}` : 'Sem foco definido: o telão mostra a pauta.'}
      >
        {conduz && (
          <FormularioApi
            key={JSON.stringify(dados.foco)}
            rotulo="Foco da projeção"
            esquema={esquemaFoco}
            valoresIniciais={{ tipo: dados.foco?.tipo ?? 'subcriterio', propostaId: dados.foco?.propostaId ?? '', subcriterio: dados.foco?.subcriterio ?? '' }}
            transformar={(v) => ({
              tipo: v.tipo,
              propostaId: v.propostaId,
              ...(v.tipo === 'subcriterio' ? { subcriterio: v.subcriterio } : {}),
            })}
            rotuloEnviar="Definir foco"
            campoDoFormulario={(campo) => campo.replace(/^foco\./, '')}
            onEnviar={(foco) => alterar({ acao: 'foco', foco }).then(() => undefined)}
            acoesSecundarias={
              dados.foco ? (
                <Button variante="secondary" onClick={() => void executar(() => alterar({ acao: 'foco', foco: null }))}>
                  Limpar foco
                </Button>
              ) : undefined
            }
          >
            <div className="grid gap-4 md:grid-cols-2">
              <CampoLista nome="tipo" rotulo="O que projetar" opcoes={TIPOS_FOCO.map((t) => ({ valor: t, rotulo: ROTULO_TIPO_FOCO[t] }))} />
              <CampoLista nome="propostaId" rotulo="Proposta" opcoes={pauta.map((id) => ({ valor: id, rotulo: rotuloProposta(id) }))} />
            </div>
            <CampoSubcriterio />
          </FormularioApi>
        )}
      </Card>

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
        {pauta.length === 0 && <p className="text-body-sm text-text-secondary">Nenhuma proposta nos lotes da pauta.</p>}
        <ol className="divide-y divide-border-default">
          {pauta.map((id, i) => (
            <li key={id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <span className="text-body-md text-text-primary">
                <span className="mr-2 text-label-md text-text-secondary">{i + 1}.</span>
                {rotuloProposta(id)}
              </span>
              <ButtonLink para={`${caminho}/propostas/${id}/d1`} variante="tertiary" tamanho="sm" aria-label={`Avaliação D1: ${rotuloProposta(id)}`}>
                Avaliação D1
              </ButtonLink>
            </li>
          ))}
        </ol>
      </Card>

      {podeGravar && (
        <Card
          titulo="Exclusão da sessão"
          descricao="Apaga a sessão e tudo o que a Comissão registrou com ela (admissibilidade, níveis, experiências e desempates); os totais das propostas são recalculados."
        >
          <Button
            variante="destructive"
            icone={Trash2}
            onClick={() => exclusao.abrir({ rota: '/api/sessao', ids: { chamamentoId: ch ?? '', sessaoId: s ?? '' }, nome: `sessão de ${dataBr(dados.data)}` })}
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
