// Formulário de experiência da D2 (criar e editar), com os documentos comprobatórios.
// Valida no navegador com o esquema da /api + as regras do domínio; o valor anual é digitado em reais.

import { useFieldArray, useFormContext, type FieldValues } from 'react-hook-form'
import { Botao } from '../../componentes/basicos'
import { Campo, CampoSelecao, Formulario, mensagemDoCampo } from '../../componentes/Formulario'
import { centavosParaReais, reaisParaCentavos } from '../../domain/formatacao'
import { MATRIZ_2026 } from '../../domain/matriz'
import {
  MODALIDADES,
  ROTULO_MODALIDADE,
  esquemaCamposExperienciaComRegras,
  type CamposExperiencia,
} from '../../esquemas/experiencia'
import type { ExperienciaGravada } from './TabelaExperiencias'

const CATEGORIAS = MATRIZ_2026.dimensao2.criterios['C2.1'].categorias

function Categorias() {
  const { register, formState } = useFormContext()
  const erro = mensagemDoCampo(formState.errors, 'categorias')
  return (
    <fieldset>
      <legend className="text-sm font-medium text-slate-700">Categorias (Critério 2.1)</legend>
      <div className="mt-1 space-y-1 text-sm">
        {CATEGORIAS.map((c) => (
          <label key={c.codigo} className="flex items-start gap-2">
            <input type="checkbox" value={c.codigo} {...register('categorias')} aria-label={`Categoria ${c.codigo}`} className="mt-1" />
            <span>
              <strong className="mr-1">{c.codigo}</strong>
              <span className="text-slate-600">{c.descricao}</span>
            </span>
          </label>
        ))}
      </div>
      {erro && <p className="mt-1 text-sm text-red-700">{erro}</p>}
    </fieldset>
  )
}

