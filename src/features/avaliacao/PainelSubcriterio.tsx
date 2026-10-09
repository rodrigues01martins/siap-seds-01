// Painel de um subcritério da D1: elementos de avaliação (apoio, não gera nota), escala 0–4 com
// descritores sempre visíveis, decisão, voto divergente, justificativa e páginas citadas.
// Valida no navegador com o mesmo esquema da /api + as regras de src/domain (página de corte,
// justificativa mínima) e avisa ANTES de enviar quando a página citada passa do corte do PA.

import { useState } from 'react'
import { useFormContext, useWatch, type FieldValues } from 'react-hook-form'
import { Campo, Formulario, mensagemDoCampo } from '../../componentes/Formulario'
import {
  JUSTIFICATIVA_MINIMA_PADRAO,
  ehEliminatorio,
  lerPaginas,
  paginasAcimaDoCorte,
  planoDoSubcriterio,
} from '../../domain/avaliacao'
import { MATRIZ_2026 } from '../../domain/matriz'
import { esquemaCamposComRegras, type CamposRegistro } from '../../esquemas/avaliacao'

export interface RegistroGravado {
  nivel: number
  justificativa: string
  paginas: number[]
  decisao: 'unanimidade' | 'maioria'
  votoDivergente?: string
}

interface Props {
  codigo: string
  registro?: RegistroGravado | null
  justificativaMinima?: number
  somenteLeitura: boolean
  motivoSomenteLeitura?: string
  onSalvar: (dados: CamposRegistro) => Promise<void>
}

const ESCALA = MATRIZ_2026.dimensao1.escala
const SITUACOES = ['Presente', 'Parcial', 'Ausente'] as const

/** Elementos de avaliação com marcação local (só apoio à discussão; nada é gravado). */
function ChecklistElementos({ codigo, elementos }: { codigo: string; elementos: string[] }) {
  const [marcas, setMarcas] = useState<Record<number, string>>({})
  return (
    <section className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <h3 className="text-sm font-semibold text-slate-700">Elementos de avaliação</h3>
      <p className="text-xs text-slate-500">Apoio à discussão — não gera nota.</p>
      <ol className="mt-2 space-y-2">
        {elementos.map((elemento, i) => (
          <li key={elemento}>
            <fieldset className="text-sm">
              <legend className="sr-only">Elemento {i + 1}</legend>
              <p className="text-slate-800">{elemento}</p>
              <div className="mt-1 flex gap-4">
                {SITUACOES.map((situacao) => (
                  <label key={situacao} className="inline-flex items-center gap-1 text-slate-600">
                    <input
                      type="radio"
                      name={`elemento-${codigo}-${i}`}
                      checked={marcas[i] === situacao}
                      onChange={() => setMarcas((atual) => ({ ...atual, [i]: situacao }))}
                    />
                    {situacao}
                  </label>
                ))}
              </div>
            </fieldset>
          </li>
        ))}
      </ol>
    </section>
  )
}

function Escala() {
  const { register, formState } = useFormContext()
  const erro = mensagemDoCampo(formState.errors, 'nivel')
  return (
    <fieldset>
      <legend className="text-sm font-medium text-slate-700">Nível</legend>
      <div className="mt-1 space-y-1">
        {ESCALA.map(({ nivel, descritor }) => (
          <label key={nivel} className="flex items-start gap-2 rounded-md border border-slate-200 bg-white p-2 text-sm">
            <input
              type="radio"
              value={String(nivel)}
              {...register('nivel')}
              aria-label={`Nível ${nivel}`}
              aria-describedby={`descritor-nivel-${nivel}`}
              className="mt-1"
            />
            <span>
              <strong className="mr-2">Nível {nivel}</strong>
              <span id={`descritor-nivel-${nivel}`} className="text-slate-700">
                {descritor}
              </span>
            </span>
          </label>
        ))}
      </div>
      {erro && <p className="mt-1 text-sm text-red-700">{erro}</p>}
    </fieldset>
  )
}

function AlertaEliminatorio({ codigo }: { codigo: string }) {
  const nivel = useWatch({ name: 'nivel' }) as string | undefined
  if (nivel !== '0' || !ehEliminatorio(codigo)) return null
  return (
    <div
      role="alert"
      aria-label="Subcritério eliminatório"
      className="rounded-md border-2 border-red-500 bg-red-50 p-3 text-sm font-medium text-red-900"
    >
      Nível 0 no subcritério {codigo} implica desclassificação da proposta, independentemente da pontuação
      global (Anexo IV, 3.10).
    </div>
  )
}

