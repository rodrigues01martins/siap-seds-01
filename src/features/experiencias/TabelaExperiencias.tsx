// Tabela das experiências da D2 com documentos de cada uma, editar/excluir e "desconsiderar"
// por critério com justificativa obrigatória (Anexo IV, 3.8.5).

import { Fragment, useState } from 'react'
import { Botao, dataBr } from '../../componentes/basicos'
import { CRITERIOS_D2, type CodigoCriterioD2, type Desconsideracao } from '../../domain/d2'
import { formatarReais } from '../../domain/formatacao'
import { MATRIZ_2026 } from '../../domain/matriz'
import { camposDoErro, z } from '../../esquemas/base'
import { ROTULO_MODALIDADE, esquemaDesconsideracao, type DocumentoExperiencia, type Modalidade } from '../../esquemas/experiencia'

export interface ExperienciaGravada {
  id: string
  descricao: string
  categorias: string[]
  modalidade?: Modalidade
  orgaoParceiro?: string
  instrumento?: string
  mrosc?: boolean
  inicio: string
  fim: string | null
  vagas?: number | null
  unidades?: number | null
  trabalhadores?: number | null
  valorAnualCentavos?: number | null
  documentos?: DocumentoExperiencia[]
  desconsideracoes?: Desconsideracao[]
}

interface Props {
  experiencias: ExperienciaGravada[]
  somenteLeitura: boolean
  onEditar: (id: string) => void
  onExcluir: (id: string) => void
  onDesconsiderar: (id: string, desconsideracoes: Desconsideracao[]) => Promise<void>
}

const TITULO_CRITERIO: Record<CodigoCriterioD2, string> = Object.fromEntries(
  CRITERIOS_D2.map((c) => [c, MATRIZ_2026.dimensao2.criterios[c].titulo]),
) as Record<CodigoCriterioD2, string>

const esquemaLista = z.array(esquemaDesconsideracao)
const sim = (valor: boolean | undefined) => (valor ? 'sim' : 'não')
const numero = (valor: number | null | undefined) => (valor == null ? '—' : valor.toLocaleString('pt-BR'))

