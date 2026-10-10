// Tabela de dados (§13): ordenação, busca, filtros, paginação, ações por linha, densidade (confortável 56 px /
// compacta 48 px; cabeçalho 48 px), carregando, vazio e erro. Teclado: cabeçalhos ordenáveis são botões;
// nas linhas, só a primeira entra no Tab (roving tabindex) e setas/Home/End movem o foco entre elas.

import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react'
import { useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Button } from './Button'
import { cx } from './cx'
import { EmptyState } from './EmptyState'
import { ErrorState } from './ErrorState'
import { Icone } from './Icone'
import { Select, type OpcaoSelect } from './Select'
import { Skeleton } from './Skeleton'
import { TextField } from './TextField'

export interface ColunaTabela<T> {
  id: string
  titulo: string
  celula: (linha: T) => ReactNode
  /** Valor de ordenação; sem ele, a coluna não é ordenável. */
  ordenar?: (linha: T) => string | number
  alinhar?: 'esquerda' | 'direita'
}

export interface FiltroTabela<T> {
  id: string
  rotulo: string
  opcoes: OpcaoSelect[]
  aplicar: (linha: T, valor: string) => boolean
}

export type Densidade = 'confortavel' | 'compacta'

export interface PropsDataTable<T> {
  /** Nome da tabela (legenda acessível). */
  rotulo: string
  colunas: ColunaTabela<T>[]
  linhas: T[]
  chave: (linha: T) => string
  busca?: { rotulo?: string; texto: (linha: T) => string }
  filtros?: FiltroTabela<T>[]
  acoes?: (linha: T) => ReactNode
  porPagina?: number
  carregando?: boolean
  erro?: string | null
  onTentarNovamente?: () => void
  vazio?: { titulo: string; descricao?: string; acao?: ReactNode }
  densidadeInicial?: Densidade
}

type Ordem = { coluna: string; direcao: 'ascending' | 'descending' } | null

const normalizar = (texto: string) => texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
const registros = (n: number) => (n === 1 ? 'registro' : 'registros')

function comparar(a: string | number, b: string | number): number {
  return typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'pt-BR', { numeric: true })
}

