// Classificação do lote: ranking por NF (src/domain/classificacao.ts, sem duplicar regra; motivos e aviso
// vêm de src/relatorios/quadroResumo.ts, os mesmos do quadro-resumo), propostas fora
// da classificação com o motivo, selo de não definitiva, desempate registrado pelo presidente (RF-27),
// homologação com confirmação dupla (C5) e reabertura (RF-18).

import { useState } from 'react'
import { AlertaErro } from '../../componentes/AlertaErro'
import { SeloStatus } from '../../componentes/basicos'
import { formatarNumero } from '../../domain/formatacao'
import { MATRIZ_2026 } from '../../domain/matriz'
import { ROTULO_STATUS, statusDaProposta } from '../../domain/statusProposta'
import { esquemaDesempate, esquemaReabrir } from '../../esquemas/resultado'
import {
  ROTULO_FORA,
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

const PLANOS = MATRIZ_2026.dimensao1.planos
const CRITERIOS_DESEMPATE = new Map(MATRIZ_2026.desempate.map((c) => [c.ordem, `${c.ordem} – ${c.descricao}`]))
const mesmoConjunto = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x))
const classeAcao = 'rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium hover:bg-slate-50'

function DialogoHomologar({ proposta, onConfirmar, onFechar }: { proposta: LinhaClassificacao; onConfirmar: () => Promise<void>; onFechar: () => void }) {
  const [conferido, setConferido] = useState(false)
  const [erro, setErro] = useState<unknown>(null)
  const status = statusDaProposta(proposta)
  return (
    <div role="dialog" aria-label={`Homologar ${proposta.nomeOsc}`} className="space-y-3 rounded-lg border-2 border-sky-600 bg-sky-50 p-4 text-sm">
      <p className="font-semibold">Homologar {proposta.nomeOsc}?</p>
      <p>
        NF {formatarNumero(proposta.totais?.nf ?? 0)} · Status: {ROTULO_STATUS[status]}
      </p>
      <p className="text-slate-600">Depois de homologada, a proposta fica somente leitura em todas as telas (só a reabertura desfaz).</p>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={conferido} onChange={(e) => setConferido(e.target.checked)} />
        Conferi a NF e o status desta proposta
      </label>
      <AlertaErro erro={erro} />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!conferido}
          onClick={async () => {
            setErro(null)
            try {
              await onConfirmar()
              onFechar()
            } catch (e) {
              setErro(e)
            }
          }}
          className="rounded-md bg-sky-700 px-3 py-1.5 font-medium text-white disabled:opacity-50"
        >
          Confirmar homologação
        </button>
        <button type="button" onClick={onFechar} className={classeAcao}>
          Cancelar
        </button>
      </div>
    </div>
  )
}

