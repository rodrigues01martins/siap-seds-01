// Conteúdo do telão por tipo de foco — só leitura, tema de projeção (fundo neutral.0, texto neutral.950,
// nível registrado em action.primary) e tipografia display-lg/display-md para leitura a 6 m.
// Nada aqui grava ou oferece controle de escrita (nem checkbox: o checklist vira ✓/✗ com texto).

import type { Admissibilidade } from '../../domain/admissibilidade'
import type { ResultadoCriterio, ResultadoD2 } from '../../domain/d2'
import { formatarNumero } from '../../domain/formatacao'
import { MATRIZ_2026 } from '../../domain/matriz'
import type { TotaisProposta } from '../../domain/proposta'
import { ROTULO_STATUS, type StatusPainel } from '../../domain/statusProposta'

const ROTULO_SITUACAO = { admitida: 'Admitida', nao_admitida: 'Não admitida', desclassificada: 'Desclassificada (28.2)' }

function Titulo({ children }: { children: React.ReactNode }) {
  return <h2 className="text-display-lg text-projecao-fg">{children}</h2>
}

function Aviso({ children }: { children: React.ReactNode }) {
  return <p className="mt-6 inline-block rounded-card border-l-8 border-status-warning bg-projecao-atencao-bg px-6 py-4 text-display-md text-projecao-atencao">{children}</p>
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
      <p className="text-display-md">
        Situação:{' '}
        <strong className={admissibilidade.situacao === 'admitida' ? 'text-projecao-positivo' : 'text-projecao-negativo'}>
          {ROTULO_SITUACAO[admissibilidade.situacao]}
        </strong>
      </p>
      <div className="grid gap-8 xl:grid-cols-2">
        <ul className="space-y-2 text-heading-2 font-normal">
          {regras.requisitosEssenciais.map((r) => {
            const ok = admissibilidade.requisitos[r.codigo] !== false
            return (
              <li key={r.codigo} aria-label={`${r.codigo}: ${ok ? 'atendido' : 'não atendido'}`} className="flex gap-3">
                <span aria-hidden className={`font-bold ${ok ? 'text-projecao-positivo' : 'text-projecao-negativo'}`}>
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
        <table aria-label="Páginas por Plano de Ação" className="w-full text-heading-2 font-normal">
          <thead className="text-left text-projecao-fg-secundario">
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
                  className={`border-t-2 border-projecao-borda ${excede || p.ausente ? 'bg-projecao-atencao-bg font-bold text-projecao-negativo' : ''}`}
                >
                  <td className="py-1 pr-3">{p.codigo}</td>
                  <td className="py-1 pr-3">{p.ausente ? '—' : `${p.paginaInicial}–${p.paginaFinal}`}</td>
                  <td className="py-1 pr-3 text-right">{p.paginas ?? '—'}</td>
                  <td className="py-1 pr-3 text-right">{p.limite}</td>
                  <td className="py-1 pr-3 text-right">{p.paginaCorte ?? '—'}</td>
                  <td className="py-1">
                    {p.ausente ? '✗ Ausente' : excede ? `⚠ Excede em ${p.excede} página(s)` : '✓ Dentro do limite'}
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
        <p className="text-heading-2 font-normal text-projecao-fg-secundario">
          {plano.codigo} — {plano.titulo}
        </p>
        <Titulo>
          {subcriterio.codigo} — {subcriterio.titulo}
        </Titulo>
      </div>
      <div className="grid gap-8 xl:grid-cols-[2fr_3fr]">
        <div>
          <h3 className="text-heading-1 text-projecao-fg">Elementos de avaliação</h3>
          <ul className="mt-3 list-inside list-disc space-y-2 text-heading-2 font-normal">
            {subcriterio.elementos.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
        <ul className="space-y-3">
          {MATRIZ_2026.dimensao1.escala.map(({ nivel, descritor }) => {
            const atual = registro?.nivel === nivel
            return (
              <li
                key={nivel}
                aria-label={`Nível ${nivel}`}
                aria-current={atual ? 'true' : undefined}
                className={`rounded-card border-4 p-4 text-heading-2 font-normal ${atual ? 'border-projecao-destaque-bg bg-projecao-destaque-bg text-projecao-destaque-fg' : 'border-projecao-borda text-projecao-fg'}`}
              >
                <strong className="mr-3 text-display-md">Nível {nivel}</strong>
                {atual && <span className="mr-3 rounded-badge bg-projecao-destaque-fg px-3 py-1 text-heading-3 text-projecao-destaque-bg"><span aria-hidden="true">✓ </span>Nível registrado</span>}
                <span>{descritor}</span>
              </li>
            )
          })}
        </ul>
      </div>
      {registro ? (
        <div className="space-y-3 text-heading-1 font-normal">
          <p>
            Decisão: <strong>{registro.decisao === 'maioria' ? 'Maioria' : 'Unanimidade'}</strong>
          </p>
          {registro.votoDivergente && (
            <p>
              Voto divergente: <span>{registro.votoDivergente}</span>
            </p>
          )}
          <p className="text-projecao-fg-secundario">Justificativa:</p>
          <p className="text-display-md font-normal">{registro.justificativa}</p>
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
      <p className="inline-block rounded-card bg-projecao-destaque-bg px-6 py-3 text-display-lg text-projecao-destaque-fg">
        D2 = {formatarNumero(resultado.total)} / {formatarNumero(resultado.maximo)}
      </p>
      <table aria-label="Pontos por critério da D2" className="w-full text-heading-2 font-normal">
        <thead className="text-left text-projecao-fg-secundario">
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
              <tr key={rotulo} aria-label={`${rotulo} — ${r.titulo}`} className="border-t-2 border-projecao-borda align-top">
                <td className="py-2 pr-4">
                  <strong>{rotulo}</strong> <span className="text-projecao-fg-secundario">{r.titulo}</span>
                </td>
                <td className="whitespace-nowrap py-2 pr-4 text-right text-heading-1">
                  {formatarNumero(r.pontos)} / {formatarNumero(r.maximo)}
                </td>
                <td className="py-2">
                  <p>{legivel(r.memoria.at(-1) ?? '', nomes)}</p>
                  <p className="text-projecao-fg-secundario">Experiências: {usadas.length ? usadas.join('; ') : 'nenhuma'}</p>
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
    <div role="group" aria-label={rotulo} className="rounded-card border-4 border-projecao-borda p-4 text-center">
      <p className="text-heading-1 text-projecao-fg-secundario">{rotulo}</p>
      <p className="break-words text-display-lg">{valor}</p>
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
          <table aria-label="Pontos por Plano de Ação" className="w-full text-heading-1 font-normal">
            <tbody>
              {totais.totaisPorPA.map((pa) => (
                <tr key={pa.codigo} aria-label={`${pa.codigo} — ${pa.titulo}`} className="border-t-2 border-projecao-borda">
                  <td className="py-2 pr-4 font-bold">{pa.codigo}</td>
                  <td className="py-2 pr-4 text-projecao-fg-secundario">{pa.titulo}</td>
                  <td className="whitespace-nowrap py-2 text-right font-bold">
                    {formatarNumero(pa.pontos)} / {formatarNumero(pa.maximo)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="grid grid-cols-2 gap-4 self-start">
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
      <h1 className="text-display-lg text-projecao-fg">
        {chamamento ? `Chamamento ${chamamento.numero} — ${chamamento.titulo}` : 'Comissão de Seleção'}
      </h1>
      <p className="mt-6 text-display-md font-normal text-projecao-fg-secundario">Aguardando a Comissão definir o item em discussão</p>
    </section>
  )
}
