// Aba D2: experiências da OSC numa tabela com edição direta na linha (adicionar, editar, excluir), sem painel
// lateral. Detalhes (parceria, porte, valor) e documentos comprobatórios ficam numa linha expansível; abaixo, a
// linha do tempo das experiências A/B. Salvamento automático da linha inteira: caixas e listas na hora, textos com
// debounce; linha incompleta (ex.: sem início) fica guardada, com o que falta, até poder ser gravada. Linha nova é
// criada (POST) quando fica completa e, daí em diante, editada (PATCH). Desconsiderar por critério (3.8.5) e a
// lixeira da experiência (exclusão livre, com prévia) por linha.

import { Ban, ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { useRef, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { cx } from '../../components/ui/cx'
import { Badge } from '../../components/ui/StatusBadge'
import { formatarNumero } from '../../domain/formatacao'
import { MATRIZ_2026 } from '../../domain/matriz'
import { MODALIDADES, ROTULO_MODALIDADE } from '../../esquemas/experiencia'
import { chamarApi } from '../../lib/api'
import type { ExperienciaGravada } from '../../lib/tipos'
import { GraficoLinhaDoTempo } from '../experiencias/GraficoLinhaDoTempo'
import { DialogoDesconsiderar } from './DialogoDesconsiderar'
import { LINHA_VAZIA, paraLinha, validarLinha, type LinhaExperiencia } from './linhaExperiencia'
import { ATRASO_TEXTO, useCampo, useFila } from './salvamento'
import { chaveExperiencia } from './valores'

const CATEGORIAS = MATRIZ_2026.dimensao2.criterios['C2.1'].categorias
const COLUNAS = ['Nº', 'Descrição', 'Categorias', 'Modalidade', 'MROSC', 'Início', 'Fim', 'Vagas', 'Ações']

const classeEntrada = (erro?: string) =>
  cx(
    'h-(--sds-input-height) w-full rounded-input border bg-input-bg px-2 text-body-sm text-input-fg',
    'disabled:cursor-not-allowed disabled:bg-input-bg-disabled',
    erro ? 'border-input-border-error' : 'border-input-border hover:border-input-border-hover',
  )

/** Entrada compacta da tabela: rótulo para leitor de tela e mensagem de erro em região aria-live. */
function Entrada({ rotulo, erro, id, className, ...resto }: { rotulo: string; erro?: string; id: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <span className={cx('block', className)}>
      <input
        id={id}
        aria-label={rotulo}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? `${id}-mensagem` : undefined}
        className={classeEntrada(erro)}
        {...resto}
      />
      <span id={`${id}-mensagem`} aria-live="polite" className="block text-caption text-status-error-text">
        {erro}
      </span>
    </span>
  )
}

interface PropsLinha {
  ch: string
  p: string
  sessaoId: string | null
  numero: number
  /** Experiência gravada (null: linha nova ainda não criada). */
  gravada: ExperienciaGravada | null
  /** Chave da linha no salvamento automático (estável, mesmo depois de criada). */
  chave: string
  somenteLeitura: boolean
  onCriada: (id: string) => void
  onDescartar: () => void
  acaoExcluir: ReactNode
}

function LinhaTabela({ ch, p, sessaoId, numero, gravada, chave, somenteLeitura, onCriada, onDescartar, acaoExcluir }: PropsLinha) {
  const fila = useFila()
  const id = useRef<string | null>(gravada?.id ?? null)
  if (gravada) id.current = gravada.id
  const linha = useCampo<LinhaExperiencia>(chave, gravada ? paraLinha(gravada) : LINHA_VAZIA)
  const [aberta, setAberta] = useState(false)
  const [editada, setEditada] = useState(false)
  const [desconsiderando, setDesconsiderando] = useState(false)
  const { erros } = validarLinha(linha)
  const mostrarErros = gravada !== null || editada
  const erro = (campo: string) => (mostrarErros ? erros[campo] : undefined)
  const rotulo = (campo: string) => `${campo} da experiência ${numero}`
  const alvo = { chamamentoId: ch, propostaId: p, sessaoId }

  async function enviar(valor: LinhaExperiencia) {
    const { campos } = validarLinha(valor)
    if (!campos) return
    if (id.current) {
      await chamarApi('/api/experiencia', { metodo: 'PATCH', corpo: { ...alvo, id: id.current, ...campos } })
    } else {
      const criada = await chamarApi<{ id: string }>('/api/experiencia', { metodo: 'POST', corpo: { ...alvo, ...campos } })
      id.current = criada.id
      onCriada(criada.id)
    }
  }

  function mudar(campos: Partial<LinhaExperiencia>, atraso = ATRASO_TEXTO) {
    const nova = { ...linha, ...campos }
    setEditada(true)
    const { campos: validos, erros: novosErros } = validarLinha(nova)
    if (!validos) fila.guardar(chave, nova, `experiência ${numero}: ${Object.values(novosErros)[0] ?? 'dados incompletos'}`)
    else fila.salvar(chave, nova, enviar, atraso)
  }

  const documentos = linha.documentos
  const mudarDocumento = (i: number, campos: Partial<(typeof documentos)[number]>, atraso?: number) =>
    mudar({ documentos: documentos.map((d, j) => (j === i ? { ...d, ...campos } : d)) }, atraso)
  const desconsideracoes = gravada?.desconsideracoes ?? []
  const idBase = `exp-${chave.replace(/[^\w-]/g, '-')}`

  return (
    <>
      <tr className="border-b border-table-border align-top" data-nova={gravada ? undefined : 'true'}>
        <th scope="row" className="px-2 py-2 text-label-md text-text-primary tabular-nums">
          {numero}
          {!gravada && <span className="block text-caption font-normal text-status-warning-text">nova</span>}
        </th>
        <td className="min-w-52 px-2 py-2">
          <Entrada id={`${idBase}-descricao`} rotulo={rotulo('Descrição')} erro={erro('descricao')} value={linha.descricao} disabled={somenteLeitura} onChange={(e) => mudar({ descricao: e.target.value })} />
          {desconsideracoes.length > 0 && <Badge tom="warning" className="mt-1">{`Desconsiderada em ${desconsideracoes.map((d) => d.criterio).join(', ')}`}</Badge>}
        </td>
        <td className="px-2 py-2">
          <fieldset aria-describedby={erro('categorias') ? `${idBase}-categorias-mensagem` : undefined} className="min-w-0">
            <legend className="sr-only">{rotulo('Categorias')}</legend>
            <span className="flex gap-2">
              {CATEGORIAS.map((c) => (
                <label key={c.codigo} title={c.descricao} className="inline-flex items-center gap-1 text-body-sm">
                  <input
                    type="checkbox"
                    aria-label={`Categoria ${c.codigo} da experiência ${numero}`}
                    checked={linha.categorias.includes(c.codigo)}
                    disabled={somenteLeitura}
                    onChange={(e) =>
                      mudar({ categorias: e.target.checked ? [...linha.categorias, c.codigo] : linha.categorias.filter((x) => x !== c.codigo) }, 0)
                    }
                    className="size-4 accent-action-primary"
                  />
                  {c.codigo}
                </label>
              ))}
            </span>
            <span id={`${idBase}-categorias-mensagem`} aria-live="polite" className="block text-caption text-status-error-text">
              {erro('categorias')}
            </span>
          </fieldset>
        </td>
        <td className="min-w-40 px-2 py-2">
          <select
            aria-label={rotulo('Modalidade')}
            aria-invalid={erro('modalidade') ? true : undefined}
            value={linha.modalidade}
            disabled={somenteLeitura}
            onChange={(e) => mudar({ modalidade: e.target.value }, 0)}
            className={classeEntrada(erro('modalidade'))}
          >
            <option value="">Selecione…</option>
            {MODALIDADES.map((m) => (
              <option key={m} value={m}>
                {ROTULO_MODALIDADE[m]}
              </option>
            ))}
          </select>
          <span aria-live="polite" className="block text-caption text-status-error-text">
            {erro('modalidade')}
          </span>
        </td>
        <td className="px-2 py-2 text-center">
          <input
            type="checkbox"
            aria-label={rotulo('MROSC')}
            title="Parceria regida pelo MROSC (Lei 13.019/2014)"
            checked={linha.mrosc}
            disabled={somenteLeitura}
            onChange={(e) => mudar({ mrosc: e.target.checked }, 0)}
            className="mt-3 size-4 accent-action-primary"
          />
        </td>
        <td className="min-w-36 px-2 py-2">
          <Entrada id={`${idBase}-inicio`} type="date" rotulo={rotulo('Início')} erro={erro('inicio')} value={linha.inicio} disabled={somenteLeitura} onChange={(e) => mudar({ inicio: e.target.value })} />
        </td>
        <td className="min-w-36 px-2 py-2">
          <Entrada id={`${idBase}-fim`} type="date" rotulo={rotulo('Fim')} title="Vazio = em execução" erro={erro('fim')} value={linha.fim} disabled={somenteLeitura} onChange={(e) => mudar({ fim: e.target.value })} />
        </td>
        <td className="min-w-24 px-2 py-2">
          <Entrada id={`${idBase}-vagas`} type="number" min={0} rotulo={rotulo('Vagas')} erro={erro('vagas')} value={linha.vagas} disabled={somenteLeitura} onChange={(e) => mudar({ vagas: e.target.value })} />
        </td>
        <td className="px-2 py-2">
          <span className="flex justify-end gap-1">
            <Button
              variante="tertiary"
              tamanho="sm"
              icone={aberta ? ChevronDown : ChevronRight}
              aria-expanded={aberta}
              aria-controls={`${idBase}-detalhes`}
              aria-label={`Detalhes e documentos (${documentos.length}) da experiência ${numero}`}
              onClick={() => setAberta((a) => !a)}
            >
              {`Documentos (${documentos.length})`}
            </Button>
            {gravada && !somenteLeitura && (
              <Button variante="tertiary" tamanho="sm" icone={Ban} aria-label={`Desconsiderar a experiência ${numero}`} onClick={() => setDesconsiderando(true)}>
                Desconsiderar
              </Button>
            )}
            {gravada ? (
              acaoExcluir
            ) : (
              <Button
                variante="tertiary"
                tamanho="sm"
                icone={Trash2}
                aria-label={`Descartar a experiência ${numero} (ainda não gravada)`}
                onClick={() => {
                  fila.descartar(chave)
                  onDescartar()
                }}
              >
                <span className="sr-only">Descartar</span>
              </Button>
            )}
          </span>
        </td>
      </tr>
      {aberta && (
        <tr id={`${idBase}-detalhes`} className="border-b border-table-border bg-background-default">
          <td colSpan={COLUNAS.length} className="space-y-4 px-4 py-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {(
                [
                  ['orgaoParceiro', 'Órgão parceiro', 'text'],
                  ['instrumento', 'Instrumento', 'text'],
                  ['unidades', 'Unidades', 'number'],
                  ['trabalhadores', 'Trabalhadores', 'number'],
                  ['valorAnual', 'Valor anual atualizado (R$)', 'text'],
                ] as const
              ).map(([campo, texto, tipo]) => (
                <label key={campo} className="block text-label-md text-text-primary">
                  {texto}
                  <Entrada
                    id={`${idBase}-${campo}`}
                    type={tipo}
                    rotulo={rotulo(texto)}
                    erro={campo === 'valorAnual' ? (erro('valorAnual') ?? erro('valorAnualCentavos')) : erro(campo)}
                    value={linha[campo]}
                    disabled={somenteLeitura}
                    className="mt-1 font-normal"
                    onChange={(e) => mudar({ [campo]: e.target.value })}
                  />
                </label>
              ))}
            </div>
            <div>
              <p className="text-label-md text-text-primary">Documentos comprobatórios</p>
              <p className="text-caption text-text-secondary">
                Instrumento, Plano de Trabalho, aditivo, empenho ou relatório só da OSC não comprovam, sozinhos, execução satisfatória (Anexo IV, 3.6.2).
              </p>
              {documentos.length === 0 && <p className="mt-2 text-body-sm text-text-secondary">Nenhum documento.</p>}
              <ol className="mt-2 space-y-2">
                {documentos.map((d, i) => {
                  const n = i + 1
                  const sufixo = `do documento ${n} da experiência ${numero}`
                  return (
                    <li key={i} className="flex flex-wrap items-start gap-3 rounded-input border border-border-default bg-card-bg p-3">
                      <Entrada id={`${idBase}-doc-${i}-tipo`} rotulo={`Tipo ${sufixo}`} placeholder="Tipo (ex.: Atestado)" erro={erro(`documentos.${i}.tipo`)} value={d.tipo} disabled={somenteLeitura} className="min-w-48 flex-1" onChange={(e) => mudarDocumento(i, { tipo: e.target.value })} />
                      <Entrada id={`${idBase}-doc-${i}-sei`} rotulo={`Nº SEI ${sufixo}`} placeholder="Nº SEI" erro={erro(`documentos.${i}.numeroSEI`)} value={d.numeroSEI} disabled={somenteLeitura} className="w-40" onChange={(e) => mudarDocumento(i, { numeroSEI: e.target.value })} />
                      <label className="mt-2 inline-flex items-center gap-2 text-body-sm">
                        <input type="checkbox" checked={d.comprovaExecucaoSatisfatoria} disabled={somenteLeitura} onChange={(e) => mudarDocumento(i, { comprovaExecucaoSatisfatoria: e.target.checked }, 0)} className="size-4 accent-action-primary" aria-label={`Comprova execução satisfatória (${sufixo})`} />
                        Comprova execução
                      </label>
                      <label className="mt-2 inline-flex items-center gap-2 text-body-sm">
                        <input type="checkbox" checked={d.aceito} disabled={somenteLeitura} onChange={(e) => mudarDocumento(i, { aceito: e.target.checked }, 0)} className="size-4 accent-action-primary" aria-label={`Aceito pela Comissão (${sufixo})`} />
                        Aceito
                      </label>
                      {!somenteLeitura && (
                        <Button variante="tertiary" tamanho="sm" icone={Trash2} aria-label={`Remover o documento ${n} da experiência ${numero}`} onClick={() => mudar({ documentos: documentos.filter((_, j) => j !== i) }, 0)}>
                          <span className="sr-only">Remover</span>
                        </Button>
                      )}
                    </li>
                  )
                })}
              </ol>
              {!somenteLeitura && (
                <Button
                  variante="secondary"
                  tamanho="sm"
                  icone={Plus}
                  className="mt-2"
                  onClick={() => mudar({ documentos: [...documentos, { tipo: '', numeroSEI: '', comprovaExecucaoSatisfatoria: false, aceito: false }] }, 0)}
                >
                  Adicionar documento à experiência {numero}
                </Button>
              )}
            </div>
          </td>
        </tr>
      )}
      {desconsiderando && gravada && (
        <DialogoDesconsiderar
          experiencia={gravada}
          onAplicar={(lista) => chamarApi('/api/experiencia', { metodo: 'PATCH', corpo: { ...alvo, id: gravada.id, desconsideracoes: lista } }).then(() => undefined)}
          onFechar={() => setDesconsiderando(false)}
        />
      )}
    </>
  )
}