function Decisao() {
  const { register, formState } = useFormContext()
  const decisao = useWatch({ name: 'decisao' }) as string | undefined
  const erro = mensagemDoCampo(formState.errors, 'decisao')
  return (
    <>
      <fieldset>
        <legend className="text-sm font-medium text-slate-700">Decisão da Comissão</legend>
        <div className="mt-1 flex gap-6 text-sm">
          <label className="inline-flex items-center gap-2">
            <input type="radio" value="unanimidade" {...register('decisao')} /> Unanimidade
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="radio" value="maioria" {...register('decisao')} /> Maioria
          </label>
        </div>
        {erro && <p className="mt-1 text-sm text-red-700">{erro}</p>}
      </fieldset>
      {decisao === 'maioria' && <Campo nome="votoDivergente" rotulo="Voto divergente" tipo="textarea" />}
    </>
  )
}

function Justificativa({ minimo }: { minimo: number }) {
  const texto = (useWatch({ name: 'justificativa' }) as string | undefined) ?? ''
  const tamanho = texto.trim().length
  return (
    <div>
      <Campo nome="justificativa" rotulo="Justificativa" tipo="textarea" />
      <p className={`mt-1 text-xs ${tamanho < minimo ? 'text-amber-700' : 'text-slate-500'}`}>
        {tamanho} / mín. {minimo} caracteres
      </p>
    </div>
  )
}

function AvisoCorte({ codigo }: { codigo: string }) {
  const texto = (useWatch({ name: 'paginas' }) as string | undefined) ?? ''
  const corte = paginasAcimaDoCorte(codigo, lerPaginas(texto).paginas)
  if (!corte || corte.acima.length === 0) return null
  const lista = corte.acima.join(', ')
  return (
    <p role="status" aria-label="Aviso de página de corte" className="rounded-md bg-amber-50 p-2 text-sm text-amber-900">
      {corte.acima.length === 1 ? 'Página' : 'Páginas'} {lista} acima do limite de {corte.limite} páginas do{' '}
      {corte.plano} (página de corte). Corrija antes de salvar: a /api recusa.
    </p>
  )
}

export function PainelSubcriterio({
  codigo,
  registro,
  justificativaMinima,
  somenteLeitura,
  motivoSomenteLeitura,
  onSalvar,
}: Props) {
  const plano = planoDoSubcriterio(codigo)
  const subcriterio = plano?.subcriterios.find((s) => s.codigo === codigo)
  if (!plano || !subcriterio) return <p className="text-red-700">Subcritério {codigo} não existe na matriz.</p>
  const minimo = justificativaMinima ?? JUSTIFICATIVA_MINIMA_PADRAO

  const transformar = (v: FieldValues) => {
    const { paginas, invalidos } = lerPaginas((v.paginas as string | undefined) ?? '')
    const voto = (v.votoDivergente as string | undefined)?.trim()
    return {
      codigo,
      nivel: v.nivel === '' || v.nivel == null ? undefined : Number(v.nivel),
      justificativa: v.justificativa ?? '',
      // Texto que não é página vira 0: o domínio recusa com a mensagem certa.
      paginas: [...paginas, ...invalidos.map(() => 0)],
      decisao: v.decisao || undefined,
      ...(v.decisao === 'maioria' && voto ? { votoDivergente: voto } : {}),
    }
  }

  return (
    <article className="space-y-4">
      <header>
        <p className="text-xs uppercase tracking-wide text-slate-500">
          {plano.codigo} — {plano.titulo}
        </p>
        <h2 className="text-lg font-semibold text-slate-900">
          {subcriterio.codigo} — {subcriterio.titulo}
        </h2>
        <p className="text-xs text-slate-500">
          Limite do {plano.codigo}: {plano.limitePaginas} páginas (numeração interna do PA).
        </p>
      </header>

      <ChecklistElementos codigo={codigo} elementos={subcriterio.elementos} />

      {somenteLeitura && motivoSomenteLeitura && (
        <p className="rounded-md bg-slate-100 p-2 text-sm text-slate-700">{motivoSomenteLeitura}</p>
      )}

      <Formulario
        key={codigo}
        esquema={esquemaCamposComRegras(justificativaMinima)}
        valoresIniciais={{
          nivel: registro ? String(registro.nivel) : '',
          decisao: registro?.decisao ?? '',
          votoDivergente: registro?.votoDivergente ?? '',
          justificativa: registro?.justificativa ?? '',
          paginas: registro?.paginas.join(', ') ?? '',
        }}
        transformar={transformar}
        onEnviar={onSalvar}
        rotuloEnviar="Salvar avaliação"
        somenteLeitura={somenteLeitura}
      >
        <Escala />
        <AlertaEliminatorio codigo={codigo} />
        <Decisao />
        <Justificativa minimo={minimo} />
        <Campo
          nome="paginas"
          rotulo="Páginas citadas"
          ajuda={`Numeração do ${plano.codigo}, separadas por vírgula (1 a ${plano.limitePaginas}).`}
        />
        <AvisoCorte codigo={codigo} />
      </Formulario>
    </article>
  )
}
