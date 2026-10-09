// Admissibilidade do Caderno (Anexo III, item 28): checklist dos requisitos essenciais (28.1, do JSON),
// tabela de páginas por PA com página de corte (limite do JSON) e alerta visual quando excede,
// irregularidades meramente formais (28.5) e resultado com motivação.
// Ausência de qualquer PA → desclassificação automática (28.2), mostrada antes de enviar.

import { useFormContext, useWatch, type FieldValues } from 'react-hook-form'
import { Campo, Formulario, mensagemDoCampo } from '../../componentes/Formulario'
import { apurarPlano, type Admissibilidade, type PaginasPlano } from '../../domain/admissibilidade'
import { MATRIZ_2026 } from '../../domain/matriz'
import { esquemaCamposAdmissibilidadeComRegras, type CamposAdmissibilidade } from '../../esquemas/admissibilidade'

const REGRAS = MATRIZ_2026.admissibilidade
const PLANOS = MATRIZ_2026.dimensao1.planos

interface LinhaPlano {
  codigo: string
  ausente: boolean
  paginaInicial: number | '' | undefined
  paginaFinal: number | '' | undefined
}

const numero = (valor: unknown) =>
  typeof valor === 'number' && Number.isFinite(valor) ? valor : null

const comoPlano = (linha: LinhaPlano | undefined, codigo: string): PaginasPlano => ({
  codigo,
  ausente: Boolean(linha?.ausente),
  paginaInicial: linha?.ausente ? null : numero(linha?.paginaInicial),
  paginaFinal: linha?.ausente ? null : numero(linha?.paginaFinal),
})

function Requisitos() {
  const { register, formState, control } = useFormContext()
  const planos = (useWatch({ control, name: 'planos' }) ?? []) as LinhaPlano[]
  const todosPresentes = planos.every((p) => !p?.ausente)
  const erro = mensagemDoCampo(formState.errors, 'requisitosAtendidos')
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-slate-800">Requisitos essenciais (Anexo III, 28.1)</legend>
      <p className="text-xs text-slate-500">Marque os requisitos atendidos. O 28.1.VII é apurado pela tabela de páginas.</p>
      <ul className="mt-2 space-y-1 text-sm">
        {REGRAS.requisitosEssenciais.map((r) => {
          const rotulo = `${r.codigo} — ${r.descricao}`
          return (
            <li key={r.codigo}>
              <label className="flex items-start gap-2">
                {r.codigo === REGRAS.requisitoPlanos ? (
                  <input type="checkbox" checked={todosPresentes} readOnly disabled aria-label={rotulo} className="mt-1" />
                ) : (
                  <input type="checkbox" value={r.codigo} {...register('requisitosAtendidos')} aria-label={rotulo} className="mt-1" />
                )}
                <span>
                  <strong className="mr-1">{r.codigo}</strong>
                  {r.descricao}
                </span>
              </label>
            </li>
          )
        })}
      </ul>
      {erro && <p className="mt-1 text-sm text-red-700">{erro}</p>}
    </fieldset>
  )
}

function CelulaPagina({ indice, campo, codigo }: { indice: number; campo: 'paginaInicial' | 'paginaFinal'; codigo: string }) {
  const { register, formState, control } = useFormContext()
  const ausente = useWatch({ control, name: `planos.${indice}.ausente` }) as boolean | undefined
  const nome = `planos.${indice}.${campo}`
  const erro = mensagemDoCampo(formState.errors, nome)
  const rotulo = `${campo === 'paginaInicial' ? 'Página inicial' : 'Página final'} do ${codigo}`
  return (
    <td className="px-2 py-1">
      <input
        type="number"
        min={1}
        {...register(nome, { setValueAs: (v: unknown) => (v === '' || v == null ? undefined : Number(v)) })}
        disabled={ausente}
        aria-label={rotulo}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? `${nome}-erro` : undefined}
        className="w-20 rounded-md border border-slate-300 px-2 py-1 disabled:bg-slate-100 aria-[invalid=true]:border-red-500"
      />
      {erro && (
        <p id={`${nome}-erro`} className="mt-1 text-xs text-red-700">
          {erro}
        </p>
      )}
    </td>
  )
}

