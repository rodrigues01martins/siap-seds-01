// Classificação do lote: ranking por NF (src/domain/classificacao.ts, sem duplicar regra; motivos e aviso
// vêm de src/relatorios/quadroResumo.ts, os mesmos do quadro-resumo) em DataTable com StatusBadge, propostas
// fora da classificação com o motivo, aviso de não definitiva, desempate registrado pela Comissão (RF-27),
// homologação com confirmação dupla mostrando NF e status (C5) e reabertura destrutiva com motivo (RF-18).

import { ArrowDown, ArrowUp, BadgeCheck, RotateCcw, Scale } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Alert } from '../../components/ui/Alert'
import { AlertaErroApi } from '../../components/ui/AlertaErroApi'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Checkbox } from '../../components/ui/Checkbox'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { DataTable } from '../../components/ui/DataTable'
import { Dialog } from '../../components/ui/Dialog'
import { ListaDescricao } from '../../components/ui/ListaDescricao'
import { Badge, StatusBadge } from '../../components/ui/StatusBadge'
import { TextArea } from '../../components/ui/TextArea'
import { formatarNumero } from '../../domain/formatacao'
import { MATRIZ_2026 } from '../../domain/matriz'
import { statusDaProposta } from '../../domain/statusProposta'
import { esquemaDesempate, esquemaReabrir } from '../../esquemas/resultado'
import {
  avisoNaoDefinitiva,
  classificarPropostas,
  motivoFora,
  propostasFora,
  type DecisaoComJustificativa,
  type PropostaQuadro,
} from '../../relatorios/quadroResumo'

/** Proposta do lote como a classificação a lê (o mesmo formato do quadro-resumo). */
export type LinhaClassificacao = PropostaQuadro
export type DecisaoRegistrada = DecisaoComJustificativa

interface Props {
  lote: { codigo: string; descricao: string }
  propostas: LinhaClassificacao[]
  decisoes: DecisaoRegistrada[]
  podeHomologar: boolean
  podeDesempatar: boolean
  podeReabrir: boolean
  onHomologar: (id: string) => Promise<void>
  onDesempatar: (ordem: string[], justificativa: string) => Promise<void>
  onReabrir: (id: string, motivo: string) => Promise<void>
}

type Dialogo = { tipo: 'homologar' | 'reabrir'; id: string } | { tipo: 'desempate'; nf: number; ids: string[] } | null
type Esquema = { safeParse: (v: unknown) => { success: boolean; error?: { issues: { message: string }[] } } }

const PLANOS = MATRIZ_2026.dimensao1.planos
const CRITERIOS_DESEMPATE = new Map(MATRIZ_2026.desempate.map((c) => [c.ordem, `${c.ordem} – ${c.descricao}`]))
const mesmoConjunto = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x))
const POR_PAGINA = 100

/** Executa a ação do diálogo; erro da /api fica no diálogo. */
function useAcao() {
  const [executando, setExecutando] = useState(false)
  const [erro, setErro] = useState<unknown>(null)
  async function executar(acao: () => Promise<void>, aoConcluir: () => void) {
    setErro(null)
    setExecutando(true)
    try {
      await acao()
      aoConcluir()
    } catch (e) {
      setErro(e)
    } finally {
      setExecutando(false)
    }
  }
  return { executando, erro, executar }
}

function DialogoHomologar({ proposta, onConfirmar, onFechar }: { proposta: LinhaClassificacao; onConfirmar: () => Promise<void>; onFechar: () => void }) {
  const [conferido, setConferido] = useState(false)
  const { executando, erro, executar } = useAcao()
  return (
    <ConfirmDialog
      aberto
      variante="primary"
      titulo={`Homologar ${proposta.nomeOsc}?`}
      mensagem="Depois de homologada, a proposta fica somente leitura em todas as telas (só a reabertura desfaz)."
      rotuloConfirmar="Confirmar homologação"
      confirmarDesabilitado={!conferido}
      confirmando={executando}
      onCancelar={onFechar}
      onConfirmar={() => void executar(onConfirmar, onFechar)}
    >
      <div className="space-y-4">
        <ListaDescricao
          className="sm:grid-cols-2 xl:grid-cols-2"
          itens={[
            { termo: 'Nota final (NF)', valor: <strong className="text-heading-3 tabular-nums">{`NF ${formatarNumero(proposta.totais?.nf ?? 0)}`}</strong> },
            { termo: 'Status', valor: <StatusBadge status={statusDaProposta(proposta)} /> },
          ]}
        />
        <Checkbox rotulo="Conferi a NF e o status desta proposta" checked={conferido} onChange={(e) => setConferido(e.target.checked)} />
        <AlertaErroApi erro={erro} />
      </div>
    </ConfirmDialog>
  )
}

