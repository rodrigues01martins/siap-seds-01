// Peças pequenas de interface usadas em várias telas.

import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ROTULO_STATUS, type StatusPainel } from '../domain/statusProposta'

export function Titulo({ children, acoes }: { children: ReactNode; acoes?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-xl font-semibold text-slate-900">{children}</h1>
      {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
    </div>
  )
}

export function Secao({ titulo, children, acoes }: { titulo: string; children: ReactNode; acoes?: ReactNode }) {
  return (
    <section className="mt-6">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-800">{titulo}</h2>
        {acoes}
      </div>
      {children}
    </section>
  )
}

const classeBotao = 'inline-block rounded-md border px-3 py-1.5 text-sm font-medium'

export function LinkBotao({ para, children, primario }: { para: string; children: ReactNode; primario?: boolean }) {
  return (
    <Link
      to={para}
      className={`${classeBotao} ${primario ? 'border-sky-700 bg-sky-700 text-white hover:bg-sky-800' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
    >
      {children}
    </Link>
  )
}

export function Botao({
  children,
  onClick,
  perigo,
  desabilitado,
}: {
  children: ReactNode
  onClick: () => void
  perigo?: boolean
  desabilitado?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desabilitado}
      className={`${classeBotao} disabled:opacity-50 ${perigo ? 'border-red-300 bg-white text-red-700 hover:bg-red-50' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
    >
      {children}
    </button>
  )
}

/** "Carregando…" ou a mensagem de erro da leitura; null quando os dados estão prontos. */
export function EstadoLeitura({ carregando, erro }: { carregando: boolean; erro: string | null }) {
  if (erro) {
    return (
      <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
        {erro}
      </p>
    )
  }
  return carregando ? <p className="text-slate-600">Carregando…</p> : null
}

const CORES_STATUS: Record<StatusPainel, string> = {
  pendente: 'bg-slate-100 text-slate-700',
  apta: 'bg-emerald-100 text-emerald-800',
  inapta: 'bg-amber-100 text-amber-800',
  desclassificada: 'bg-red-100 text-red-800',
  nao_admitida: 'bg-red-50 text-red-700',
  homologada: 'bg-sky-100 text-sky-800',
}

export function SeloStatus({ status }: { status: StatusPainel }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CORES_STATUS[status]}`}>
      {ROTULO_STATUS[status]}
    </span>
  )
}

/** "2026-10-31" → "31/10/2026". */
export function dataBr(iso: string | undefined): string {
  if (!iso) return '—'
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}
