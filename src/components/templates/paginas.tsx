// Templates de página dentro do AppShell. Todos começam pelo PageHeader (trilha, título, descrição e ações,
// no máximo uma primária) e organizam o conteúdo em cards:
// - ListPage: lista com busca/filtros (DataTable).
// - FormPage: formulário em seções (cards), largura de leitura confortável.
// - DetailPage: resumo (termos e valores) e seções de detalhe.
// - WizardPage: etapas numeradas (aria-current="step") e conteúdo da etapa.
// - DashboardPage: indicadores e painéis.
// Cada um se identifica com data-template (a medição de design, tests/e2e/baseline.spec.ts, conta as telas sem template).

import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card } from '../ui/Card'
import { cx } from '../ui/cx'
import { Icone } from '../ui/Icone'
import { ListaDescricao } from '../ui/ListaDescricao'
import { PageHeader, type PropsPageHeader } from '../ui/PageHeader'

export function ListPage({ cabecalho, children }: { cabecalho: PropsPageHeader; children: ReactNode }) {
  return (
    <div data-template="ListPage">
      <PageHeader {...cabecalho} />
      <div className="space-y-6">{children}</div>
    </div>
  )
}

export function FormPage({ cabecalho, children }: { cabecalho: PropsPageHeader; children: ReactNode }) {
  return (
    <div data-template="FormPage">
      <PageHeader {...cabecalho} />
      <div className="max-w-4xl space-y-6">{children}</div>
    </div>
  )
}

export function DetailPage({
  cabecalho,
  resumo,
  children,
}: {
  cabecalho: PropsPageHeader
  resumo?: { termo: string; valor: ReactNode }[]
  children: ReactNode
}) {
  return (
    <div data-template="DetailPage">
      <PageHeader {...cabecalho} />
      <div className="space-y-6">
        {resumo && (
          <Card>
            <ListaDescricao itens={resumo} />
          </Card>
        )}
        {children}
      </div>
    </div>
  )
}

export function WizardPage({
  cabecalho,
  passos,
  passoAtual,
  children,
  rodape,
}: {
  cabecalho: PropsPageHeader
  passos: string[]
  /** Índice da etapa atual (0 = primeira). */
  passoAtual: number
  children: ReactNode
  rodape?: ReactNode
}) {
  return (
    <div data-template="WizardPage">
      <PageHeader {...cabecalho} />
      <ol aria-label="Etapas" className="mb-6 flex flex-wrap gap-2">
        {passos.map((passo, i) => {
          const feito = i < passoAtual
          const atual = i === passoAtual
          return (
            <li key={passo} aria-current={atual ? 'step' : undefined} className="flex items-center gap-2">
              <span
                className={cx(
                  'flex size-8 items-center justify-center rounded-badge border text-label-md',
                  atual && 'border-action-primary bg-action-primary text-text-inverse',
                  feito && 'border-status-success bg-status-success-surface text-status-success-text',
                  !atual && !feito && 'border-border-input bg-background-surface text-text-secondary',
                )}
              >
                {feito ? <Icone icone={Check} tamanho={16} rotulo="concluída" /> : i + 1}
              </span>
              <span className={cx('text-body-sm', atual ? 'font-semibold text-text-primary' : 'text-text-secondary')}>{passo}</span>
              {i < passos.length - 1 && <span aria-hidden="true" className="mx-1 h-px w-6 bg-border-strong" />}
            </li>
          )
        })}
      </ol>
      <div className="max-w-4xl space-y-6">
        {children}
        {rodape && <div className="flex flex-wrap justify-between gap-3">{rodape}</div>}
      </div>
    </div>
  )
}

export interface Indicador {
  rotulo: string
  valor: ReactNode
  descricao?: string
}

export function DashboardPage({ cabecalho, indicadores, children }: { cabecalho: PropsPageHeader; indicadores: Indicador[]; children?: ReactNode }) {
  return (
    <div data-template="DashboardPage">
      <PageHeader {...cabecalho} />
      <ul aria-label="Indicadores" className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {indicadores.map((i) => (
          <li key={i.rotulo} className="rounded-card border border-card-border bg-card-bg p-(--sds-card-padding) shadow-card">
            <p className="text-label-md text-text-secondary">{i.rotulo}</p>
            <p className="mt-1 text-heading-2 text-text-primary">{i.valor}</p>
            {i.descricao && <p className="mt-1 text-caption text-text-muted">{i.descricao}</p>}
          </li>
        ))}
      </ul>
      {children && <div className="space-y-6">{children}</div>}
    </div>
  )
}
