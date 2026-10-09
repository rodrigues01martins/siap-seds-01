// Cabeçalho fixo das telas de avaliação: OSC, lote, nº SEI do Caderno (copiável), sessão aberta e status.
// O Caderno não é carregado no app: a Comissão o consulta no SEI pelo nº (decisão no CLAUDE.md).

import { collection, query, where } from 'firebase/firestore'
import { useState } from 'react'
import { Link } from 'react-router'
import { SeloStatus, dataBr } from '../../componentes/basicos'
import { formatarCnpj } from '../../domain/cnpj'
import { statusDaProposta } from '../../domain/statusProposta'
import { useConsulta, useDocumento, type ComId, type Leitura } from '../../lib/firestore'
import type { Chamamento, Osc, Proposta, Sessao } from '../../lib/tipos'

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

function Copiar({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard?.writeText(texto)
        setCopiado(true)
        setTimeout(() => setCopiado(false), 1500)
      }}
      className="ml-2 rounded border border-slate-300 px-1.5 text-xs hover:bg-slate-100"
      aria-label={`Copiar nº SEI ${texto}`}
    >
      {copiado ? 'Copiado' : 'Copiar'}
    </button>
  )
}

export function CabecalhoProposta({ dados, ch, aba }: { dados: DadosProposta; ch: string; aba: 'admissibilidade' | 'd1' | 'd2' | 'memoria' | 'diligencias' }) {
  const { chamamento, proposta, osc, sessaoAberta } = dados
  const lote = chamamento.lotes.find((l) => l.codigo === proposta.loteCodigo)
  const base = `/chamamentos/${ch}/propostas/${proposta.id}`
  const abas = [
    { id: 'admissibilidade', rotulo: 'Admissibilidade', para: `${base}/admissibilidade` },
    { id: 'd1', rotulo: 'Dimensão 1', para: `${base}/d1` },
    { id: 'd2', rotulo: 'Dimensão 2', para: `${base}/d2` },
    { id: 'memoria', rotulo: 'Memória da D2', para: `${base}/d2/memoria` },
    { id: 'diligencias', rotulo: 'Diligências', para: `${base}/diligencias` },
  ]
  return (
    <header className="sticky top-0 z-10 -mx-6 -mt-6 mb-4 border-b border-slate-200 bg-white/95 px-6 py-3 backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500">
            <Link to={`/chamamentos/${ch}`} className="underline">
              Chamamento {chamamento.numero}
            </Link>{' '}
            · Lote {proposta.loteCodigo}
            {lote ? ` — ${lote.descricao}` : ''}
          </p>
          <h1 className="text-lg font-semibold text-slate-900">
            {osc?.razaoSocial ?? 'OSC'} <span className="text-sm font-normal text-slate-500">{formatarCnpj(proposta.oscCnpj)}</span>
          </h1>
          <p className="text-sm text-slate-700">
            Caderno no SEI: <strong>{proposta.numeroSEI ?? '—'}</strong>
            {proposta.numeroSEI && <Copiar texto={proposta.numeroSEI} />}
          </p>
        </div>
        <div className="text-right text-sm">
          <p>
            Status: <SeloStatus status={statusDaProposta(proposta)} />
          </p>
          <p className={sessaoAberta ? 'text-emerald-800' : 'text-amber-800'}>
            {sessaoAberta ? `Sessão aberta de ${dataBr(sessaoAberta.data)}` : 'Nenhuma sessão aberta'}
          </p>
        </div>
      </div>
      <nav aria-label="Abas da proposta" className="mt-2 flex gap-4 text-sm">
        {abas.map((a) => (
          <Link
            key={a.id}
            to={a.para}
            aria-current={a.id === aba ? 'page' : undefined}
            className={a.id === aba ? 'border-b-2 border-sky-700 font-semibold text-sky-800' : 'text-slate-600 hover:text-slate-900'}
          >
            {a.rotulo}
          </Link>
        ))}
      </nav>
    </header>
  )
}