function DialogoDesconsiderar({
  experiencia,
  onAplicar,
  onFechar,
}: {
  experiencia: ExperienciaGravada
  onAplicar: (lista: Desconsideracao[]) => Promise<void>
  onFechar: () => void
}) {
  const atuais = experiencia.desconsideracoes ?? []
  const [marcados, setMarcados] = useState<CodigoCriterioD2[]>(atuais.map((d) => d.criterio))
  const [justificativa, setJustificativa] = useState(atuais[0]?.justificativa ?? '')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function aplicar() {
    const lista = marcados.map((criterio) => ({ criterio, justificativa }))
    const resultado = esquemaLista.safeParse(lista)
    if (!resultado.success) {
      setErro(Object.values(camposDoErro(resultado.error))[0] ?? 'Dados inválidos.')
      return
    }
    setErro(null)
    setEnviando(true)
    try {
      await onAplicar(resultado.data)
      onFechar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível aplicar.')
    } finally {
      setEnviando(false)
    }
  }

  const idJustificativa = `justificativa-${experiencia.id}`
  return (
    <div
      role="dialog"
      aria-label={`Desconsiderar ${experiencia.descricao}`}
      className="mt-2 space-y-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm"
    >
      <p className="font-medium">
        Desconsiderar “{experiencia.descricao}” nos critérios em que a documentação não comprova o elemento
        necessário (Anexo IV, 3.8.5).
      </p>
      <fieldset className="space-y-1">
        <legend className="sr-only">Critérios</legend>
        {CRITERIOS_D2.map((criterio) => (
          <label key={criterio} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={marcados.includes(criterio)}
              onChange={(e) =>
                setMarcados((atual) => (e.target.checked ? [...atual, criterio] : atual.filter((c) => c !== criterio)))
              }
            />
            {criterio} — {TITULO_CRITERIO[criterio]}
          </label>
        ))}
      </fieldset>
      <div>
        <label htmlFor={idJustificativa} className="block font-medium">
          Justificativa (Anexo IV, 3.8.5)
        </label>
        <textarea
          id={idJustificativa}
          rows={2}
          value={justificativa}
          onChange={(e) => setJustificativa(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </div>
      {erro && <p className="text-red-700">{erro}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={aplicar}
          disabled={enviando}
          className="rounded-md bg-amber-700 px-3 py-1.5 font-medium text-white disabled:opacity-50"
        >
          Aplicar
        </button>
        <Botao onClick={onFechar}>Cancelar</Botao>
      </div>
    </div>
  )
}

function Documentos({ experiencia }: { experiencia: ExperienciaGravada }) {
  const documentos = experiencia.documentos ?? []
  if (documentos.length === 0) return <p className="text-sm text-slate-500">Nenhum documento.</p>
  return (
    <table aria-label={`Documentos de ${experiencia.descricao}`} className="w-full text-sm">
      <thead className="text-left text-slate-600">
        <tr>
          <th className="py-1 pr-3 font-medium">Tipo</th>
          <th className="py-1 pr-3 font-medium">Nº SEI</th>
          <th className="py-1 pr-3 font-medium">Execução satisfatória</th>
          <th className="py-1 font-medium">Aceito</th>
        </tr>
      </thead>
      <tbody>
        {documentos.map((d, i) => (
          <tr key={`${d.numeroSEI}-${i}`} aria-label={d.tipo} className="border-t border-slate-200">
            <td className="py-1 pr-3">{d.tipo}</td>
            <td className="py-1 pr-3">{d.numeroSEI}</td>
            <td className="py-1 pr-3">Comprova execução satisfatória: {sim(d.comprovaExecucaoSatisfatoria)}</td>
            <td className="py-1">Aceito: {sim(d.aceito)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const COLUNAS = [
  'Experiência',
  'Categorias',
  'Modalidade',
  'Órgão parceiro',
  'Instrumento',
  'Início',
  'Fim',
  'MROSC',
  'Vagas',
  'Unidades',
  'Trabalhadores',
  'Valor anual',
  'Documentos',
]

export function TabelaExperiencias({ experiencias, somenteLeitura, onEditar, onExcluir, onDesconsiderar }: Props) {
  const [abertos, setAbertos] = useState<Record<string, boolean>>({})
  const [desconsiderando, setDesconsiderando] = useState<string | null>(null)
  const colunas = somenteLeitura ? COLUNAS : [...COLUNAS, 'Ações']

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table aria-label="Experiências da OSC" className="w-full text-left text-sm">
        <thead className="bg-slate-100 text-slate-700">
          <tr>
            {colunas.map((c) => (
              <th key={c} scope="col" className="whitespace-nowrap px-3 py-2 font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {experiencias.length === 0 && (
            <tr>
              <td colSpan={colunas.length} className="px-3 py-4 text-slate-500">
                Nenhuma experiência cadastrada.
              </td>
            </tr>
          )}
          {experiencias.map((e) => {
            const documentos = e.documentos ?? []
            const desconsideradas = e.desconsideracoes ?? []
            return (
              <Fragment key={e.id}>
                <tr aria-label={e.descricao} className="border-t border-slate-100 align-top">
                  <td className="px-3 py-2">
                    <span className="font-medium">{e.descricao}</span>
                    {desconsideradas.length > 0 && (
                      <span className="mt-1 block text-xs text-amber-800">
                        Desconsiderada em {desconsideradas.map((d) => d.criterio).join(', ')}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">{e.categorias.join(', ')}</td>
                  <td className="px-3 py-2">{e.modalidade ? ROTULO_MODALIDADE[e.modalidade] : '—'}</td>
                  <td className="px-3 py-2">{e.orgaoParceiro ?? '—'}</td>
                  <td className="px-3 py-2">{e.instrumento ?? '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2">{dataBr(e.inicio)}</td>
                  <td className="whitespace-nowrap px-3 py-2">{e.fim ? dataBr(e.fim) : 'em execução'}</td>
                  <td className="px-3 py-2">{e.mrosc ? 'Sim' : 'Não'}</td>
                  <td className="px-3 py-2 text-right">{numero(e.vagas)}</td>
                  <td className="px-3 py-2 text-right">{numero(e.unidades)}</td>
                  <td className="px-3 py-2 text-right">{numero(e.trabalhadores)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    {e.valorAnualCentavos == null ? '—' : formatarReais(e.valorAnualCentavos)}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      aria-label={`Documentos (${documentos.length}) de ${e.descricao}`}
                      aria-expanded={abertos[e.id] ?? false}
                      onClick={() => setAbertos((atual) => ({ ...atual, [e.id]: !atual[e.id] }))}
                      className="whitespace-nowrap text-sky-800 underline"
                    >
                      Documentos ({documentos.length})
                    </button>
                  </td>
                  {!somenteLeitura && (
                    <td className="px-3 py-2">
                      <span className="flex flex-wrap gap-2">
                        <button type="button" aria-label={`Editar ${e.descricao}`} onClick={() => onEditar(e.id)} className="text-sky-800 underline">
                          Editar
                        </button>
                        <button
                          type="button"
                          aria-label={`Desconsiderar ${e.descricao}`}
                          onClick={() => setDesconsiderando(e.id)}
                          className="text-amber-800 underline"
                        >
                          Desconsiderar
                        </button>
                        <button type="button" aria-label={`Excluir ${e.descricao}`} onClick={() => onExcluir(e.id)} className="text-red-700 underline">
                          Excluir
                        </button>
                      </span>
                    </td>
                  )}
                </tr>
                {(abertos[e.id] || desconsiderando === e.id) && (
                  <tr>
                    <td colSpan={colunas.length} className="bg-slate-50 px-3 py-2">
                      {abertos[e.id] && <Documentos experiencia={e} />}
                      {desconsiderando === e.id && (
                        <DialogoDesconsiderar
                          experiencia={e}
                          onAplicar={(lista) => onDesconsiderar(e.id, lista)}
                          onFechar={() => setDesconsiderando(null)}
                        />
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