export function DataTable<T>({
  rotulo,
  colunas,
  linhas,
  chave,
  busca,
  filtros = [],
  acoes,
  porPagina = 10,
  carregando = false,
  erro = null,
  onTentarNovamente,
  vazio = { titulo: 'Nenhum registro' },
  densidadeInicial = 'confortavel',
}: PropsDataTable<T>) {
  const [termo, setTermo] = useState('')
  const [valoresFiltro, setValoresFiltro] = useState<Record<string, string>>({})
  const [ordem, setOrdem] = useState<Ordem>(null)
  const [pagina, setPagina] = useState(1)
  const [densidade, setDensidade] = useState<Densidade>(densidadeInicial)
  const refsLinhas = useRef<(HTMLTableRowElement | null)[]>([])

  const filtradas = useMemo(() => {
    const t = normalizar(termo.trim())
    let resultado = linhas.filter(
      (l) => (!t || !busca || normalizar(busca.texto(l)).includes(t)) && filtros.every((f) => !valoresFiltro[f.id] || f.aplicar(l, valoresFiltro[f.id]!)),
    )
    const coluna = ordem && colunas.find((c) => c.id === ordem.coluna)
    if (coluna?.ordenar) {
      const sinal = ordem!.direcao === 'ascending' ? 1 : -1
      resultado = [...resultado].sort((a, b) => sinal * comparar(coluna.ordenar!(a), coluna.ordenar!(b)))
    }
    return resultado
  }, [linhas, termo, busca, filtros, valoresFiltro, ordem, colunas])

  const paginas = Math.max(1, Math.ceil(filtradas.length / porPagina))
  const atual = Math.min(pagina, paginas)
  const inicio = (atual - 1) * porPagina
  const visiveis = filtradas.slice(inicio, inicio + porPagina)
  const alturaLinha = densidade === 'compacta' ? 'h-(--sds-table-row-height-compact)' : 'h-(--sds-table-row-height-comfortable)'
  const totalColunas = colunas.length + (acoes ? 1 : 0)

  const ordenarPor = (id: string) => {
    setOrdem((o) => (o?.coluna === id ? { coluna: id, direcao: o.direcao === 'ascending' ? 'descending' : 'ascending' } : { coluna: id, direcao: 'ascending' }))
  }

  const aoTeclarLinha = (evento: KeyboardEvent<HTMLTableRowElement>, i: number) => {
    if (evento.target !== evento.currentTarget) return // teclas dentro dos botões da linha
    const destino = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: visiveis.length - 1 }[evento.key]
    if (destino === undefined) return
    evento.preventDefault()
    refsLinhas.current[Math.max(0, Math.min(visiveis.length - 1, destino))]?.focus()
  }

  const resumo =
    paginas > 1 ? `${inicio + 1}–${inicio + visiveis.length} de ${filtradas.length} ${registros(filtradas.length)}` : `${visiveis.length} de ${filtradas.length} ${registros(filtradas.length)}`

  return (
    <div className="rounded-card border border-table-border bg-background-surface">
      {(busca || filtros.length > 0) && (
        <div className="flex flex-wrap items-end gap-4 border-b border-table-border p-4">
          {busca && (
            <TextField
              className="min-w-56 flex-1"
              rotulo={busca.rotulo ?? 'Buscar'}
              type="search"
              value={termo}
              onChange={(e) => {
                setTermo(e.target.value)
                setPagina(1)
              }}
            />
          )}
          {filtros.map((f) => (
            <Select
              key={f.id}
              className="min-w-40"
              rotulo={f.rotulo}
              vazio="Todos"
              opcoes={f.opcoes}
              value={valoresFiltro[f.id] ?? ''}
              onChange={(e) => {
                setValoresFiltro((v) => ({ ...v, [f.id]: e.target.value }))
                setPagina(1)
              }}
            />
          ))}
          <div role="group" aria-label="Densidade da tabela" className="flex gap-1">
            {(['confortavel', 'compacta'] as const).map((d) => (
              <Button key={d} variante={densidade === d ? 'secondary' : 'tertiary'} tamanho="sm" aria-pressed={densidade === d} onClick={() => setDensidade(d)}>
                {d === 'confortavel' ? 'Confortável' : 'Compacta'}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-body-sm">
          <caption className="sr-only">{rotulo}</caption>
          <thead className="bg-table-header-bg text-table-header-fg">
            <tr>
              {colunas.map((c) => {
                const direcao = ordem?.coluna === c.id ? ordem.direcao : 'none'
                return (
                  <th
                    key={c.id}
                    scope="col"
                    aria-sort={c.ordenar ? direcao : undefined}
                    className={cx('h-(--sds-table-header-height) border-b border-table-border px-4 text-label-md', c.alinhar === 'direita' && 'text-right')}
                  >
                    {c.ordenar ? (
                      <button
                        type="button"
                        onClick={() => ordenarPor(c.id)}
                        className={cx('inline-flex items-center gap-1 rounded-input hover:text-text-primary', c.alinhar === 'direita' && 'flex-row-reverse')}
                      >
                        {c.titulo}
                        <Icone icone={direcao === 'ascending' ? ArrowUp : direcao === 'descending' ? ArrowDown : ChevronsUpDown} tamanho={16} />
                      </button>
                    ) : (
                      c.titulo
                    )}
                  </th>
                )
              })}
              {acoes && (
                <th scope="col" className="h-(--sds-table-header-height) border-b border-table-border px-4 text-right text-label-md">
                  Ações
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {carregando ? (
              <tr>
                <td colSpan={totalColunas} className="p-4">
                  <Skeleton linhas={4} rotulo={`Carregando ${rotulo}`} />
                </td>
              </tr>
            ) : erro ? (
              <tr>
                <td colSpan={totalColunas}>
                  <ErrorState mensagem={erro} onTentarNovamente={onTentarNovamente} />
                </td>
              </tr>
            ) : visiveis.length === 0 ? (
              <tr>
                <td colSpan={totalColunas}>
                  <EmptyState titulo={vazio.titulo} descricao={vazio.descricao} acao={vazio.acao} />
                </td>
              </tr>
            ) : (
              visiveis.map((linha, i) => (
                <tr
                  key={chave(linha)}
                  ref={(el) => {
                    refsLinhas.current[i] = el
                  }}
                  tabIndex={i === 0 ? 0 : -1}
                  onKeyDown={(e) => aoTeclarLinha(e, i)}
                  className="border-b border-table-border bg-table-row-bg text-text-primary last:border-b-0 hover:bg-table-row-bg-hover focus-visible:bg-table-row-bg-hover"
                >
                  {colunas.map((c) => (
                    <td key={c.id} className={cx(alturaLinha, 'px-4', c.alinhar === 'direita' && 'text-right tabular-nums')}>
                      {c.celula(linha)}
                    </td>
                  ))}
                  {acoes && <td className={cx(alturaLinha, 'px-4 text-right')}>{acoes(linha)}</td>}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!carregando && !erro && (
        <nav aria-label={`Paginação de ${rotulo}`} className="flex flex-wrap items-center justify-between gap-2 border-t border-table-border px-4 py-2">
          <p aria-live="polite" className="text-body-sm text-text-secondary">
            {resumo}
          </p>
          {paginas > 1 && (
            <div className="flex items-center gap-2">
              <Button variante="tertiary" tamanho="sm" icone={ChevronLeft} aria-label="Página anterior" desabilitado={atual === 1} onClick={() => setPagina(atual - 1)}>
                Anterior
              </Button>
              <span className="text-body-sm text-text-secondary">
                Página {atual} de {paginas}
              </span>
              <Button variante="tertiary" tamanho="sm" aria-label="Próxima página" desabilitado={atual === paginas} onClick={() => setPagina(atual + 1)}>
                Próxima
                <Icone icone={ChevronRight} tamanho={16} />
              </Button>
            </div>
          )}
        </nav>
      )}
    </div>
  )
}