interface Props {
  ch: string
  p: string
  sessaoId: string | null
  experiencias: ExperienciaGravada[]
  d2?: number
  dataLimite?: string
  motivoSomenteLeitura: string | null
  acaoExcluir: (experiencia: ExperienciaGravada) => ReactNode
}

export function AbaD2({ ch, p, sessaoId, experiencias, d2, dataLimite, motivoSomenteLeitura, acaoExcluir }: Props) {
  const [novas, setNovas] = useState<{ chave: string; id: string | null }[]>([])
  const contador = useRef(0)
  const criadas = new Set(novas.map((n) => n.id).filter(Boolean))
  const somenteLeitura = motivoSomenteLeitura !== null
  const linhas = [
    ...experiencias.filter((e) => !criadas.has(e.id)).map((e) => ({ chave: chaveExperiencia(p, e.id), gravada: e, nova: null })),
    ...novas.map((n) => ({ chave: n.chave, gravada: experiencias.find((e) => e.id === n.id) ?? null, nova: n })),
  ]
  const nomes = Object.fromEntries(experiencias.map((e) => [e.id, e.descricao]))

  function adicionar() {
    contador.current += 1
    setNovas((atual) => [...atual, { chave: chaveExperiencia(p, `nova-${Date.now()}-${contador.current}`), id: null }])
  }

  return (
    <div className="space-y-6">
      {motivoSomenteLeitura && (
        <Alert tom="info" titulo="Somente leitura">
          {motivoSomenteLeitura}
        </Alert>
      )}
      <section aria-label="Experiências da OSC" className="rounded-card border border-card-border bg-card-bg shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 px-(--sds-card-padding) pt-4">
          <div>
            <h3 className="text-heading-4 text-text-primary">Experiências da OSC</h3>
            <p className="text-body-sm text-text-secondary">
              D2 gravada: {d2 === undefined ? '—' : formatarNumero(d2)} de {formatarNumero(MATRIZ_2026.dimensao2.maximo)} pontos · {experiencias.length}{' '}
              experiência(s). Edite direto na linha: grava sozinho.
            </p>
          </div>
          {!somenteLeitura && (
            <Button variante="secondary" icone={Plus} onClick={adicionar}>
              Adicionar experiência
            </Button>
          )}
        </div>
        <div className="relative overflow-x-auto p-(--sds-card-padding)">
          <table aria-label="Experiências da OSC" className="w-full border-collapse text-left text-body-sm">
            <thead className="bg-table-header-bg text-table-header-fg">
              <tr>
                {COLUNAS.map((c) => (
                  <th key={c} scope="col" className={cx('h-(--sds-table-header-height) px-2 text-label-md', c === 'Ações' && 'text-right')}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas.length === 0 && (
                <tr>
                  <td colSpan={COLUNAS.length} className="px-2 py-6 text-center text-body-md text-text-secondary">
                    Nenhuma experiência cadastrada.{somenteLeitura ? '' : ' Use "Adicionar experiência".'}
                  </td>
                </tr>
              )}
              {linhas.map((l, i) => (
                <LinhaTabela
                  key={l.chave}
                  ch={ch}
                  p={p}
                  sessaoId={sessaoId}
                  numero={i + 1}
                  gravada={l.gravada}
                  chave={l.chave}
                  somenteLeitura={somenteLeitura}
                  onCriada={(id) => setNovas((atual) => atual.map((n) => (n.chave === l.chave ? { ...n, id } : n)))}
                  onDescartar={() => setNovas((atual) => atual.filter((n) => n.chave !== l.chave))}
                  acaoExcluir={l.gravada ? acaoExcluir(l.gravada) : null}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-label="Linha do tempo" className="rounded-card border border-card-border bg-card-bg p-(--sds-card-padding) shadow-card">
        <h3 className="text-heading-4 text-text-primary">Linha do tempo (categorias A e B)</h3>
        <p className="mb-3 text-body-sm text-text-secondary">Sobreposições contam uma vez só no C2.2 e só elas permitem somar no C2.3 (Anexo IV, 3.8.3).</p>
        {dataLimite ? (
          <GraficoLinhaDoTempo
            experiencias={experiencias.map((e) => ({ id: e.id, categorias: e.categorias as ('A' | 'B' | 'C' | 'D')[], inicio: e.inicio, fim: e.fim }))}
            dataLimite={dataLimite}
            nomes={nomes}
          />
        ) : (
          <Alert tom="warning" titulo="Sem data limite">
            Cadastre a data limite das propostas no chamamento.
          </Alert>
        )}
      </section>
    </div>
  )
}
