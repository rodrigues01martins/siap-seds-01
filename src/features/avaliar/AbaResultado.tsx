// Aba Resultado: totais por PA e D1, critérios da D2 com a memória de cálculo resumida (expansível), NF, status,
// eliminatórias, Concluir / Desfazer conclusão (reversível, sem justificativa; o que falta para concluir aparece
// antes) e "Gerar espelho" (PDF no navegador; MINUTA se a proposta não estiver concluída).

import { CircleCheck, Undo2 } from 'lucide-react'
import { useState } from 'react'
import { Alert } from '../../components/ui/Alert'
import { AlertaErroApi } from '../../components/ui/AlertaErroApi'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { problemasParaConcluir } from '../../domain/conclusao'
import { CRITERIOS_D2, type ResultadoD2 } from '../../domain/d2'
import type { ResultadoD1 } from '../../domain/d1'
import { formatarNumero } from '../../domain/formatacao'
import { MATRIZ_2026 } from '../../domain/matriz'
import type { SituacaoProposta } from '../../domain/situacaoProposta'
import { chamarApi } from '../../lib/api'
import type { Avaliacao, ExperienciaGravada, Proposta } from '../../lib/tipos'
import { legivel, memoriaExibida } from '../../relatorios/memoriaD2'
import { BotaoEspelho } from '../relatorios/BotoesRelatorio'
import { eliminatorias } from './valores'

interface Props {
  ch: string
  proposta: { id: string } & Proposta
  avaliacoes: ({ id: string } & Avaliacao)[]
  experiencias: ExperienciaGravada[]
  resultadoD2: ResultadoD2 | null
  previa: ResultadoD1
  situacao: SituacaoProposta
  justificativaMinima?: number
}

const pts = (n: number | undefined, max: number) => `${n === undefined ? '—' : formatarNumero(n)} / ${formatarNumero(max)}`

export function AbaResultado({ ch, proposta, avaliacoes, experiencias, resultadoD2, previa, situacao, justificativaMinima }: Props) {
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<unknown>(null)
  const nomes = Object.fromEntries(experiencias.map((e) => [e.id, e.descricao]))
  const d2 = resultadoD2?.total ?? proposta.totais?.d2 ?? 0
  const nf = previa.d1 + d2
  const problemas = problemasParaConcluir(
    { admissibilidade: proposta.admissibilidade ?? null, avaliacoes: avaliacoes.map((a) => ({ codigo: a.id, nivel: a.nivel, justificativa: a.justificativa })) },
    { justificativaMinima },
  )

  async function concluir(acao: 'concluir' | 'desfazer') {
    setErro(null)
    setEnviando(true)
    try {
      await chamarApi('/api/concluir', { metodo: 'POST', corpo: { chamamentoId: ch, propostaId: proposta.id, acao } })
    } catch (e) {
      setErro(e)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="space-y-6">
      <section aria-label="Nota final" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['D1', pts(previa.d1, MATRIZ_2026.dimensao1.maximo)],
          ['D2', pts(d2, MATRIZ_2026.dimensao2.maximo)],
          ['Nota final (NF = D1 + D2)', pts(nf, MATRIZ_2026.dimensao1.maximo + MATRIZ_2026.dimensao2.maximo)],
        ].map(([termo, valor]) => (
          <div key={termo} className="rounded-card border border-card-border bg-card-bg p-(--sds-card-padding) shadow-card">
            <p className="text-label-md text-text-secondary">{termo}</p>
            <p className="mt-1 text-heading-2 text-text-primary tabular-nums">{valor}</p>
          </div>
        ))}
        <div className="rounded-card border border-card-border bg-card-bg p-(--sds-card-padding) shadow-card">
          <p className="text-label-md text-text-secondary">Status</p>
          <p className="mt-2 flex flex-wrap gap-2">
            <StatusBadge status={situacao} />
            {proposta.concluida && <StatusBadge status="concluida" />}
          </p>
        </div>
      </section>

      {eliminatorias(previa).length > 0 && (
        <Alert tom="error" titulo="Eliminatórias">
          {eliminatorias(previa).join('. ')}.
        </Alert>
      )}

      <Card titulo="Conclusão" descricao="Concluída, a proposta sai como final nos relatórios. Alterar a avaliação desfaz a conclusão.">
        <div className="space-y-3">
          {!proposta.concluida && problemas.length > 0 && (
            <Alert tom="warning" titulo="Falta para concluir">
              <ul className="list-inside list-disc">
                {problemas.map((p) => (
                  <li key={p}>{p.charAt(0).toUpperCase() + p.slice(1)}.</li>
                ))}
              </ul>
            </Alert>
          )}
          <div className="flex flex-wrap gap-3">
            {proposta.concluida ? (
              <Button variante="secondary" icone={Undo2} carregando={enviando} onClick={() => void concluir('desfazer')}>
                Desfazer conclusão
              </Button>
            ) : (
              <Button icone={CircleCheck} carregando={enviando} desabilitado={problemas.length > 0} onClick={() => void concluir('concluir')}>
                Concluir
              </Button>
            )}
            <BotaoEspelho ch={ch} p={proposta.id} rotulo="Gerar espelho" />
          </div>
          <AlertaErroApi erro={erro} />
        </div>
      </Card>

      <Card titulo="Dimensão 1 por Plano de Ação">
        <div className="relative overflow-x-auto">
          <table aria-label="Totais por Plano de Ação" className="w-full border-collapse text-left text-body-sm">
            <thead className="bg-table-header-bg text-table-header-fg">
              <tr>
                {['Plano de Ação', 'Avaliados', 'Pontos'].map((t) => (
                  <th key={t} scope="col" className="h-(--sds-table-header-height) px-3 text-label-md">
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previa.totaisPorPA.map((t) => (
                <tr key={t.codigo} className="border-b border-table-border">
                  <th scope="row" className="px-3 py-2 text-left font-normal text-text-primary">
                    <strong>{t.codigo}</strong> — {t.titulo}
                  </th>
                  <td className="px-3 py-2 tabular-nums">
                    {t.avaliados} de {t.quantidade}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{pts(t.pontos, t.maximo)}</td>
                </tr>
              ))}
              <tr>
                <th scope="row" className="px-3 py-2 text-left text-label-md text-text-primary">
                  D1
                </th>
                <td className="px-3 py-2" />
                <td className="px-3 py-2 text-label-md tabular-nums">{pts(previa.d1, previa.maximo)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card titulo="Dimensão 2 — critérios" descricao="Memória de cálculo gravada pela /api a cada alteração (Anexo IV, 3.9).">
        {!resultadoD2 ? (
          <p className="text-body-md text-text-secondary">A D2 ainda não foi calculada: cadastre uma experiência.</p>
        ) : (
          <ul className="divide-y divide-border-default">
            {CRITERIOS_D2.map((c) => {
              const r = resultadoD2.criterios[c]
              return (
                <li key={c} className="py-3">
                  <details>
                    <summary className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="flex-1 text-label-md text-text-primary">
                        {r.codigo} — {r.titulo}
                      </span>
                      <span className="text-body-sm text-text-secondary">{r.faixa ? `“${r.faixa}”` : 'sem faixa'}</span>
                      <strong className="tabular-nums">{pts(r.pontos, r.maximo)}</strong>
                    </summary>
                    <ol className="mt-2 list-inside list-decimal space-y-1 text-body-sm text-text-secondary">
                      {memoriaExibida(r).map((linha, i) => (
                        <li key={i}>{legivel(linha, nomes)}</li>
                      ))}
                    </ol>
                  </details>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}