function Documentos() {
  const { control, register } = useFormContext()
  const { fields, append, remove } = useFieldArray({ control, name: 'documentos' })
  return (
    <fieldset className="rounded-md border border-slate-200 p-3">
      <legend className="px-1 text-sm font-medium text-slate-700">Documentos comprobatórios</legend>
      <p className="text-xs text-slate-500">
        Instrumento, Plano de Trabalho, aditivo, empenho ou relatório só da OSC não comprovam, sozinhos, execução
        satisfatória (Anexo IV, 3.6.2).
      </p>
      <div className="mt-2 space-y-3">
        {fields.map((campo, i) => (
          <div key={campo.id} className="grid gap-2 rounded-md bg-slate-50 p-2 sm:grid-cols-2">
            <Campo nome={`documentos.${i}.tipo`} rotulo={`Tipo do documento ${i + 1}`} />
            <Campo nome={`documentos.${i}.numeroSEI`} rotulo={`Nº SEI do documento ${i + 1}`} />
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                {...register(`documentos.${i}.comprovaExecucaoSatisfatoria`)}
                aria-label={`Documento ${i + 1} comprova execução satisfatória`}
              />
              Comprova execução satisfatória
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" {...register(`documentos.${i}.aceito`)} aria-label={`Documento ${i + 1} aceito`} />
              Aceito pela Comissão
            </label>
            <div>
              <button type="button" onClick={() => remove(i)} className="text-sm text-red-700 underline">
                Remover documento {i + 1}
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2">
        <Botao onClick={() => append({ tipo: '', numeroSEI: '', comprovaExecucaoSatisfatoria: false, aceito: false })}>
          Adicionar documento
        </Botao>
      </div>
    </fieldset>
  )
}

/** Documento gravado → valores do formulário (vazio em vez de nulo; valor em reais). */
function valoresIniciais(e?: ExperienciaGravada | null): FieldValues {
  return {
    descricao: e?.descricao ?? '',
    categorias: e?.categorias ?? [],
    modalidade: e?.modalidade ?? '',
    orgaoParceiro: e?.orgaoParceiro ?? '',
    instrumento: e?.instrumento ?? '',
    mrosc: e?.mrosc ?? false,
    inicio: e?.inicio ?? '',
    fim: e?.fim ?? '',
    vagas: e?.vagas ?? '',
    unidades: e?.unidades ?? '',
    trabalhadores: e?.trabalhadores ?? '',
    valorAnual: centavosParaReais(e?.valorAnualCentavos),
    documentos: e?.documentos ?? [],
    desconsideracoes: e?.desconsideracoes ?? [],
  }
}

const nuloSeVazio = (valor: unknown) => (valor === undefined || valor === '' ? null : valor)

function transformar(v: FieldValues) {
  const categorias = Array.isArray(v.categorias) ? v.categorias : v.categorias ? [v.categorias] : []
  return {
    descricao: v.descricao,
    categorias,
    modalidade: v.modalidade || undefined,
    orgaoParceiro: v.orgaoParceiro,
    instrumento: v.instrumento,
    mrosc: Boolean(v.mrosc),
    inicio: v.inicio,
    fim: v.fim ? v.fim : null,
    vagas: nuloSeVazio(v.vagas),
    unidades: nuloSeVazio(v.unidades),
    trabalhadores: nuloSeVazio(v.trabalhadores),
    valorAnualCentavos: reaisParaCentavos((v.valorAnual as string | undefined) ?? ''),
    documentos: ((v.documentos ?? []) as FieldValues[]).map((d) => ({
      tipo: d.tipo,
      numeroSEI: d.numeroSEI,
      comprovaExecucaoSatisfatoria: Boolean(d.comprovaExecucaoSatisfatoria),
      aceito: Boolean(d.aceito),
    })),
    desconsideracoes: v.desconsideracoes ?? [],
  }
}

interface Props {
  inicial?: ExperienciaGravada | null
  onSalvar: (dados: CamposExperiencia) => Promise<void>
}

export function FormExperiencia({ inicial, onSalvar }: Props) {
  return (
    <Formulario
      key={inicial?.id ?? 'nova'}
      esquema={esquemaCamposExperienciaComRegras}
      valoresIniciais={valoresIniciais(inicial)}
      transformar={transformar}
      campoDoFormulario={(campo) => (campo === 'valorAnualCentavos' ? 'valorAnual' : campo)}
      onEnviar={onSalvar}
      rotuloEnviar="Salvar experiência"
    >
      <Campo nome="descricao" rotulo="Descrição" />
      <Categorias />
      <div className="grid gap-4 sm:grid-cols-3">
        <CampoSelecao
          nome="modalidade"
          rotulo="Modalidade"
          opcoes={MODALIDADES.map((m) => ({ valor: m, rotulo: ROTULO_MODALIDADE[m] }))}
          vazio="Selecione a modalidade…"
        />
        <Campo nome="orgaoParceiro" rotulo="Órgão parceiro" />
        <Campo nome="instrumento" rotulo="Instrumento" ajuda="Ex.: Termo de Colaboração nº 01/2019" />
      </div>
      <MroscCampo />
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo nome="inicio" rotulo="Início" tipo="date" />
        <Campo nome="fim" rotulo="Fim" tipo="date" ajuda="Vazio = em execução (considerada até a data limite)." />
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <Campo nome="vagas" rotulo="Vagas" tipo="number" />
        <Campo nome="unidades" rotulo="Unidades" tipo="number" />
        <Campo nome="trabalhadores" rotulo="Trabalhadores" tipo="number" />
        <Campo nome="valorAnual" rotulo="Valor anual (R$)" ajuda="Já atualizado pelo índice do edital." />
      </div>
      <Documentos />
    </Formulario>
  )
}

function MroscCampo() {
  const { register } = useFormContext()
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <input type="checkbox" {...register('mrosc')} />
      Parceria regida pelo MROSC (Lei 13.019/2014)
    </label>
  )
}
