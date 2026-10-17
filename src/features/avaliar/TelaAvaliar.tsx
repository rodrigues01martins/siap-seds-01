// /avaliar/:propostaId?ch=&aba= (DetailPage) — a proposta inteira numa tela só (Simplificação 3/4): abas Admissão |
// D1 | D2 | Resultado e um cabeçalho fixo com OSC, lote, nº SEI, progresso "x de 28", D1 e NF parciais, status,
// o indicador do salvamento automático, o interruptor "Projetar", "Proposta anterior / próxima" da pauta e o
// alerta de eliminatória. Tudo responde na hora (rascunho otimista) e grava em seguida (salvamento.tsx).
// Projetar ligado: ao trocar de aba ou mexer num subcritério, o foco do telão acompanha (PATCH /api/sessao).

import { ArrowLeft, ArrowRight, Check, Copy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { DetailPage } from '../../components/templates/paginas'
import { Alert } from '../../components/ui/Alert'
import { AlertaErroApi } from '../../components/ui/AlertaErroApi'
import { Button } from '../../components/ui/Button'
import { ButtonLink } from '../../components/ui/ButtonLink'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { Skeleton } from '../../components/ui/Skeleton'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Switch } from '../../components/ui/Switch'
import { Tabs } from '../../components/ui/Tabs'
import { formatarCnpj } from '../../domain/cnpj'
import { formatarNumero } from '../../domain/formatacao'
import { MATRIZ_2026 } from '../../domain/matriz'
import { situacaoDaProposta } from '../../domain/situacaoProposta'
import type { TipoFoco } from '../../esquemas/sessao'
import { chamarApi } from '../../lib/api'
import { rotaAvaliar, rotaSessao, type AbaAvaliacao } from '../../lib/rotas'
import type { AdmissibilidadeGravada } from '../../lib/tipos'
import { useExclusao } from '../exclusao/useExclusao'
import { AbaAdmissao, type Admissao } from './AbaAdmissao'
import { AbaD1 } from './AbaD1'
import { AbaD2 } from './AbaD2'
import { AbaResultado } from './AbaResultado'
import { motivoSemAvaliacao, motivoSemSessao, useDadosAvaliacao, type DadosProposta } from './dados'
import { vizinhas } from './pauta'
import { IndicadorSalvamento, ProvedorSalvamento, useFila } from './salvamento'
import { CODIGOS_D1, chaveAdmissao, eliminatorias, resumirD1, valoresD1 } from './valores'

const ABAS: { id: AbaAvaliacao; rotulo: string; foco: TipoFoco }[] = [
  { id: 'admissao', rotulo: 'Admissão', foco: 'admissibilidade' },
  { id: 'd1', rotulo: 'D1', foco: 'subcriterio' },
  { id: 'd2', rotulo: 'D2', foco: 'd2' },
  { id: 'resultado', rotulo: 'Resultado', foco: 'resumo' },
]
const MAXIMO_NF = MATRIZ_2026.dimensao1.maximo + MATRIZ_2026.dimensao2.maximo
const CHAVE_PROJETAR = 'siap:projetar'

/** Interruptor "Projetar", lembrado neste navegador (sem armazenamento, começa desligado). */
function useProjetar(): [boolean, (ligado: boolean) => void] {
  const [ligado, setLigado] = useState(() => {
    try {
      return localStorage.getItem(CHAVE_PROJETAR) === 'sim'
    } catch {
      return false
    }
  })
  return [
    ligado,
    (novo) => {
      setLigado(novo)
      try {
        localStorage.setItem(CHAVE_PROJETAR, novo ? 'sim' : 'nao')
      } catch {
        // Sem armazenamento: vale só nesta página.
      }
    },
  ]
}

function Copiar({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false)
  return (
    <Button
      variante="tertiary"
      tamanho="sm"
      icone={copiado ? Check : Copy}
      aria-label={`Copiar nº SEI ${texto}`}
      onClick={async () => {
        await navigator.clipboard?.writeText(texto)
        setCopiado(true)
        setTimeout(() => setCopiado(false), 1500)
      }}
    >
      {copiado ? 'Copiado' : 'Copiar'}
    </Button>
  )
}

export function TelaAvaliar() {
  return (
    <ProvedorSalvamento>
      <Conteudo />
    </ProvedorSalvamento>
  )
}

