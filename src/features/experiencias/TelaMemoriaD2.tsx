// /chamamentos/:ch/propostas/:p/d2/memoria — memória de cálculo da D2 gravada pela /api
// (resultadoD2/atual): por critério, pontos, faixa, experiências usadas e o cálculo passo a passo.

import { useParams } from 'react-router'
import { EstadoLeitura } from '../../componentes/basicos'
import type { ResultadoCriterio, ResultadoD2 } from '../../domain/d2'
import { formatarNumero } from '../../domain/formatacao'
import { useColecao, useDocumento } from '../../lib/firestore'
import { legivel } from '../../relatorios/memoriaD2'
import { CabecalhoProposta, useDadosProposta } from '../avaliacao/CabecalhoProposta'

function Criterio({
  resultado,
  nomes,
  nivel = 0,
}: {
  resultado: ResultadoCriterio
  nomes: Record<string, string>
  nivel?: number
}) {
  const Titulo = nivel === 0 ? 'h2' : 'h3'
  return (
    <section aria-label={`${resultado.codigo} — ${resultado.titulo}`} className={nivel === 0 ? 'rounded-lg border border-slate-200 bg-white p-4' : 'mt-3 border-l-2 border-slate-200 pl-3'}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Titulo className={nivel === 0 ? 'text-base font-semibold' : 'text-sm font-semibold'}>
          {resultado.codigo} — {resultado.titulo}
        </Titulo>
        <p className="text-sm">
          <strong>{formatarNumero(resultado.pontos)}</strong> / {formatarNumero(resultado.maximo)} pt
          {resultado.faixa && <span className="ml-2 text-slate-600">· faixa “{resultado.faixa}”</span>}
        </p>
      </div>
      <p className="mt-1 text-sm text-slate-700">
        Experiências usadas:{' '}
        {(resultado.usadas ?? []).length === 0 ? 'nenhuma' : resultado.usadas.map((id) => nomes[id] ?? id).join('; ')}
      </p>
      <ol className="mt-2 list-inside list-decimal space-y-0.5 text-sm text-slate-800">
        {resultado.memoria.map((linha, i) => (
          <li key={i}>{legivel(linha, nomes)}</li>
        ))}
      </ol>
    </section>
  )
}

export function TelaMemoriaD2() {
  const { ch = '', p = '' } = useParams()
  const leitura = useDadosProposta(ch, p)
  const resultado = useDocumento<ResultadoD2>(`chamamentos/${ch}/propostas/${p}/resultadoD2/atual`)
  const experiencias = useColecao<{ descricao?: string }>(`chamamentos/${ch}/propostas/${p}/experiencias`)

  const carregando = leitura.carregando || resultado.carregando || experiencias.carregando
  const erro = leitura.erro ?? resultado.erro ?? experiencias.erro
  if (carregando || erro) return <EstadoLeitura carregando={carregando} erro={erro} />
  if (!leitura.dados) return <p className="text-slate-600">Proposta não encontrada.</p>

  const nomes = Object.fromEntries(experiencias.dados.map((e) => [e.id, e.descricao ?? e.id]))
  const r = resultado.dados

  return (
    <>
      <CabecalhoProposta dados={leitura.dados} ch={ch} aba="memoria" />
      {!r ? (
        <p className="text-slate-600">A D2 ainda não foi calculada: cadastre ou avalie uma experiência.</p>
      ) : (
        <>
          <p className="text-lg">
            D2 = <strong>{formatarNumero(r.total)}</strong> / {formatarNumero(r.maximo)} pontos
          </p>
          <p className="text-sm text-slate-600">
            D2 = C2.1 + C2.2 + C2.3 + C2.4 (Anexo IV, 3.9). Gravada pela /api a cada alteração.
          </p>
          <div className="mt-4 space-y-4">
            <Criterio resultado={r.criterios['C2.1']} nomes={nomes} />
            <Criterio resultado={r.criterios['C2.2']} nomes={nomes} />
            <div className="rounded-lg border border-slate-200 bg-white p-4">
                <Criterio resultado={r.criterios['C2.3']} nomes={nomes} nivel={1} />
                <Criterio resultado={r.criterios['C2.3'].subcriterios['2.3.1'].A} nomes={nomes} nivel={1} />
                <Criterio resultado={r.criterios['C2.3'].subcriterios['2.3.1'].B} nomes={nomes} nivel={1} />
                <Criterio resultado={r.criterios['C2.3'].subcriterios['2.3.1']} nomes={nomes} nivel={1} />
                <Criterio resultado={r.criterios['C2.3'].subcriterios['2.3.2']} nomes={nomes} nivel={1} />
                <Criterio resultado={r.criterios['C2.3'].subcriterios['2.3.3']} nomes={nomes} nivel={1} />
            </div>
            <Criterio resultado={r.criterios['C2.4']} nomes={nomes} />
          </div>
        </>
      )}
    </>
  )
}
