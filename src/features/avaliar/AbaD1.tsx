// Aba D1 (uma página só): seções recolhíveis por PA (PA1…PA6) com subtotal e progresso; cada subcritério numa
// linha — código e título, escala 0–4 (botões; teclas 0–4 com o foco nela), descritor do nível escolhido logo
// abaixo, "Ver elementos" (apoio, não gera nota), justificativa (cresce com o texto) e páginas citadas.
// Indicador de pendência por linha (nível ou justificativa faltando) e "Ir para o próximo pendente".
// Salvamento automático: nível na hora; justificativa e páginas com debounce. Página fora do PA não é enviada
// (aviso no campo). Lixeira do nível registrado (exclusão livre, com prévia).

import { ChevronDown, ChevronRight, CircleAlert, CircleCheck, ListChecks, SkipForward } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { cx } from '../../components/ui/cx'
import { Icone } from '../../components/ui/Icone'
import { Badge } from '../../components/ui/StatusBadge'
import { TextArea } from '../../components/ui/TextArea'
import { TextField } from '../../components/ui/TextField'
import { JUSTIFICATIVA_MINIMA_PADRAO, ehEliminatorio, lerPaginas } from '../../domain/avaliacao'
import type { TotalPA } from '../../domain/d1'
import { formatarNumero } from '../../domain/formatacao'
import { MATRIZ_2026 } from '../../domain/matriz'
import { pendenciasDoRegistro, problemasDoRascunho } from '../../esquemas/avaliacao'
import { chamarApi } from '../../lib/api'
import type { Avaliacao } from '../../lib/tipos'
import { EscalaNivel } from './EscalaNivel'
import { ATRASO_TEXTO, useCampo, useFila } from './salvamento'
import { chaveD1, proximoPendente, type ResumoD1 } from './valores'

const PLANOS = MATRIZ_2026.dimensao1.planos
const DESCRITOR = new Map(MATRIZ_2026.dimensao1.escala.map((e) => [e.nivel, e.descritor]))

/** Ajusta a altura da área de texto ao conteúdo (cresce com a justificativa). */
function useAlturaAutomatica(valor: string) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    if (el.scrollHeight > 0) el.style.height = `${el.scrollHeight + 2}px`
  }, [valor])
  return ref
}

interface PropsLinha {
  ch: string
  p: string
  sessaoId: string | null
  codigo: string
  titulo: string
  elementos: string[]
  limitePaginas: number
  planoCodigo: string
  registro: Avaliacao | undefined
  justificativaMinima: number
  somenteLeitura: boolean
  onFocar: (codigo: string) => void
  acaoExcluir?: ReactNode
}

