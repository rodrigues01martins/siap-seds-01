// /chamamentos/:ch/propostas/:p/d1 — avaliação da D1 (formulário longo): navegação lateral PA1…PA6 com
// progresso por PA e estado de cada subcritério, painel do subcritério em seções e rodapé fixo com a D1
// parcial (prévia de src/domain), o status oficial (/api) e a ação primária "Salvar".
// Quem conduz a sessão controla o telão daqui (ControleProjecao).

import { Circle, CircleCheck, Save } from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router'
import { DetailPage } from '../../components/templates/paginas'
import { AlertaErroApi } from '../../components/ui/AlertaErroApi'
import { Button } from '../../components/ui/Button'
import { cx } from '../../components/ui/cx'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { Icone } from '../../components/ui/Icone'
import { Select } from '../../components/ui/Select'
import { Skeleton } from '../../components/ui/Skeleton'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { calcularD1, type TotalPA } from '../../domain/d1'
import { formatarNumero } from '../../domain/formatacao'
import { MATRIZ_2026 } from '../../domain/matriz'
import { podeFazer } from '../../domain/permissoes'
import { statusDaProposta } from '../../domain/statusProposta'
import { chamarApi } from '../../lib/api'
import { useColecao } from '../../lib/firestore'
import type { Avaliacao } from '../../lib/tipos'
import { useUsuario } from '../auth/useUsuario'
import { cabecalhoDaProposta, ContextoProposta, useDadosProposta, motivoSemSessao, type DadosProposta } from './CabecalhoProposta'
import { ControleProjecao, type PedidoProjecao } from './ControleProjecao'
import { PainelSubcriterio } from './PainelSubcriterio'

const PLANOS = MATRIZ_2026.dimensao1.planos
const CODIGOS = PLANOS.flatMap((p) => p.subcriterios.map((s) => s.codigo))
const ID_FORMULARIO = 'form-subcriterio-d1'

/** Por que a tela está só para leitura (null = pode registrar). */
export function motivoSomenteLeituraD1(dados: DadosProposta, podeRegistrar: boolean): string | null {
  if (dados.proposta.bloqueada) return 'Proposta homologada: somente leitura.'
  const admissao = dados.proposta.admissibilidade?.situacao
  if (admissao === 'nao_admitida' || admissao === 'desclassificada') {
    return 'Proposta não admitida (Anexo III, item 28): não segue para avaliação.'
  }
  if (!podeRegistrar) return 'Você consulta a avaliação, mas não registra níveis (permissão "Níveis da D1").'
  return motivoSemSessao(dados, 'níveis')
}

/** Barra de progresso do PA (subcritérios avaliados), com o número sempre em texto. */
function ProgressoPA({ total }: { total: TotalPA }) {
  const completo = total.avaliados === total.quantidade
  return (
    <div className="mt-2">
      <div
        role="progressbar"
        aria-label={`Progresso do ${total.codigo}`}
        aria-valuemin={0}
        aria-valuemax={total.quantidade}
        aria-valuenow={total.avaliados}
        aria-valuetext={`${total.avaliados} de ${total.quantidade} subcritérios avaliados`}
        className="h-2 overflow-hidden rounded-badge bg-border-default"
      >
        <div className={cx('h-full rounded-badge', completo ? 'bg-status-success' : 'bg-data-1')} style={{ width: `${(total.avaliados / total.quantidade) * 100}%` }} />
      </div>
      <p className="mt-1 flex justify-between text-caption text-text-secondary">
        <span>
          {total.avaliados}/{total.quantidade} avaliados
        </span>
        <span className="tabular-nums">
          {formatarNumero(total.pontos)} / {formatarNumero(total.maximo)} pts
        </span>
      </p>
    </div>
  )
}