function TabelaPaginas() {
  const { register, control, formState } = useFormContext()
  const linhas = (useWatch({ control, name: 'planos' }) ?? []) as LinhaPlano[]
  const ausentes = PLANOS.filter((_, i) => linhas[i]?.ausente).map((p) => p.codigo)
  const erroGrupo = mensagemDoCampo(formState.errors, 'planos')

  return (
    <section>
      <h3 className="text-sm font-semibold text-slate-800">Páginas por Plano de Ação</h3>
      <p className="text-xs text-slate-500">
        Numeração do Caderno no SEI. Página de corte = página inicial + limite do PA − 1 ({MATRIZ_2026.dimensao1.fonteLimitePaginas}).
      </p>
      {ausentes.length > 0 && (
        <div role="alert" aria-label="Desclassificação" className="mt-2 rounded-md border-2 border-red-500 bg-red-50 p-3 text-sm font-medium text-red-900">
          Ausência do {ausentes.join(', ')}: desclassificação automática da proposta (Anexo III, 28.2).
        </div>
      )}
      <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table aria-label="Páginas por Plano de Ação" className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              {['PA', 'Ausente', 'Página inicial', 'Página final', 'Páginas', 'Limite', 'Página de corte', 'Situação'].map((t) => (
                <th key={t} scope="col" className="px-2 py-2 font-medium">
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PLANOS.map((pa, i) => {
              const apurado = apurarPlano(comoPlano(linhas[i], pa.codigo), pa.limitePaginas)
              const excede = apurado.excede > 0
              return (
                <tr
                  key={pa.codigo}
                  aria-label={`${pa.codigo} — ${pa.titulo}`}
                  data-excede={excede ? 'true' : 'false'}
                  className={`border-t border-slate-100 ${excede ? 'bg-red-50' : apurado.ausente ? 'bg-slate-50 text-slate-500' : ''}`}
                >
                  <td className="px-2 py-1 font-medium">{pa.codigo}</td>
                  <td className="px-2 py-1">
                    <input type="checkbox" {...register(`planos.${i}.ausente`)} aria-label={`${pa.codigo} ausente`} />
                  </td>
                  <CelulaPagina indice={i} campo="paginaInicial" codigo={pa.codigo} />
                  <CelulaPagina indice={i} campo="paginaFinal" codigo={pa.codigo} />
                  <td className="px-2 py-1 text-right">{apurado.paginas ?? '—'}</td>
                  <td className="px-2 py-1 text-right">{pa.limitePaginas}</td>
                  <td className="px-2 py-1 text-right">{apurado.paginaCorte ?? '—'}</td>
                  <td className="px-2 py-1">
                    {apurado.ausente ? (
                      <span className="font-medium text-red-800">Ausente</span>
                    ) : excede ? (
                      <span className="font-semibold text-red-800">
                        Excede o limite de {pa.limitePaginas} em {apurado.excede} página(s)
                      </span>
                    ) : apurado.paginas !== null ? (
                      <span className="text-emerald-800">Dentro do limite</span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {erroGrupo && <p className="mt-1 text-sm text-red-700">{erroGrupo}</p>}
      <p className="mt-1 text-xs text-slate-500">{REGRAS.tratamentoPlanoIlegivel}</p>
    </section>
  )
}

function Irregularidades() {
  const { register } = useFormContext()
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-slate-800">Irregularidades meramente formais (Anexo III, 28.5)</legend>
      <p className="text-xs text-slate-500">{REGRAS.irregularidadesFormais.observacao}</p>
      <ul className="mt-2 space-y-1 text-sm">
        {REGRAS.irregularidadesFormais.tipos.map((t) => (
          <li key={t.codigo}>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                value={t.codigo}
                {...register('irregularidadesFormais')}
                aria-label={`${t.codigo} — ${t.descricao}`}
                className="mt-1"
              />
              <span>
                <strong className="mr-1">{t.codigo}</strong>
                {t.descricao}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <div className="mt-2">
        <Campo nome="observacaoIrregularidades" rotulo="Observação sobre as irregularidades" tipo="textarea" />
      </div>
    </fieldset>
  )
}

function Resultado() {
  const { register, formState } = useFormContext()
  const resultado = useWatch({ name: 'resultado' }) as string | undefined
  const erro = mensagemDoCampo(formState.errors, 'resultado')
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-slate-800">Resultado</legend>
      <div className="mt-1 flex gap-6 text-sm">
        <label className="inline-flex items-center gap-2">
          <input type="radio" value="admitida" {...register('resultado')} /> Admitida
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="radio" value="nao_admitida" {...register('resultado')} /> Não admitida
        </label>
      </div>
      {erro && <p className="mt-1 text-sm text-red-700">{erro}</p>}
      {resultado === 'nao_admitida' && (
        <div className="mt-2">
          <Campo nome="motivacao" rotulo="Motivação" tipo="textarea" ajuda="Obrigatória quando a proposta não é admitida." />
        </div>
      )}
    </fieldset>
  )
}

function valoresIniciais(valor?: Admissibilidade | null): FieldValues {
  return {
    requisitosAtendidos: valor
      ? Object.entries(valor.requisitos).filter(([c, ok]) => ok && c !== REGRAS.requisitoPlanos).map(([c]) => c)
      : [],
    irregularidadesFormais: valor?.irregularidadesFormais ?? [],
    observacaoIrregularidades: valor?.observacaoIrregularidades ?? '',
    planos: PLANOS.map((pa) => {
      const p = valor?.planos.find((x) => x.codigo === pa.codigo)
      return { codigo: pa.codigo, ausente: p?.ausente ?? false, paginaInicial: p?.paginaInicial ?? '', paginaFinal: p?.paginaFinal ?? '' }
    }),
    resultado: valor?.resultado ?? '',
    motivacao: valor?.motivacao ?? '',
  }
}

function transformar(v: FieldValues) {
  const atendidos = Array.isArray(v.requisitosAtendidos) ? v.requisitosAtendidos : v.requisitosAtendidos ? [v.requisitosAtendidos] : []
  const irregularidades = Array.isArray(v.irregularidadesFormais) ? v.irregularidadesFormais : v.irregularidadesFormais ? [v.irregularidadesFormais] : []
  return {
    requisitos: Object.fromEntries(
      REGRAS.requisitosEssenciais.filter((r) => r.codigo !== REGRAS.requisitoPlanos).map((r) => [r.codigo, atendidos.includes(r.codigo)]),
    ),
    irregularidadesFormais: irregularidades,
    observacaoIrregularidades: v.observacaoIrregularidades,
    planos: PLANOS.map((pa, i) => comoPlano((v.planos as LinhaPlano[] | undefined)?.[i], pa.codigo)),
    resultado: v.resultado || undefined,
    motivacao: v.resultado === 'nao_admitida' ? v.motivacao : undefined,
  }
}

interface Props {
  valor?: Admissibilidade | null
  somenteLeitura: boolean
  motivoSomenteLeitura?: string
  onSalvar: (corpo: CamposAdmissibilidade) => Promise<void>
}

export function FormAdmissibilidade({ valor, somenteLeitura, motivoSomenteLeitura, onSalvar }: Props) {
  return (
    <div className="space-y-4">
      {somenteLeitura && motivoSomenteLeitura && (
        <p className="rounded-md bg-slate-100 p-2 text-sm text-slate-700">{motivoSomenteLeitura}</p>
      )}
      <Formulario
        esquema={esquemaCamposAdmissibilidadeComRegras}
        valoresIniciais={valoresIniciais(valor)}
        transformar={transformar}
        campoDoFormulario={(campo) => (campo === 'requisitos' ? 'requisitosAtendidos' : campo)}
        onEnviar={onSalvar}
        rotuloEnviar="Registrar admissibilidade"
        somenteLeitura={somenteLeitura}
      >
        <Requisitos />
        <TabelaPaginas />
        <Irregularidades />
        <Resultado />
      </Formulario>
    </div>
  )
}
