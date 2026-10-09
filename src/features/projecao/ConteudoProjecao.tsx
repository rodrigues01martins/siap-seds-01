// Conteúdo do telão por tipo de foco — só leitura, fonte grande e alto contraste.
// Nada aqui grava ou oferece controle de escrita (nem checkbox: o checklist vira ✓/✗).

import type { Admissibilidade } from '../../domain/admissibilidade'
import type { ResultadoCriterio, ResultadoD2 } from '../../domain/d2'
import { formatarNumero } from '../../domain/formatacao'
import { MATRIZ_2026 } from '../../domain/matriz'
import type { TotaisProposta } from '../../domain/proposta'
import { ROTULO_STATUS, type StatusPainel } from '../../domain/statusProposta'

const ROTULO_SITUACAO = { admitida: 'Admitida', nao_admitida: 'Não admitida', desclassificada: 'Desclassificada (28.2)' }

function Titulo({ children }: { children: React.ReactNode }) {
  return <h2 className="text-4xl font-bold leading-tight text-white">{children}</h2>
}

function Aviso({ children }: { children: React.ReactNode }) {
  return <p className="mt-6 text-3xl text-amber-300">{children}</p>
}

// ---------- Admissibilidade ----------

export function ProjecaoAdmissibilidade({ admissibilidade }: { admissibilidade: Admissibilidade | null }) {
  const regras = MATRIZ_2026.admissibilidade
  if (!admissibilidade) {
    return (
      <section>
        <Titulo>Admissibilidade (Anexo III, item 28)</Titulo>
        <Aviso>Admissibilidade ainda não registrada.</Aviso>
      </section>
    )
  }
  return (
    <section className="space-y-6">
      <Titulo>Admissibilidade (Anexo III, item 28)</Titulo>
      <p className="text-3xl">
        Situação:{' '}
        <strong className={admissibilidade.situacao === 'admitida' ? 'text-emerald-300' : 'text-red-300'}>
          {ROTULO_SITUACAO[admissibilidade.situacao]}
        </strong>
      </p>
      <div className="grid gap-8 xl:grid-cols-2">
        <ul className="space-y-1 text-xl">
          {regras.requisitosEssenciais.map((r) => {
            const ok = admissibilidade.requisitos[r.codigo] !== false
            return (
              <li key={r.codigo} aria-label={`${r.codigo}: ${ok ? 'atendido' : 'não atendido'}`} className="flex gap-3">
                <span aria-hidden className={ok ? 'text-emerald-300' : 'text-red-400'}>
                  {ok ? '✓' : '✗'}
                </span>
                <span>
                  <strong className="mr-2">{r.codigo}</strong>
                  <span>{r.descricao}</span>
                </span>
              </li>
            )
          })}
        </ul>
        <table aria-label="Páginas por Plano de Ação" className="w-full text-xl">
          <thead className="text-left text-slate-300">
            <tr>
              <th className="py-1 pr-3">PA</th>
              <th className="py-1 pr-3">Páginas</th>
              <th className="py-1 pr-3 text-right">Total</th>
              <th className="py-1 pr-3 text-right">Limite</th>
              <th className="py-1 pr-3 text-right">Corte</th>
              <th className="py-1">Situação</th>
            </tr>
          </thead>
          <tbody>
            {admissibilidade.planos.map((p) => {
              const excede = p.excede > 0
              return (
                <tr
                  key={p.codigo}
                  aria-label={p.codigo}
                  data-excede={excede ? 'true' : 'false'}
                  className={`border-t border-slate-700 ${excede || p.ausente ? 'bg-red-900/60 font-semibold' : ''}`}
                >
                  <td className="py-1 pr-3">{p.codigo}</td>
                  <td className="py-1 pr-3">{p.ausente ? '—' : `${p.paginaInicial}–${p.paginaFinal}`}</td>
                  <td className="py-1 pr-3 text-right">{p.paginas ?? '—'}</td>
                  <td className="py-1 pr-3 text-right">{p.limite}</td>
                  <td className="py-1 pr-3 text-right">{p.paginaCorte ?? '—'}</td>
                  <td className="py-1">
                    {p.ausente ? 'Ausente' : excede ? `Excede em ${p.excede} página(s)` : 'Dentro do limite'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// ---------- Subcritério da D1 ----------

export interface RegistroProjetado {
  nivel: number
  justificativa: string
  paginas: number[]
  decisao: 'unanimidade' | 'maioria'
  votoDivergente?: string
}

export function ProjecaoSubcriterio({ codigo, registro }: { codigo: string; registro: RegistroProjetado | null }) {
  const plano = MATRIZ_2026.dimensao1.planos.find((p) => p.subcriterios.some((s) => s.codigo === codigo))
  const subcriterio = plano?.subcriterios.find((s) => s.codigo === codigo)
  if (!plano || !subcriterio) return <Aviso>Subcritério {codigo} não existe na matriz.</Aviso>

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xl uppercase tracking-wide text-slate-400">
          {plano.codigo} — {plano.titulo}
        </p>
        <Titulo>
          {subcriterio.codigo} — {subcriterio.titulo}
        </Titulo>
      </div>
      <div className="grid gap-8 xl:grid-cols-[2fr_3fr]">
        <div>
          <h3 className="text-2xl font-semibold text-slate-300">Elementos de avaliação</h3>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xl">
            {subcriterio.elementos.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
        <ul className="space-y-2">
          {MATRIZ_2026.dimensao1.escala.map(({ nivel, descritor }) => {
            const atual = registro?.nivel === nivel
            return (
              <li
                key={nivel}
                aria-label={`Nível ${nivel}`}
                aria-current={atual ? 'true' : undefined}
                className={`rounded-lg border-2 p-3 text-xl ${atual ? 'border-yellow-300 bg-yellow-300 text-black' : 'border-slate-700 text-slate-300'}`}
              >
                <strong className="mr-3 text-2xl">Nível {nivel}</strong>
                {atual && <span className="mr-3 rounded bg-black px-2 py-0.5 text-base font-bold text-yellow-300">Nível registrado</span>}
                <span>{descritor}</span>
              </li>
            )
          })}
        </ul>
      </div>
      {registro ? (
        <div className="space-y-2 text-2xl">
          <p>
            Decisão: <strong>{registro.decisao === 'maioria' ? 'Maioria' : 'Unanimidade'}</strong>
          </p>
          {registro.votoDivergente && (
            <p>
              Voto divergente: <span>{registro.votoDivergente}</span>
            </p>
          )}
          <p className="text-slate-300">Justificativa:</p>
          <p className="text-3xl leading-snug">{registro.justificativa}</p>
          <p>Páginas citadas: {registro.paginas.length > 0 ? registro.paginas.join(', ') : '—'}</p>
        </div>
      ) : (
        <Aviso>Aguardando registro da Comissão</Aviso>
      )}
    </section>
  )
}

// ---------- Dimensão 2 ----------

function legivel(texto: string, nomes: Record<string, string>): string {
  return Object.entries(nomes).reduce((t, [id, nome]) => t.split(id).join(nome), texto)
}

export function ProjecaoD2({ resultado, nomes }: { resultado: ResultadoD2 | null; nomes: Record<string, string> }) {
  if (!resultado) {
    return (
      <section>
        <Titulo>Dimensão 2 — Experiência da OSC</Titulo>
        <Aviso>D2 ainda não calculada.</Aviso>
      </section>
    )
  }
  const c = resultado.criterios
  const sub = c['C2.3'].subcriterios
  const linhas: [string, ResultadoCriterio][] = [
    ['2.1', c['C2.1']],
    ['2.2', c['C2.2']],
    ['2.3.1 A', sub['2.3.1'].A],
    ['2.3.1 B', sub['2.3.1'].B],
    ['2.3.2', sub['2.3.2']],
    ['2.3.3', sub['2.3.3']],
    ['2.4', c['C2.4']],
  ]
  return (
    <section className="space-y-6">
      <Titulo>Dimensão 2 — Experiência da OSC</Titulo>
      <p className="text-4xl font-bold text-yellow-300">
        D2 = {formatarNumero(resultado.total)} / {formatarNumero(resultado.maximo)}
      </p>
      <table aria-label="Pontos por critério da D2" className="w-full text-xl">
        <thead className="text-left text-slate-300">
          <tr>
            <th className="py-1 pr-4">Critério</th>
            <th className="py-1 pr-4 text-right">Pontos</th>
            <th className="py-1">Memória resumida</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map(([rotulo, r]) => {
            const usadas = (r.usadas ?? []).map((id) => nomes[id] ?? id)
            return (
              <tr key={rotulo} aria-label={`${rotulo} — ${r.titulo}`} className="border-t border-slate-700 align-top">
                <td className="py-2 pr-4">
                  <strong>{rotulo}</strong> <span className="text-slate-300">{r.titulo}</span>
                </td>
                <td className="whitespace-nowrap py-2 pr-4 text-right text-2xl font-bold">
                  {formatarNumero(r.pontos)} / {formatarNumero(r.maximo)}
                </td>
                <td className="py-2">
                  <p>{legivel(r.memoria.at(-1) ?? '', nomes)}</p>
                  <p className="text-slate-400">Experiências: {usadas.length ? usadas.join('; ') : 'nenhuma'}</p>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}

// ---------- Resumo ----------

function Bloco({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div role="group" aria-label={rotulo} className="rounded-xl border-2 border-slate-600 p-4 text-center">
      <p className="text-2xl text-slate-300">{rotulo}</p>
      <p className="break-words text-4xl font-bold leading-tight">{valor}</p>
    </div>
  )
}

export function ProjecaoResumo({ totais, status }: { totais: TotaisProposta | null; status: StatusPainel }) {
  return (
    <section className="space-y-6">
      <Titulo>Resumo da proposta</Titulo>
      {!totais ? (
        <>
          <Aviso>Avaliação ainda não iniciada.</Aviso>
          <Bloco rotulo="Status" valor={ROTULO_STATUS[status]} />
        </>
      ) : (
        <div className="grid gap-8 xl:grid-cols-[3fr_2fr]">
          <table aria-label="Pontos por Plano de Ação" className="w-full text-2xl">
            <tbody>
              {totais.totaisPorPA.map((pa) => (
                <tr key={pa.codigo} aria-label={`${pa.codigo} — ${pa.titulo}`} className="border-t border-slate-700">
                  <td className="py-2 pr-4 font-bold">{pa.codigo}</td>
                  <td className="py-2 pr-4 text-slate-300">{pa.titulo}</td>
                  <td className="whitespace-nowrap py-2 text-right font-bold">
                    {formatarNumero(pa.pontos)} / {formatarNumero(pa.maximo)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="grid grid-cols-2 gap-4">
            <Bloco rotulo="D1" valor={formatarNumero(totais.d1)} />
            <Bloco rotulo="D2" valor={formatarNumero(totais.d2)} />
            <Bloco rotulo="NF" valor={formatarNumero(totais.nf)} />
            <Bloco rotulo="Status" valor={ROTULO_STATUS[status]} />
          </div>
        </div>
      )}
    </section>
  )
}

// ---------- Sem foco ----------

export function TelaEspera({ chamamento }: { chamamento: { numero: string; titulo: string } | null }) {
  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <h1 className="text-5xl font-bold">
        {chamamento ? `Chamamento ${chamamento.numero} — ${chamamento.titulo}` : 'Comissão de Seleção'}
      </h1>
      <p className="mt-6 text-3xl text-slate-300">Aguardando a Comissão definir o item em discussão</p>
    </section>
  )
}
