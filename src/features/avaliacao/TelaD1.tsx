// /chamamentos/:ch/propostas/:p/d1 — avaliação da D1: navegação PA1…PA6 → subcritérios (preenchido/pendente
// e soma parcial), painel do subcritério e rodapé com a prévia (src/domain) e o status oficial (/api).
// Presidente e relator controlam o telão daqui (ControleProjecao, Etapa 5).

import { useState } from 'react'
import { useParams } from 'react-router'
import { AlertaErro } from '../../componentes/AlertaErro'
import { EstadoLeitura, SeloStatus } from '../../componentes/basicos'
import { calcularD1 } from '../../domain/d1'
import { formatarNumero } from '../../domain/formatacao'
import { MATRIZ_2026 } from '../../domain/matriz'
import { podeFazer } from '../../domain/permissoes'
import { statusDaProposta } from '../../domain/statusProposta'
import { chamarApi } from '../../lib/api'
import { useColecao } from '../../lib/firestore'
import type { Avaliacao } from '../../lib/tipos'
import { useUsuario } from '../auth/useUsuario'
import { CabecalhoProposta, useDadosProposta, type DadosProposta } from './CabecalhoProposta'
import { ControleProjecao, type PedidoProjecao } from './ControleProjecao'
import { PainelSubcriterio } from './PainelSubcriterio'

const PLANOS = MATRIZ_2026.dimensao1.planos
const CODIGOS = PLANOS.flatMap((p) => p.subcriterios.map((s) => s.codigo))

/** Por que a tela está só para leitura (null = pode registrar). */
export function motivoSomenteLeituraD1(
  dados: DadosProposta,
  podeRegistrar: boolean,
): string | null {
  if (dados.proposta.bloqueada) return 'Proposta homologada: somente leitura.'
  const admissao = dados.proposta.admissibilidade?.situacao
  if (admissao === 'nao_admitida' || admissao === 'desclassificada') {
    return 'Proposta não admitida (Anexo III, item 28): não segue para avaliação.'
  }
  if (!podeRegistrar) return 'Seu perfil consulta a avaliação, mas não registra níveis.'
  if (!dados.sessaoAberta) return 'Nenhuma sessão aberta: o presidente precisa abrir a sessão para registrar níveis.'
  if (!dados.sessaoAberta.pauta.includes(dados.proposta.id)) return 'Proposta fora da pauta da sessão aberta.'
  return null
}

