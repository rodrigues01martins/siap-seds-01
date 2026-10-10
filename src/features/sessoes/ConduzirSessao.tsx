// /chamamentos/:ch/sessoes/:s (DetailPage) — sessão: foco da projeção { tipo, propostaId, subcriterio? }
// (quem conduz), presentes e declarações, pauta e encerrar (presidente, com confirmação destrutiva).
// Os demais perfis só leem.

import { FileText, MonitorUp, Power, SquarePen } from 'lucide-react'
import { useState } from 'react'
import { useWatch } from 'react-hook-form'
import { useParams } from 'react-router'
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
import { campoDosMembros, corpoDosMembros, LinhasMembros } from './FormAberturaSessao'
import { useComissao } from './useComissao'

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
  const conduz = aberta && podeFazer(acesso, 'sessaoConduzir')
  const encerra = aberta && podeFazer(acesso, 'sessaoAbrirEncerrar')
  const nomeOsc = new Map(oscs.dados.map((o) => [o.cnpj, o.razaoSocial]))
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

  const declaracao = (uid: string) => dados.declaracoes.find((d) => d.uid === uid)
  const caminho = `/chamamentos/${ch}`
  const titulo = `Sessão de ${dataBr(dados.data)}`

  return (
    <DetailPage
      cabecalho={{
        trilha: [{ rotulo: 'Chamamentos', para: '/' }, { rotulo: `Chamamento ${chamamento.dados?.numero ?? ch}`, para: caminho }, { rotulo: titulo }],
        titulo,
        descricao: aberta ? 'Sessão aberta: a Comissão registra avaliações e o relator conduz a projeção.' : 'Sessão encerrada: somente consulta.',
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
        { termo: 'Situação', valor: <Badge tom={aberta ? 'success' : 'neutral'}>{aberta ? 'Aberta' : 'Encerrada'}</Badge> },
        { termo: 'Data', valor: dataBr(dados.data) },
        { termo: 'Presentes', valor: dados.presentes.length },
        { termo: 'Propostas na pauta', valor: dados.pauta.length },
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
              <CampoLista nome="propostaId" rotulo="Proposta" opcoes={dados.pauta.map((id) => ({ valor: id, rotulo: rotuloProposta(id) }))} />
            </div>
            <CampoSubcriterio />
          </FormularioApi>
        )}
      </Card>

      <Card
        titulo="Presentes e declarações de impedimento"
        acoes={
          conduz && !editandoPresentes ? (
            <Button variante="secondary" tamanho="sm" icone={SquarePen} onClick={() => setEditandoPresentes(true)}>
              Alterar presentes e declarações
            </Button>
          ) : undefined
        }
      >
        {editandoPresentes ? (
          <EditorMembros sessao={dados} alterar={alterar} aoConcluir={() => setEditandoPresentes(false)} />
        ) : (
          <DataTable<Presente>
            rotulo="Presentes"
            linhas={dados.presentes}
            chave={(p) => p.uid}
            vazio={{ titulo: 'Nenhum presente registrado' }}
            colunas={[
              { id: 'membro', titulo: 'Membro', celula: (p) => p.email ?? p.uid },
              { id: 'papel', titulo: 'Papel', celula: (p) => ROTULO_PAPEL[p.perfil] ?? p.perfil },
              {
                id: 'declaracao',
                titulo: 'Declaração',
                celula: (p) => {
                  const d = declaracao(p.uid)
                  if (!d) return <Badge tom="warning">Sem declaração</Badge>
                  return d.semImpedimento ? (
                    <Badge tom="success">Sem impedimento</Badge>
                  ) : (
                    <span className="flex flex-wrap items-center gap-2">
                      <Badge tom="error">Impedido</Badge>
                      <span className="text-body-sm text-text-secondary">{d.motivo}</span>
                    </span>
                  )
                },
              },
            ]}
          />
        )}
      </Card>

      <Card titulo="Pauta" descricao="Propostas avaliadas nesta sessão, na ordem da pauta.">
        <ol className="divide-y divide-border-default">
          {dados.pauta.map((id, i) => (
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

const esquemaMembros = esquemaAbrirSessao.pick({ presentes: true, declaracoes: true })

/** Mesma lista de membros da abertura, aplicada como presentes + declarações. */
function EditorMembros({
  sessao,
  alterar,
  aoConcluir,
}: {
  sessao: Sessao
  alterar: (corpo: Record<string, unknown>) => Promise<unknown>
  aoConcluir: () => void
}) {
  const comissao = useComissao()
  if (comissao.carregando) return <Skeleton linhas={3} rotulo="Carregando Comissão" />
  if (comissao.erro) return <ErrorState mensagem={comissao.erro} />

  const presentes = new Set(sessao.presentes.map((p) => p.uid))
  const linhas = comissao.dados.map((m) => {
    const d = sessao.declaracoes.find((x) => x.uid === m.uid)
    return { uid: m.uid, presente: presentes.has(m.uid), semImpedimento: d ? d.semImpedimento : true, motivo: d?.motivo ?? '' }
  })

  return (
    <FormularioApi
      rotulo="Presentes e declarações"
      esquema={esquemaMembros}
      valoresIniciais={{ membros: linhas }}
      transformar={(valores) => corpoDosMembros(valores.membros ?? [])}
      campoDoFormulario={(campo, corpo) => campoDosMembros(campo, corpo, linhas)}
      rotuloEnviar="Salvar presentes e declarações"
      acoesSecundarias={
        <Button variante="secondary" onClick={aoConcluir}>
          Cancelar
        </Button>
      }
      onEnviar={async ({ presentes: uids, declaracoes }: z.output<typeof esquemaMembros>) => {
        await alterar({ acao: 'presentes', presentes: uids })
        await alterar({ acao: 'declaracoes', declaracoes })
        aoConcluir()
      }}
    >
      <LinhasMembros membros={comissao.dados} />
    </FormularioApi>
  )
}