function DialogoTexto({
  rotulo,
  campo,
  botao,
  esquema,
  onConfirmar,
  onFechar,
  children,
}: {
  rotulo: string
  campo: string
  botao: string
  esquema: { safeParse: (v: unknown) => { success: boolean; error?: { issues: { message: string }[] } } }
  onConfirmar: (texto: string) => Promise<void>
  onFechar: () => void
  children?: React.ReactNode
}) {
  const [texto, setTexto] = useState('')
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [erro, setErro] = useState<unknown>(null)
  const id = `${rotulo}-${campo}`.replace(/\s+/g, '-')
  return (
    <div role="dialog" aria-label={rotulo} className="space-y-3 rounded-lg border-2 border-amber-500 bg-amber-50 p-4 text-sm">
      <p className="font-semibold">{rotulo}</p>
      {children}
      <div>
        <label htmlFor={id} className="block font-medium">
          {campo}
        </label>
        <textarea id={id} rows={3} value={texto} onChange={(e) => setTexto(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
        {mensagem && <p className="mt-1 text-red-700">{mensagem}</p>}
      </div>
      <AlertaErro erro={erro} />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={async () => {
            const r = esquema.safeParse(texto)
            if (!r.success) {
              setMensagem(r.error?.issues[0]?.message ?? 'Valor inválido.')
              return
            }
            setMensagem(null)
            setErro(null)
            try {
              await onConfirmar(texto.trim())
              onFechar()
            } catch (e) {
              setErro(e)
            }
          }}
          className="rounded-md bg-amber-700 px-3 py-1.5 font-medium text-white"
        >
          {botao}
        </button>
        <button type="button" onClick={onFechar} className={classeAcao}>
          Cancelar
        </button>
      </div>
    </div>
  )
}

function OrdemDesempate({ ordem, nomes, onMudar }: { ordem: string[]; nomes: Map<string, string>; onMudar: (nova: string[]) => void }) {
  const mover = (i: number, delta: number) => {
    const nova = [...ordem]
    ;[nova[i], nova[i + delta]] = [nova[i + delta]!, nova[i]!]
    onMudar(nova)
  }
  return (
    <ol className="list-inside list-decimal space-y-1">
      {ordem.map((id, i) => (
        <li key={id}>
          <span className="mr-2">{nomes.get(id)}</span>
          <button type="button" aria-label={`Subir ${nomes.get(id)}`} disabled={i === 0} onClick={() => mover(i, -1)} className={classeAcao}>
            ↑
          </button>{' '}
          <button type="button" aria-label={`Descer ${nomes.get(id)}`} disabled={i === ordem.length - 1} onClick={() => mover(i, 1)} className={classeAcao}>
            ↓
          </button>
        </li>
      ))}
    </ol>
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
  return (
    <DialogoTexto
      rotulo={`Desempate — NF ${formatarNumero(nf)}`}
      campo="Justificativa"
      botao="Registrar decisão"
      esquema={esquemaDesempate.shape.justificativa}
      onConfirmar={(justificativa) => onConfirmar(ordem, justificativa)}
      onFechar={onFechar}
    >
      <p className="text-slate-700">
        Os critérios do Edital (I a VI) não resolveram este empate. Registre a ordem decidida pela Comissão (RF-27). A 1ª fica com a melhor posição.
      </p>
      <OrdemDesempate ordem={ordem} nomes={nomes} onMudar={setOrdem} />
    </DialogoTexto>
  )
}

export function TabelaClassificacao({
  lote,
  propostas,
  decisoes,
  podeHomologar,
  podeDesempatar,
  podeReabrir,
  onHomologar,
  onDesempatar,
  onReabrir,
}: Props) {
  const [dialogo, setDialogo] = useState<Dialogo>(null)
  const porId = new Map(propostas.map((p) => [p.id, p]))
  const nomes = new Map(propostas.map((p) => [p.id, p.nomeOsc]))
  const r = classificarPropostas(propostas, decisoes)
  const decisaoDo = (nf: number, ids: string[]) => decisoes.find((d) => d.nf === nf && mesmoConjunto(d.propostas, ids))
  const aviso = avisoNaoDefinitiva(r)

  const acoes = (p: LinhaClassificacao) =>
    p.bloqueada ? (
      podeReabrir && (
        <button type="button" className={classeAcao} onClick={() => setDialogo({ tipo: 'reabrir', id: p.id })}>
          Reabrir
        </button>
      )
    ) : (
      podeHomologar &&
      p.totais &&
      p.totais.status !== 'pendente' && (
        <button type="button" className={classeAcao} onClick={() => setDialogo({ tipo: 'homologar', id: p.id })}>
          Homologar
        </button>
      )
    )

  const fora = propostasFora(r).map(({ id, situacao }) => ({ p: porId.get(id)!, situacao }))

  return (
    <div className="space-y-6">
      {aviso && (
        <p role="status" aria-label="Classificação não definitiva" className="rounded-md border-2 border-amber-500 bg-amber-50 p-3 text-sm font-medium text-amber-900">
          {aviso}
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table aria-label={`Classificação do lote ${lote.codigo}`} className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              {['Posição', 'OSC', ...PLANOS.map((p) => p.codigo), 'D1', 'D2', 'NF', 'Status', ...(podeHomologar || podeReabrir ? ['Ações'] : [])].map((t) => (
                <th key={t} scope="col" className="whitespace-nowrap px-2 py-2 font-medium">
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {r.ranking.length === 0 && (
              <tr>
                <td colSpan={12} className="px-3 py-4 text-slate-500">
                  Nenhuma proposta apta com avaliação completa.
                </td>
              </tr>
            )}
            {r.ranking.map((pos) => {
              const p = porId.get(pos.id)!
              return (
                <tr key={pos.id} aria-label={p.nomeOsc} className="border-t border-slate-100">
                  <td className="px-2 py-2 text-lg font-bold">{pos.posicao}º</td>
                  <td className="px-2 py-2 font-medium">{p.nomeOsc}</td>
                  {PLANOS.map((pa, i) => (
                    <td key={pa.codigo} className="px-2 py-2 text-right">
                      {formatarNumero(p.totais?.totaisPorPA[i]?.pontos ?? 0)}
                    </td>
                  ))}
                  <td className="px-2 py-2 text-right">{formatarNumero(pos.d1)}</td>
                  <td className="px-2 py-2 text-right">{formatarNumero(pos.d2)}</td>
                  <td className="px-2 py-2 text-right font-bold">{formatarNumero(pos.nf)}</td>
                  <td className="space-x-1 px-2 py-2">
                    <SeloStatus status={statusDaProposta(p)} />
                    {pos.empatada && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">Empatada</span>}
                    {pos.desempatadaPelaComissao && (
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-900">Desempate da Comissão</span>
                    )}
                    {pos.desempatadaPeloEdital && (
                      <span
                        title={CRITERIOS_DESEMPATE.get(pos.criterioDesempate ?? '')}
                        className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-900"
                      >
                        Desempate pelo Edital (critério {pos.criterioDesempate})
                      </span>
                    )}
                  </td>
                  {(podeHomologar || podeReabrir) && <td className="px-2 py-2">{acoes(p)}</td>}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {r.empates.length > 0 && (
        <section className="space-y-2 text-sm">
          <h2 className="text-base font-semibold">Empates não resolvidos pelos critérios do Edital (RF-27)</h2>
          {r.empates.map((e) => {
            const decisao = e.decidido ? decisaoDo(e.nf, e.ids) : undefined
            return (
              <div key={`${e.nf}-${e.ids.join('-')}`} className="rounded-md border border-slate-200 bg-white p-3">
                <p>
                  NF {formatarNumero(e.nf)}: {e.ids.map((id) => nomes.get(id)).join(', ')} —{' '}
                  {decisao ? (
                    <span>
                      decisão da Comissão: {decisao.ordem.map((id) => nomes.get(id)).join(' > ')}. Justificativa: {decisao.justificativa}
                    </span>
                  ) : (
                    <span className="font-medium text-amber-800">sem decisão registrada</span>
                  )}
                </p>
                {podeDesempatar && !e.decidido && (
                  <button type="button" className={`${classeAcao} mt-2`} onClick={() => setDialogo({ tipo: 'desempate', nf: e.nf, ids: e.ids })}>
                    Registrar desempate (NF {formatarNumero(e.nf)})
                  </button>
                )}
              </div>
            )
          })}
        </section>
      )}

      {dialogo?.tipo === 'homologar' && (
        <DialogoHomologar proposta={porId.get(dialogo.id)!} onConfirmar={() => onHomologar(dialogo.id)} onFechar={() => setDialogo(null)} />
      )}
      {dialogo?.tipo === 'reabrir' && (
        <DialogoTexto
          rotulo={`Reabrir ${nomes.get(dialogo.id)}`}
          campo="Motivo"
          botao="Confirmar reabertura"
          esquema={esquemaReabrir.shape.motivo}
          onConfirmar={(motivo) => onReabrir(dialogo.id, motivo)}
          onFechar={() => setDialogo(null)}
        >
          <p className="text-slate-700">A proposta volta a aceitar avaliação (RF-18). O motivo fica registrado e auditado.</p>
        </DialogoTexto>
      )}
      {dialogo?.tipo === 'desempate' && (
        <DialogoDesempate nf={dialogo.nf} ids={dialogo.ids} nomes={nomes} onConfirmar={onDesempatar} onFechar={() => setDialogo(null)} />
      )}

      {fora.length > 0 && (
        <section>
          <h2 className="mb-2 text-base font-semibold">Fora da classificação</h2>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table aria-label="Fora da classificação" className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  {['OSC', 'Situação', 'Motivo', 'NF', ...(podeHomologar || podeReabrir ? ['Ações'] : [])].map((t) => (
                    <th key={t} scope="col" className="px-2 py-2 font-medium">
                      {t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fora.map(({ p, situacao }) => (
                  <tr key={p.id} aria-label={p.nomeOsc} className="border-t border-slate-100 align-top">
                    <td className="px-2 py-2 font-medium">{p.nomeOsc}</td>
                    <td className="px-2 py-2">
                      {ROTULO_FORA[situacao]}
                      {p.bloqueada && <span className="ml-1 text-xs text-sky-800">(homologada)</span>}
                    </td>
                    <td className="px-2 py-2 text-slate-700">{motivoFora(p, situacao)}</td>
                    <td className="px-2 py-2 text-right">{p.totais ? formatarNumero(p.totais.nf) : '—'}</td>
                    {(podeHomologar || podeReabrir) && <td className="px-2 py-2">{situacao !== 'pendente' && acoes(p)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