function Conteudo() {
  const { propostaId: p = '' } = useParams()
  const [consulta, setConsulta] = useSearchParams()
  const ch = consulta.get('ch') ?? ''
  const leitura = useDadosAvaliacao(ch, p)
  const fila = useFila()
  const exclusao = useExclusao()
  const [projetar, setProjetar] = useProjetar()
  const [subcriterio, setSubcriterio] = useState<string | null>(null)
  const [erroProjecao, setErroProjecao] = useState<unknown>(null)

  const dados = leitura.dados
  const pedida = consulta.get('aba') as AbaAvaliacao | null
  const aba: AbaAvaliacao = ABAS.some((a) => a.id === pedida) ? pedida! : dados?.proposta.admissibilidade ? 'd1' : 'admissao'
  const sessao = dados?.sessaoAberta ?? null
  const podeProjetar = dados !== null && sessao !== null && motivoSemSessao(dados, 'a avaliação') === null
  const focoAtual = JSON.stringify(sessao?.foco ?? null)
  const avaliacoes = dados?.avaliacoes ?? []
  const pendentes = dados ? resumirD1(valoresD1(fila, p, avaliacoes), dados.chamamento.justificativaMinima).pendentes : []

  // Projetar ligado: o telão acompanha a aba e o subcritério em que a Comissão está.
  useEffect(() => {
    if (!projetar || !podeProjetar || !sessao) return
    const tipo = ABAS.find((a) => a.id === aba)!.foco
    const foco = tipo === 'subcriterio' ? { tipo, propostaId: p, subcriterio: subcriterio ?? pendentes[0] ?? CODIGOS_D1[0]! } : { tipo, propostaId: p }
    const atual = sessao.foco
    if (atual && atual.propostaId === p && (atual.tipo ?? 'subcriterio') === tipo && (tipo !== 'subcriterio' || atual.subcriterio === foco.subcriterio)) return
    const relogio = setTimeout(() => {
      setErroProjecao(null)
      chamarApi('/api/sessao', { metodo: 'PATCH', corpo: { chamamentoId: ch, sessaoId: sessao.id, acao: 'foco', foco } }).catch(setErroProjecao)
    }, 300)
    return () => clearTimeout(relogio)
    // pendentes[0] só vale ao entrar na aba (sem subcritério escolhido): fora das dependências de propósito.
  }, [projetar, podeProjetar, aba, subcriterio, p, ch, sessao?.id, focoAtual])

  if (leitura.carregando && !dados) return <Skeleton linhas={8} rotulo="Carregando avaliação da proposta" />
  if (leitura.erro) return <ErrorState mensagem={leitura.erro} />
  if (!ch || !dados) return <EmptyState titulo="Proposta não encontrada" descricao="Confira o endereço ou volte à sessão ou ao chamamento." />

  const { chamamento, proposta, osc } = dados
  const minimo = chamamento.justificativaMinima
  const resumo = resumirD1(valoresD1(fila, p, avaliacoes), minimo)
  // Admissão otimista: "Não admitida" já tira a D1 e a D2 da avaliação na tela.
  const admissao = fila.rascunho<Admissao>(chaveAdmissao(p))
  const admissibilidade: AdmissibilidadeGravada | undefined =
    admissao && admissao.admitida !== null ? { ...proposta.admissibilidade, admitida: admissao.admitida, situacao: admissao.admitida ? 'admitida' : 'nao_admitida' } : proposta.admissibilidade
  const comAdmissao: DadosProposta = { ...dados, proposta: { ...proposta, admissibilidade } }
  const situacao = situacaoDaProposta({ totais: { ...proposta.totais, status: resumo.previa.status }, admissibilidade })
  const d2 = dados.resultadoD2?.total ?? proposta.totais?.d2 ?? 0
  const lote = chamamento.lotes.find((l) => l.codigo === proposta.loteCodigo)
  const { anterior, proxima } = vizinhas(dados.pauta, p)
  const sessaoId = sessao?.id ?? null
  const alertas = eliminatorias(resumo.previa)
  const nomeOsc = osc?.razaoSocial ?? 'OSC'

  const mudarAba = (id: string) => {
    const nova = new URLSearchParams(consulta)
    nova.set('aba', id)
    setConsulta(nova, { replace: true })
  }

  return (
    <DetailPage
      cabecalho={{
        trilha: [
          { rotulo: 'Início', para: '/' },
          { rotulo: `Chamamento ${chamamento.numero}`, para: `/chamamentos/${ch}` },
          ...(sessao ? [{ rotulo: 'Sessão aberta', para: rotaSessao(ch, sessao.id) }] : []),
          { rotulo: 'Avaliação' },
        ],
        titulo: nomeOsc,
        descricao: `Lote ${proposta.loteCodigo}${lote ? ` — ${lote.descricao}` : ''} · CNPJ ${formatarCnpj(proposta.oscCnpj)}`,
      }}
    >
      <section
        aria-label="Resumo da proposta"
        className="sticky top-0 z-20 -mx-4 space-y-2 border-b border-border-default bg-background-surface px-4 py-3 shadow-dropdown md:-mx-6 md:px-6 xl:-mx-8 xl:px-8"
      >
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <p className="min-w-0 text-label-md text-text-primary">
            <span className="block truncate">{nomeOsc}</span>
            <span className="text-body-sm font-normal text-text-secondary">Lote {proposta.loteCodigo}</span>
          </p>
          <p className="flex items-center gap-1 text-body-sm text-text-secondary">
            SEI <strong className="text-text-primary">{proposta.numeroSEI ?? '—'}</strong>
            {proposta.numeroSEI && <Copiar texto={proposta.numeroSEI} />}
          </p>
          <div className="min-w-36">
            <p className="text-body-sm text-text-secondary">
              <strong className="text-text-primary tabular-nums">
                {resumo.completos} de {CODIGOS_D1.length}
              </strong>{' '}
              completos
            </p>
            <div
              role="progressbar"
              aria-label="Progresso da D1"
              aria-valuemin={0}
              aria-valuemax={CODIGOS_D1.length}
              aria-valuenow={resumo.completos}
              aria-valuetext={`${resumo.completos} de ${CODIGOS_D1.length} subcritérios completos`}
              className="mt-1 h-1.5 overflow-hidden rounded-badge bg-border-default"
            >
              <div className="h-full rounded-badge bg-data-1" style={{ width: `${(resumo.completos / CODIGOS_D1.length) * 100}%` }} />
            </div>
          </div>
          <p className="text-body-sm text-text-secondary">
            D1 <strong className="text-heading-4 text-text-primary tabular-nums">{formatarNumero(resumo.previa.d1)}</strong> / {formatarNumero(resumo.previa.maximo)}
          </p>
          <p className="text-body-sm text-text-secondary">
            NF <strong className="text-heading-4 text-text-primary tabular-nums">{formatarNumero(resumo.previa.d1 + d2)}</strong> / {formatarNumero(MAXIMO_NF)}
          </p>
          <p className="flex items-center gap-2">
            <StatusBadge status={situacao} />
            {proposta.concluida && <StatusBadge status="concluida" />}
          </p>
          <IndicadorSalvamento className="ml-auto" />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {podeProjetar && <Switch rotulo="Projetar" ligado={projetar} onMudar={setProjetar} className="min-w-36" />}
          <span className="ml-auto flex gap-2">
            {anterior ? (
              <ButtonLink para={rotaAvaliar(ch, anterior, aba)} variante="secondary" tamanho="sm" icone={ArrowLeft}>
                Proposta anterior
              </ButtonLink>
            ) : null}
            {proxima ? (
              <ButtonLink para={rotaAvaliar(ch, proxima, aba)} variante="secondary" tamanho="sm" icone={ArrowRight}>
                Próxima proposta
              </ButtonLink>
            ) : null}
          </span>
        </div>
        {alertas.length > 0 && (
          <Alert tom="error" titulo="Eliminatória">
            {alertas.join('. ')}.
          </Alert>
        )}
        <AlertaErroApi erro={erroProjecao} />
      </section>

      <Tabs
        rotulo="Etapas da avaliação"
        ativa={aba}
        onMudar={mudarAba}
        abas={[
          {
            id: 'admissao',
            rotulo: 'Admissão',
            conteudo: <AbaAdmissao ch={ch} p={p} sessaoId={sessaoId} gravada={proposta.admissibilidade} motivoSomenteLeitura={motivoSemSessao(dados, 'a admissibilidade')} />,
          },
          {
            id: 'd1',
            rotulo: `D1 · ${resumo.completos}/${CODIGOS_D1.length}`,
            conteudo: (
              <AbaD1
                ch={ch}
                p={p}
                sessaoId={sessaoId}
                avaliacoes={avaliacoes}
                resumo={resumo}
                justificativaMinima={minimo}
                motivoSomenteLeitura={motivoSemAvaliacao(comAdmissao, 'níveis')}
                onFocarSubcriterio={setSubcriterio}
                acaoExcluir={(codigo) => exclusao.botao({ rota: '/api/avaliacao', ids: { chamamentoId: ch, propostaId: p, codigo }, nome: `nível do ${codigo}` })}
              />
            ),
          },
          {
            id: 'd2',
            rotulo: `D2 · ${formatarNumero(d2)}`,
            conteudo: (
              <AbaD2
                ch={ch}
                p={p}
                sessaoId={sessaoId}
                experiencias={dados.experiencias}
                d2={proposta.totais?.d2}
                dataLimite={chamamento.dataLimitePropostas}
                motivoSomenteLeitura={motivoSemAvaliacao(comAdmissao, 'experiências')}
                acaoExcluir={(e) => exclusao.botao({ rota: '/api/experiencia', ids: { chamamentoId: ch, propostaId: p, id: e.id }, nome: `experiência ${e.descricao}` })}
              />
            ),
          },
          {
            id: 'resultado',
            rotulo: 'Resultado',
            conteudo: (
              <AbaResultado
                ch={ch}
                proposta={proposta}
                avaliacoes={avaliacoes}
                experiencias={dados.experiencias}
                resultadoD2={dados.resultadoD2}
                previa={resumo.previa}
                situacao={situacao}
                justificativaMinima={minimo}
              />
            ),
          },
        ]}
      />
      {exclusao.dialogo}
    </DetailPage>
  )
}