function LinhaSubcriterio(props: PropsLinha) {
  const { ch, p, sessaoId, codigo, titulo, elementos, limitePaginas, planoCodigo, registro, justificativaMinima, somenteLeitura, onFocar, acaoExcluir } = props
  const fila = useFila()
  const nivel = useCampo<number | null>(chaveD1(p, codigo, 'nivel'), registro?.nivel ?? null)
  const justificativa = useCampo<string>(chaveD1(p, codigo, 'justificativa'), registro?.justificativa ?? '')
  const paginasTexto = useCampo<string>(chaveD1(p, codigo, 'paginas'), (registro?.paginas ?? []).join(', '))
  const [verElementos, setVerElementos] = useState(false)
  const alturaJustificativa = useAlturaAutomatica(justificativa)

  const enviar = (campos: Record<string, unknown>) =>
    chamarApi('/api/avaliacao', { metodo: 'PUT', corpo: { chamamentoId: ch, propostaId: p, sessaoId, codigo, ...campos } })

  const lidas = lerPaginas(paginasTexto)
  const erroPaginas =
    lidas.invalidos.length > 0
      ? `Use números de página separados por vírgula (1 a ${limitePaginas}).`
      : problemasDoRascunho({ codigo, paginas: lidas.paginas }).paginas

  function mudarPaginas(texto: string) {
    const lido = lerPaginas(texto)
    const erro = lido.invalidos.length > 0 ? 'páginas inválidas' : problemasDoRascunho({ codigo, paginas: lido.paginas }).paginas
    if (erro) fila.guardar(chaveD1(p, codigo, 'paginas'), texto, `${codigo}: ${erro}`)
    else fila.salvar(chaveD1(p, codigo, 'paginas'), texto, (t) => enviar({ paginas: lerPaginas(t).paginas }), ATRASO_TEXTO)
  }

  const pendencias = pendenciasDoRegistro({ nivel, justificativa }, justificativaMinima)
  const idTitulo = `titulo-${codigo}`
  const idDescritor = `descritor-${codigo}`
  const idElementos = `elementos-${codigo}`

  return (
    <li
      id={`sub-${codigo}`}
      aria-labelledby={idTitulo}
      data-pendente={pendencias.length > 0 ? 'true' : undefined}
      onFocusCapture={() => onFocar(codigo)}
      className="scroll-mt-48 space-y-3 border-t border-border-default py-4 first:border-t-0"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <h4 id={idTitulo} className="text-heading-4 text-text-primary">
            {codigo} — {titulo}
          </h4>
          <p className="flex flex-wrap items-center gap-2 text-body-sm">
            {pendencias.length > 0 ? (
              <span className="inline-flex items-center gap-1 text-status-warning-text">
                <Icone icone={CircleAlert} tamanho={16} />
                Falta {pendencias.join(' e ')}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-status-success-text">
                <Icone icone={CircleCheck} tamanho={16} />
                Completo
              </span>
            )}
            {ehEliminatorio(codigo) && <Badge tom="error">Eliminatório</Badge>}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <EscalaNivel
            rotulo={`Nível do ${codigo}`}
            valor={nivel}
            descricao={idDescritor}
            desabilitado={somenteLeitura}
            onEscolher={(n) => fila.salvar(chaveD1(p, codigo, 'nivel'), n, (v) => enviar({ nivel: v }))}
          />
          {registro && acaoExcluir}
        </div>
      </div>

      <p id={idDescritor} className={cx('text-body-sm', nivel === null ? 'text-text-muted' : 'text-text-secondary')}>
        {nivel === null ? 'Escolha o nível de 0 a 4.' : `Nível ${nivel}: ${DESCRITOR.get(nivel) ?? ''}`}
      </p>
      {nivel === 0 && ehEliminatorio(codigo) && (
        <Alert tom="error" titulo="Subcritério eliminatório">
          Nível 0 no {codigo} desclassifica a proposta, independentemente da pontuação (Anexo IV, 3.10).
        </Alert>
      )}

      <div>
        <button
          type="button"
          aria-expanded={verElementos}
          aria-controls={idElementos}
          onClick={() => setVerElementos((v) => !v)}
          className="inline-flex items-center gap-1 rounded-button text-label-md text-text-link"
        >
          <Icone icone={verElementos ? ChevronDown : ChevronRight} tamanho={16} />
          {verElementos ? 'Ocultar elementos' : 'Ver elementos'}
          <span className="sr-only"> de avaliação do {codigo}</span>
        </button>
        {verElementos && (
          <ul id={idElementos} className="mt-2 list-inside list-disc space-y-1 text-body-sm text-text-secondary">
            {elementos.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
        <TextArea
          ref={alturaJustificativa}
          rotulo={`Justificativa do ${codigo}`}
          rows={2}
          minimo={justificativaMinima}
          value={justificativa}
          somenteLeitura={somenteLeitura}
          className="[&_textarea]:resize-none [&_textarea]:overflow-hidden"
          onChange={(e) => fila.salvar(chaveD1(p, codigo, 'justificativa'), e.target.value, (v) => enviar({ justificativa: v }), ATRASO_TEXTO)}
        />
        <TextField
          rotulo={`Páginas citadas do ${codigo}`}
          ajuda={`Numeração do ${planoCodigo} (1 a ${limitePaginas}), separadas por vírgula.`}
          value={paginasTexto}
          erro={erroPaginas}
          somenteLeitura={somenteLeitura}
          inputMode="numeric"
          onChange={(e) => mudarPaginas(e.target.value)}
        />
      </div>
    </li>
  )
}

function CabecalhoPA({ total, aberto, onAlternar, completos }: { total: TotalPA; aberto: boolean; onAlternar: () => void; completos: number }) {
  return (
    <h3>
      <button
        type="button"
        aria-expanded={aberto}
        aria-controls={`pa-${total.codigo}`}
        onClick={onAlternar}
        className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 rounded-card px-(--sds-card-padding) py-4 text-left"
      >
        <Icone icone={aberto ? ChevronDown : ChevronRight} tamanho={20} className="text-text-secondary" />
        <span className="min-w-0 flex-1 text-heading-4 text-text-primary">
          {total.codigo} — {total.titulo}
        </span>
        <span className="text-body-sm text-text-secondary tabular-nums">
          {completos} de {total.quantidade} completos
        </span>
        <span className="text-label-md text-text-primary tabular-nums">
          {formatarNumero(total.pontos)} / {formatarNumero(total.maximo)} pts
        </span>
      </button>
    </h3>
  )
}

interface Props {
  ch: string
  p: string
  sessaoId: string | null
  avaliacoes: ({ id: string } & Avaliacao)[]
  resumo: ResumoD1
  justificativaMinima?: number
  /** Por que não dá para registrar (null = pode). */
  motivoSomenteLeitura: string | null
  onFocarSubcriterio: (codigo: string) => void
  acaoExcluir: (codigo: string) => ReactNode
}

export function AbaD1({ ch, p, sessaoId, avaliacoes, resumo, justificativaMinima, motivoSomenteLeitura, onFocarSubcriterio, acaoExcluir }: Props) {
  const [fechados, setFechados] = useState<Set<string>>(new Set())
  const [alvo, setAlvo] = useState<string | null>(null)
  const ultimo = useRef<string | null>(null)
  const registros = new Map(avaliacoes.map((a) => [a.id, a]))
  const minimo = justificativaMinima ?? JUSTIFICATIVA_MINIMA_PADRAO

  // Depois de abrir o PA, leva a linha à vista e põe o foco na escala.
  useEffect(() => {
    if (!alvo) return
    const linha = document.getElementById(`sub-${alvo}`)
    linha?.scrollIntoView?.({ block: 'start', behavior: 'smooth' })
    linha?.querySelector<HTMLElement>('[role="radio"][tabindex="0"]')?.focus()
    setAlvo(null)
  }, [alvo])

  function focar(codigo: string) {
    ultimo.current = codigo
    onFocarSubcriterio(codigo)
  }

  function irParaProximo() {
    const codigo = proximoPendente(resumo.pendentes, ultimo.current)
    if (!codigo) return
    const plano = PLANOS.find((pa) => pa.subcriterios.some((s) => s.codigo === codigo))!
    setFechados((atual) => new Set([...atual].filter((c) => c !== plano.codigo)))
    setAlvo(codigo)
  }

  return (
    <div className="space-y-4">
      {motivoSomenteLeitura && (
        <Alert tom="info" titulo="Somente leitura">
          {motivoSomenteLeitura}
        </Alert>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <p className="flex items-center gap-2 text-body-md text-text-primary">
          <Icone icone={ListChecks} tamanho={20} className="text-text-secondary" />
          {resumo.pendentes.length === 0 ? 'Todos os 28 subcritérios completos.' : `${resumo.pendentes.length} subcritério(s) com pendência.`}
        </p>
        {resumo.pendentes.length > 0 && (
          <Button variante="secondary" tamanho="sm" icone={SkipForward} onClick={irParaProximo}>
            Ir para o próximo pendente
          </Button>
        )}
      </div>

      {PLANOS.map((plano, i) => {
        const total = resumo.previa.totaisPorPA[i]!
        const aberto = !fechados.has(plano.codigo)
        const completos = plano.subcriterios.filter((s) => !resumo.pendentes.includes(s.codigo)).length
        return (
          <section key={plano.codigo} aria-label={`${plano.codigo} — ${plano.titulo}`} className="rounded-card border border-card-border bg-card-bg shadow-card">
            <CabecalhoPA
              total={total}
              aberto={aberto}
              completos={completos}
              onAlternar={() =>
                setFechados((atual) => {
                  const novo = new Set(atual)
                  if (novo.has(plano.codigo)) novo.delete(plano.codigo)
                  else novo.add(plano.codigo)
                  return novo
                })
              }
            />
            {aberto && (
              <ol id={`pa-${plano.codigo}`} className="border-t border-border-default px-(--sds-card-padding)">
                {plano.subcriterios.map((s) => (
                  <LinhaSubcriterio
                    key={s.codigo}
                    ch={ch}
                    p={p}
                    sessaoId={sessaoId}
                    codigo={s.codigo}
                    titulo={s.titulo}
                    elementos={s.elementos}
                    limitePaginas={plano.limitePaginas}
                    planoCodigo={plano.codigo}
                    registro={registros.get(s.codigo)}
                    justificativaMinima={minimo}
                    somenteLeitura={motivoSomenteLeitura !== null}
                    onFocar={focar}
                    acaoExcluir={acaoExcluir(s.codigo)}
                  />
                ))}
              </ol>
            )}
          </section>
        )
      })}
    </div>
  )
}
