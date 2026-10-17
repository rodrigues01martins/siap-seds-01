// Contexto das telas de avaliação (admissibilidade, D1, D2, memória e diligências): PageHeader com a trilha,
// a OSC no título e o espelho (PDF) como ação; abaixo, faixa com nº SEI do Caderno (copiável), status e
// sessão aberta, e as abas da proposta (links com aria-current).
// O Caderno não é carregado no app: a Comissão o consulta no SEI pelo nº (decisão no CLAUDE.md).

import { collection, query, where } from 'firebase/firestore'
import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { cx } from '../../components/ui/cx'
import type { PropsPageHeader } from '../../components/ui/PageHeader'
import { Badge, StatusBadge } from '../../components/ui/StatusBadge'
import { formatarCnpj } from '../../domain/cnpj'
import { statusDaProposta } from '../../domain/statusProposta'
import { dataBr } from '../../lib/datas'
import { useConsulta, useDocumento, type ComId, type Leitura } from '../../lib/firestore'
import type { Chamamento, Osc, Proposta, Sessao } from '../../lib/tipos'
import { BotaoEspelho } from '../relatorios/BotoesRelatorio'

export interface DadosProposta {
  chamamento: ComId<Chamamento>
  proposta: ComId<Proposta>
  osc: ComId<Osc> | null
  sessaoAberta: ComId<Sessao> | null
}

/** Chamamento, proposta, OSC e a sessão aberta do chamamento, em tempo real. */
export function useDadosProposta(ch: string, p: string): Leitura<DadosProposta | null> {
  const chamamento = useDocumento<Chamamento>(`chamamentos/${ch}`)
  const proposta = useDocumento<Proposta>(`chamamentos/${ch}/propostas/${p}`)
  const osc = useDocumento<Osc>(proposta.dados ? `oscs/${proposta.dados.oscCnpj}` : null)
  const abertas = useConsulta<Sessao>(`sessoes-abertas-${ch}`, (db) =>
    query(collection(db, `chamamentos/${ch}/sessoes`), where('status', '==', 'aberta')),
  )
  const carregando = chamamento.carregando || proposta.carregando || abertas.carregando || (proposta.dados !== null && osc.carregando)
  const erro = chamamento.erro ?? proposta.erro ?? osc.erro ?? abertas.erro
  const dados =
    chamamento.dados && proposta.dados
      ? { chamamento: chamamento.dados, proposta: proposta.dados, osc: osc.dados, sessaoAberta: abertas.dados[0] ?? null }
      : null
  return { carregando, erro, dados }
}

/**
 * A Comissão só registra em sessão aberta, com a proposta na pauta (a /api exige o sessaoId): por que a tela
 * não pode registrar `oQue` (ex.: "a admissibilidade"), ou null.
 */
export function motivoSemSessao(dados: DadosProposta, oQue: string): string | null {
  if (!dados.sessaoAberta) return `Nenhuma sessão aberta: o presidente precisa abrir a sessão para registrar ${oQue}.`
  if (!dados.sessaoAberta.pauta.includes(dados.proposta.id)) return 'Proposta fora da pauta da sessão aberta.'
  return null
}

export type AbaProposta = 'admissibilidade' | 'd1' | 'd2' | 'memoria' | 'diligencias'

const ABAS: { id: AbaProposta; rotulo: string; caminho: string }[] = [
  { id: 'admissibilidade', rotulo: 'Admissibilidade', caminho: 'admissibilidade' },
  { id: 'd1', rotulo: 'Dimensão 1', caminho: 'd1' },
  { id: 'd2', rotulo: 'Dimensão 2', caminho: 'd2' },
  { id: 'memoria', rotulo: 'Memória da D2', caminho: 'd2/memoria' },
  { id: 'diligencias', rotulo: 'Diligências', caminho: 'diligencias' },
]

/** Cabeçalho da página (PageHeader) de uma tela de avaliação da proposta. */
export function cabecalhoDaProposta(dados: DadosProposta, ch: string, aba: AbaProposta, extra?: Pick<PropsPageHeader, 'acaoPrimaria' | 'acoesSecundarias'>): PropsPageHeader {
  const { chamamento, proposta, osc } = dados
  const lote = chamamento.lotes.find((l) => l.codigo === proposta.loteCodigo)
  const rotuloAba = ABAS.find((a) => a.id === aba)!.rotulo
  return {
    trilha: [
      { rotulo: 'Chamamentos', para: '/' },
      { rotulo: `Chamamento ${chamamento.numero}`, para: `/chamamentos/${ch}` },
      { rotulo: rotuloAba },
    ],
    titulo: osc?.razaoSocial ?? 'OSC',
    descricao: `Lote ${proposta.loteCodigo}${lote ? ` — ${lote.descricao}` : ''} · CNPJ ${formatarCnpj(proposta.oscCnpj)}`,
    acaoPrimaria: extra?.acaoPrimaria,
    acoesSecundarias: (
      <>
        {extra?.acoesSecundarias}
        <BotaoEspelho ch={ch} p={proposta.id} />
      </>
    ),
  }
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

/** Faixa de contexto (Caderno no SEI, status e sessão) e as abas da proposta. */
export function ContextoProposta({ dados, ch, aba }: { dados: DadosProposta; ch: string; aba: AbaProposta }) {
  const { proposta, sessaoAberta } = dados
  const base = `/chamamentos/${ch}/propostas/${proposta.id}`
  return (
    <div className="space-y-4">
      <dl className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-card border border-card-border bg-card-bg px-(--sds-card-padding) py-4">
        <div className="flex items-center gap-2">
          <dt className="text-label-md text-text-secondary">Caderno no SEI</dt>
          <dd className="flex items-center gap-1 text-body-md font-semibold text-text-primary">
            {proposta.numeroSEI ?? '—'}
            {proposta.numeroSEI && <Copiar texto={proposta.numeroSEI} />}
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="text-label-md text-text-secondary">Status</dt>
          <dd>
            <StatusBadge status={statusDaProposta(proposta)} />
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="text-label-md text-text-secondary">Sessão</dt>
          <dd>
            <Badge tom={sessaoAberta ? 'success' : 'warning'}>{sessaoAberta ? `Aberta em ${dataBr(sessaoAberta.data)}` : 'Nenhuma sessão aberta'}</Badge>
          </dd>
        </div>
      </dl>
      <nav aria-label="Abas da proposta" className="overflow-x-auto border-b border-border-default">
        <ul className="flex gap-1">
          {ABAS.map((a) => {
            const atual = a.id === aba
            return (
              <li key={a.id}>
                <Link
                  to={`${base}/${a.caminho}`}
                  aria-current={atual ? 'page' : undefined}
                  className={cx(
                    '-mb-px flex h-12 items-center border-b-2 px-4 text-label-md whitespace-nowrap transition-colors duration-fast ease-standard',
                    atual ? 'border-action-primary text-text-link' : 'border-transparent text-text-secondary hover:text-text-primary',
                  )}
                >
                  {a.rotulo}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}

/** Por que a tela está só para leitura (Alert informativo; não é erro). */
export function AvisoSomenteLeitura({ motivo }: { motivo: string | null | undefined }) {
  if (!motivo) return null
  return (
    <Alert tom="info" titulo="Somente leitura">
      {motivo}
    </Alert>
  )
}