export function TelaD1() {
  const { ch = '', p = '' } = useParams()
  const { usuario } = useUsuario()
  const leitura = useDadosProposta(ch, p)
  const avaliacoes = useColecao<Avaliacao>(`chamamentos/${ch}/propostas/${p}/avaliacoes`)
  const [escolhido, setEscolhido] = useState<string | null>(null)
  const [erroProjecao, setErroProjecao] = useState<unknown>(null)

  const carregando = leitura.carregando || avaliacoes.carregando
  const erro = leitura.erro ?? avaliacoes.erro
  if (carregando || erro) return <EstadoLeitura carregando={carregando} erro={erro} />
  if (!leitura.dados) return <p className="text-slate-600">Proposta não encontrada.</p>

  const dados = leitura.dados
  const registros = new Map(avaliacoes.dados.map((a) => [a.id, a]))
  const previa = calcularD1(Object.fromEntries(avaliacoes.dados.map((a) => [a.id, a.nivel])))
  const atual = escolhido ?? previa.pendentes[0] ?? CODIGOS[0]!
  const motivo = motivoSomenteLeituraD1(dados, podeFazer(usuario?.perfil ?? null, 'nivelD1'))
  const sessao = dados.sessaoAberta
  const podeProjetar = sessao !== null && sessao.pauta.includes(p) && podeFazer(usuario?.perfil ?? null, 'sessaoConduzir')
  async function projetar(pedido: PedidoProjecao) {
    setErroProjecao(null)
    try {
      await chamarApi('/api/sessao', {
        metodo: 'PATCH',
        corpo: { chamamentoId: ch, sessaoId: sessao!.id, acao: 'foco', foco: { ...pedido, propostaId: p } },
      })
    } catch (e) {
      setErroProjecao(e)
    }
  }
  const proximoPendente = (depoisDe: string) =>
    CODIGOS.slice(CODIGOS.indexOf(depoisDe) + 1).find((c) => !registros.has(c)) ?? previa.pendentes.find((c) => c !== depoisDe)

  return (
    <>
      <CabecalhoProposta dados={dados} ch={ch} aba="d1" />
      <div className="grid gap-6 pb-20 lg:grid-cols-[16rem_1fr]">
        <nav aria-label="Planos de Ação e subcritérios" className="space-y-3 text-sm">
          {PLANOS.map((plano, i) => {
            const total = previa.totaisPorPA[i]!
            return (
              <div key={plano.codigo}>
                <p className="font-semibold text-slate-800">
                  {plano.codigo}{' '}
                  <span className="font-normal text-slate-500">
                    {formatarNumero(total.pontos)} / {formatarNumero(total.maximo)} · {total.avaliados}/{total.quantidade}
                  </span>
                </p>
                <ul className="mt-1 space-y-0.5">
                  {plano.subcriterios.map((s) => {
                    const preenchido = registros.has(s.codigo)
                    return (
                      <li key={s.codigo}>
                        <button
                          type="button"
                          onClick={() => setEscolhido(s.codigo)}
                          aria-current={s.codigo === atual ? 'true' : undefined}
                          className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left ${s.codigo === atual ? 'bg-sky-100 text-sky-900' : 'hover:bg-slate-100'}`}
                        >
                          <span aria-hidden className={preenchido ? 'text-emerald-700' : 'text-slate-400'}>
                            {preenchido ? '●' : '○'}
                          </span>
                          <span className="truncate">
                            {s.codigo} {s.titulo}
                          </span>
                          <span className="sr-only">{preenchido ? '(preenchido)' : '(pendente)'}</span>
                          {preenchido && <span className="ml-auto text-xs text-slate-500">{registros.get(s.codigo)!.nivel}</span>}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </nav>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          {sessao && (
            <ControleProjecao
              codigoAtual={atual}
              foco={sessao.foco}
              propostaId={p}
              podeProjetar={podeProjetar}
              linkTelao={`/projecao/${ch}/${sessao.id}`}
              onSelecionar={setEscolhido}
              onProjetar={projetar}
            />
          )}
          <AlertaErro erro={erroProjecao} />
          <PainelSubcriterio
            key={atual}
            codigo={atual}
            registro={registros.get(atual) ?? null}
            justificativaMinima={dados.chamamento.justificativaMinima}
            somenteLeitura={motivo !== null}
            motivoSomenteLeitura={motivo ?? undefined}
            onSalvar={async (registro) => {
              await chamarApi('/api/avaliacao', {
                metodo: 'PUT',
                corpo: { chamamentoId: ch, propostaId: p, sessaoId: dados.sessaoAberta!.id, ...registro },
              })
              const proximo = proximoPendente(registro.codigo)
              if (proximo) setEscolhido(proximo)
            }}
          />
        </div>
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white px-6 py-2 text-sm md:pl-62">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
          <span>
            D1 parcial: <strong>{formatarNumero(previa.d1)}</strong> / {formatarNumero(previa.maximo)}
          </span>
          <span>
            Faltam <strong>{previa.pendentes.length}</strong> de {CODIGOS.length} subcritérios
          </span>
          <span>
            Prévia: <SeloStatus status={previa.status} />
          </span>
          <span>
            Oficial (gravado pela /api): <SeloStatus status={statusDaProposta(dados.proposta)} />
          </span>
        </div>
      </footer>
    </>
  )
}