export function TelaD1() {
  const { ch = '', p = '' } = useParams()
  const { usuario } = useUsuario()
  const leitura = useDadosProposta(ch, p)
  const avaliacoes = useColecao<Avaliacao>(`chamamentos/${ch}/propostas/${p}/avaliacoes`)
  const [escolhido, setEscolhido] = useState<string | null>(null)
  const [erroProjecao, setErroProjecao] = useState<unknown>(null)
  const [salvando, setSalvando] = useState(false)

  const carregando = leitura.carregando || avaliacoes.carregando
  const erro = leitura.erro ?? avaliacoes.erro
  if (carregando) return <Skeleton linhas={8} rotulo="Carregando avaliação da D1" />
  if (erro) return <ErrorState mensagem={erro} />
  if (!leitura.dados) return <EmptyState titulo="Proposta não encontrada" descricao="Confira o endereço ou volte ao painel do chamamento." />

  const dados = leitura.dados
  const registros = new Map(avaliacoes.dados.map((a) => [a.id, a]))
  const previa = calcularD1(Object.fromEntries(avaliacoes.dados.map((a) => [a.id, a.nivel])))
  const atual = escolhido ?? previa.pendentes[0] ?? CODIGOS[0]!
  const motivo = motivoSomenteLeituraD1(dados, podeFazer(usuario?.acesso ?? null, 'nivelD1'))
  const sessao = dados.sessaoAberta
  const podeProjetar = sessao !== null && sessao.pauta.includes(p) && podeFazer(usuario?.acesso ?? null, 'sessaoConduzir')
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
  const estado = (codigo: string) => (registros.has(codigo) ? `nível ${registros.get(codigo)!.nivel}` : 'pendente')

  return (
    <DetailPage cabecalho={cabecalhoDaProposta(dados, ch, 'd1')}>
      <ContextoProposta dados={dados} ch={ch} aba="d1" />
      <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <div className="lg:hidden">
          <Select
            rotulo="Subcritério"
            value={atual}
            onChange={(e) => setEscolhido(e.target.value)}
            opcoes={PLANOS.flatMap((pa) => pa.subcriterios.map((s) => ({ valor: s.codigo, rotulo: `${s.codigo} ${s.titulo} (${estado(s.codigo)})` })))}
          />
        </div>
        <nav aria-label="Planos de Ação e subcritérios" className="hidden space-y-4 lg:block">
          {PLANOS.map((plano, i) => {
            const total = previa.totaisPorPA[i]!
            return (
              <section key={plano.codigo} aria-labelledby={`pa-${plano.codigo}`} className="rounded-card border border-card-border bg-card-bg p-4">
                <h2 id={`pa-${plano.codigo}`} className="text-label-md text-text-primary">
                  {plano.codigo} <span className="font-normal text-text-secondary">— {plano.titulo}</span>
                </h2>
                <ProgressoPA total={total} />
                <ul className="mt-3 space-y-1">
                  {plano.subcriterios.map((s) => {
                    const preenchido = registros.has(s.codigo)
                    const selecionado = s.codigo === atual
                    return (
                      <li key={s.codigo}>
                        <button
                          type="button"
                          onClick={() => setEscolhido(s.codigo)}
                          aria-current={selecionado ? 'true' : undefined}
                          className={cx(
                            'flex w-full items-center gap-2 rounded-input px-2 py-1.5 text-left text-body-sm transition-colors duration-fast ease-standard',
                            selecionado ? 'bg-action-subtle font-semibold text-text-link' : 'text-text-primary hover:bg-background-default',
                          )}
                        >
                          <Icone
                            icone={preenchido ? CircleCheck : Circle}
                            tamanho={16}
                            className={cx('shrink-0', preenchido ? 'text-status-success' : 'text-text-muted')}
                          />
                          <span className="truncate">
                            {s.codigo} {s.titulo}
                          </span>
                          <span className="sr-only">{preenchido ? '(preenchido)' : '(pendente)'}</span>
                          {preenchido && <span className="ml-auto text-caption text-text-secondary tabular-nums">{registros.get(s.codigo)!.nivel}</span>}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </nav>

        <div className="min-w-0 space-y-4">
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
          <AlertaErroApi erro={erroProjecao} />
          <PainelSubcriterio
            key={atual}
            codigo={atual}
            idFormulario={ID_FORMULARIO}
            registro={registros.get(atual) ?? null}
            justificativaMinima={dados.chamamento.justificativaMinima}
            somenteLeitura={motivo !== null}
            motivoSomenteLeitura={motivo ?? undefined}
            onSalvar={async (registro) => {
              setSalvando(true)
              try {
                await chamarApi('/api/avaliacao', {
                  metodo: 'PUT',
                  corpo: { chamamentoId: ch, propostaId: p, sessaoId: dados.sessaoAberta!.id, ...registro },
                })
              } finally {
                setSalvando(false)
              }
              const proximo = proximoPendente(registro.codigo)
              if (proximo) setEscolhido(proximo)
            }}
          />
        </div>
      </div>

      <section
        aria-label="Resumo da D1"
        className="sticky bottom-0 z-10 -mx-4 -mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border-default bg-background-surface px-4 py-3 shadow-dropdown md:-mx-6 md:px-6 xl:-mx-8 xl:px-8"
      >
        <p className="text-body-md text-text-primary">
          D1 parcial: <strong className="text-heading-4 tabular-nums">{formatarNumero(previa.d1)}</strong> / {formatarNumero(previa.maximo)}
        </p>
        <p className="text-body-sm text-text-secondary">
          Faltam <strong className="text-text-primary">{previa.pendentes.length}</strong> de {CODIGOS.length} subcritérios
        </p>
        <p className="flex items-center gap-2 text-body-sm text-text-secondary">
          Prévia: <StatusBadge status={previa.status} />
        </p>
        <p className="flex items-center gap-2 text-body-sm text-text-secondary">
          Oficial (gravado pela /api): <StatusBadge status={statusDaProposta(dados.proposta)} />
        </p>
        {motivo === null && (
          <Button type="submit" form={ID_FORMULARIO} icone={Save} carregando={salvando} className="ml-auto" aria-label={`Salvar avaliação do ${atual}`}>
            Salvar
          </Button>
        )}
      </section>
    </DetailPage>
  )
}