function DialogoReabrir({ nome, onConfirmar, onFechar }: { nome: string; onConfirmar: (motivo: string) => Promise<void>; onFechar: () => void }) {
  const [motivo, setMotivo] = useState('')
  const [mensagem, setMensagem] = useState<string | undefined>()
  const { executando, erro, executar } = useAcao()
  return (
    <ConfirmDialog
      aberto
      titulo={`Reabrir ${nome}?`}
      mensagem="A proposta volta a aceitar avaliação (RF-18) e deixa de estar homologada. O motivo fica registrado e auditado."
      rotuloConfirmar="Confirmar reabertura"
      confirmando={executando}
      onCancelar={onFechar}
      onConfirmar={() => {
        const r = (esquemaReabrir.shape.motivo as Esquema).safeParse(motivo)
        if (!r.success) {
          setMensagem(r.error?.issues[0]?.message ?? 'Valor inválido.')
          return
        }
        setMensagem(undefined)
        void executar(() => onConfirmar(motivo.trim()), onFechar)
      }}
    >
      <div className="space-y-4">
        <TextArea rotulo="Motivo" obrigatorio rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} erro={mensagem} />
        <AlertaErroApi erro={erro} />
      </div>
    </ConfirmDialog>
  )
}

function DialogoDesempate({
  nf,
  ids,
  nomes,
  onConfirmar,
  onFechar,
}: {
  nf: number
  ids: string[]
  nomes: Map<string, string>
  onConfirmar: (ordem: string[], justificativa: string) => Promise<void>
  onFechar: () => void
}) {
  const [ordem, setOrdem] = useState(ids)
  const [justificativa, setJustificativa] = useState('')
  const [mensagem, setMensagem] = useState<string | undefined>()
  const { executando, erro, executar } = useAcao()
  const mover = (i: number, delta: number) => {
    const nova = [...ordem]
    ;[nova[i], nova[i + delta]] = [nova[i + delta]!, nova[i]!]
    setOrdem(nova)
  }
  return (
    <Dialog
      aberto
      largura="lg"
      titulo={`Desempate — NF ${formatarNumero(nf)}`}
      descricao="Os critérios do Edital (I a VI) não resolveram este empate. Registre a ordem decidida pela Comissão (RF-27). A 1ª fica com a melhor posição."
      onFechar={onFechar}
      rodape={
        <>
          <Button variante="secondary" onClick={onFechar}>
            Cancelar
          </Button>
          <Button
            carregando={executando}
            onClick={() => {
              const r = (esquemaDesempate.shape.justificativa as Esquema).safeParse(justificativa)
              if (!r.success) {
                setMensagem(r.error?.issues[0]?.message ?? 'Valor inválido.')
                return
              }
              setMensagem(undefined)
              void executar(() => onConfirmar(ordem, justificativa.trim()), onFechar)
            }}
          >
            Registrar decisão
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <ol aria-label="Ordem decidida" className="divide-y divide-border-default rounded-card border border-card-border">
          {ordem.map((id, i) => (
            <li key={id} className="flex items-center gap-3 px-4 py-2">
              <span className="text-label-md text-text-secondary">{i + 1}º</span>
              <span className="flex-1 text-body-md text-text-primary">{nomes.get(id)}</span>
              <Button variante="tertiary" tamanho="sm" icone={ArrowUp} aria-label={`Subir ${nomes.get(id)}`} desabilitado={i === 0} onClick={() => mover(i, -1)}>
                Subir
              </Button>
              <Button variante="tertiary" tamanho="sm" icone={ArrowDown} aria-label={`Descer ${nomes.get(id)}`} desabilitado={i === ordem.length - 1} onClick={() => mover(i, 1)}>
                Descer
              </Button>
            </li>
          ))}
        </ol>
        <TextArea rotulo="Justificativa" obrigatorio rows={3} value={justificativa} onChange={(e) => setJustificativa(e.target.value)} erro={mensagem} />
        <AlertaErroApi erro={erro} />
      </div>
    </Dialog>
  )
}

const Selos = ({ children }: { children: ReactNode }) => <span className="flex flex-wrap items-center gap-1 py-2">{children}</span>

export function TabelaClassificacao({ lote, propostas, decisoes, podeHomologar, podeDesempatar, podeReabrir, onHomologar, onDesempatar, onReabrir }: Props) {
  const [dialogo, setDialogo] = useState<Dialogo>(null)
  const porId = new Map(propostas.map((p) => [p.id, p]))
  const nomes = new Map(propostas.map((p) => [p.id, p.nomeOsc]))
  const r = classificarPropostas(propostas, decisoes)
  const decisaoDo = (nf: number, ids: string[]) => decisoes.find((d) => d.nf === nf && mesmoConjunto(d.propostas, ids))
  const aviso = avisoNaoDefinitiva(r)
  const comAcoes = podeHomologar || podeReabrir

  const acoes = (p: LinhaClassificacao) =>
    p.bloqueada
      ? podeReabrir && (
          <Button variante="tertiary" tamanho="sm" icone={RotateCcw} onClick={() => setDialogo({ tipo: 'reabrir', id: p.id })}>
            Reabrir
          </Button>
        )
      : podeHomologar &&
        p.totais &&
        p.totais.status !== 'pendente' && (
          <Button variante="secondary" tamanho="sm" icone={BadgeCheck} onClick={() => setDialogo({ tipo: 'homologar', id: p.id })}>
            Homologar
          </Button>
        )

  const ranking = r.ranking.map((pos) => ({ pos, p: porId.get(pos.id)! }))
  const fora = propostasFora(r).map(({ id, situacao }) => ({ p: porId.get(id)!, situacao }))

  return (
    <div className="space-y-6">
      {aviso && (
        <Alert tom="warning" papel="status" titulo="Resultado provisório" rotulo="Classificação não definitiva">
          {aviso}
        </Alert>
      )}

      <Card titulo="Ranking" descricao="Por NF entre propostas aptas e completas (Anexo IV, 3.10). Empatadas dividem a posição até o desempate.">
        <DataTable<(typeof ranking)[number]>
          rotulo={`Classificação do lote ${lote.codigo}`}
          linhas={ranking}
          chave={({ pos }) => pos.id}
          porPagina={POR_PAGINA}
          colunasEstreitas
          vazio={{ titulo: 'Nenhuma proposta apta com avaliação completa' }}
          colunas={[
            { id: 'posicao', titulo: 'Posição', celula: ({ pos }) => <span className="text-heading-4 tabular-nums">{pos.posicao}º</span> },
            { id: 'osc', titulo: 'OSC', celula: ({ p }) => <span className="block min-w-40 text-label-md">{p.nomeOsc}</span> },
            ...PLANOS.map((pa, i) => ({
              id: pa.codigo,
              titulo: pa.codigo,
              alinhar: 'direita' as const,
              celula: ({ p }: (typeof ranking)[number]) => formatarNumero(p.totais?.totaisPorPA[i]?.pontos ?? 0),
            })),
            { id: 'd1', titulo: 'D1', alinhar: 'direita', celula: ({ pos }) => formatarNumero(pos.d1) },
            { id: 'd2', titulo: 'D2', alinhar: 'direita', celula: ({ pos }) => formatarNumero(pos.d2) },
            { id: 'nf', titulo: 'NF', alinhar: 'direita', celula: ({ pos }) => <strong>{formatarNumero(pos.nf)}</strong> },
            {
              id: 'status',
              titulo: 'Status',
              celula: ({ pos, p }) => (
                <Selos>
                  <StatusBadge status={statusDaProposta(p)} />
                  {pos.empatada && <StatusBadge status="empatada" />}
                  {pos.desempatadaPelaComissao && <Badge tom="info">Desempate da Comissão</Badge>}
                  {pos.desempatadaPeloEdital && (
                    <span title={CRITERIOS_DESEMPATE.get(pos.criterioDesempate ?? '')}>
                      <Badge tom="info">{`Desempate pelo Edital (critério ${pos.criterioDesempate})`}</Badge>
                    </span>
                  )}
                </Selos>
              ),
            },
          ]}
          acoes={comAcoes ? ({ p }) => acoes(p) : undefined}
        />
      </Card>

      {r.empates.length > 0 && (
        <Card titulo="Empates não resolvidos pelos critérios do Edital (RF-27)">
          <ul className="divide-y divide-border-default">
            {r.empates.map((e) => {
              const decisao = e.decidido ? decisaoDo(e.nf, e.ids) : undefined
              return (
                <li key={`${e.nf}-${e.ids.join('-')}`} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <p className="text-body-md text-text-primary">
                    <strong>NF {formatarNumero(e.nf)}</strong>: {e.ids.map((id) => nomes.get(id)).join(', ')} —{' '}
                    {decisao ? (
                      <span>
                        decisão da Comissão: {decisao.ordem.map((id) => nomes.get(id)).join(' > ')}. Justificativa: {decisao.justificativa}
                      </span>
                    ) : (
                      <Badge tom="warning">Sem decisão registrada</Badge>
                    )}
                  </p>
                  {podeDesempatar && !e.decidido && (
                    <Button variante="secondary" tamanho="sm" icone={Scale} onClick={() => setDialogo({ tipo: 'desempate', nf: e.nf, ids: e.ids })}>
                      Registrar desempate (NF {formatarNumero(e.nf)})
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      {fora.length > 0 && (
        <Card titulo="Fora da classificação" descricao="Pendentes, inaptas, desclassificadas e não admitidas, sem posição e com o motivo.">
          <DataTable<(typeof fora)[number]>
            rotulo="Fora da classificação"
            linhas={fora}
            chave={({ p }) => p.id}
            porPagina={POR_PAGINA}
            colunas={[
              { id: 'osc', titulo: 'OSC', celula: ({ p }) => <span className="text-label-md">{p.nomeOsc}</span> },
              {
                id: 'situacao',
                titulo: 'Situação',
                celula: ({ p, situacao }) => (
                  <Selos>
                    <StatusBadge status={situacao} />
                    {p.bloqueada && <StatusBadge status="homologada" />}
                  </Selos>
                ),
              },
              { id: 'motivo', titulo: 'Motivo', celula: ({ p, situacao }) => <span className="block min-w-64 py-2 text-text-secondary">{motivoFora(p, situacao)}</span> },
              { id: 'nf', titulo: 'NF', alinhar: 'direita', celula: ({ p }) => (p.totais ? formatarNumero(p.totais.nf) : '—') },
            ]}
            acoes={comAcoes ? ({ p, situacao }) => situacao !== 'pendente' && acoes(p) : undefined}
          />
        </Card>
      )}

      {dialogo?.tipo === 'homologar' && <DialogoHomologar proposta={porId.get(dialogo.id)!} onConfirmar={() => onHomologar(dialogo.id)} onFechar={() => setDialogo(null)} />}
      {dialogo?.tipo === 'reabrir' && <DialogoReabrir nome={nomes.get(dialogo.id) ?? ''} onConfirmar={(motivo) => onReabrir(dialogo.id, motivo)} onFechar={() => setDialogo(null)} />}
      {dialogo?.tipo === 'desempate' && <DialogoDesempate nf={dialogo.nf} ids={dialogo.ids} nomes={nomes} onConfirmar={onDesempatar} onFechar={() => setDialogo(null)} />}
    </div>
  )
}
