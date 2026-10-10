// Formulário de experiência da D2 (criar e editar, no painel lateral), com os documentos comprobatórios.
// Seções: Identificação | Parceria | Porte | Documentos. Valida no navegador com o esquema da /api + as
// regras do domínio; o valor anual é digitado em reais.

import { Plus, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { useFieldArray, useFormContext, type FieldValues } from 'react-hook-form'
import { mensagemDoCampo } from '../../components/ui/form'
import { Button } from '../../components/ui/Button'
import { Checkbox } from '../../components/ui/Checkbox'
import { CampoLista, CampoTexto, FormularioApi } from '../../components/ui/FormularioApi'
import { MensagemErro } from '../../components/ui/Field'
import { centavosParaReais, reaisParaCentavos } from '../../domain/formatacao'
import { MATRIZ_2026 } from '../../domain/matriz'
import { MODALIDADES, ROTULO_MODALIDADE, esquemaCamposExperienciaComRegras, type CamposExperiencia } from '../../esquemas/experiencia'
import type { ExperienciaGravada } from './TabelaExperiencias'

const CATEGORIAS = MATRIZ_2026.dimensao2.criterios['C2.1'].categorias

function Grupo({ titulo, descricao, children }: { titulo: string; descricao?: string; children: ReactNode }) {
  return (
    <fieldset className="min-w-0 space-y-4 border-t border-border-default pt-4 first:border-t-0 first:pt-0">
      <legend className="float-left mb-1 w-full text-heading-4 text-text-primary">{titulo}</legend>
      {descricao && <p className="clear-left text-body-sm text-text-secondary">{descricao}</p>}
      <div className="clear-left space-y-4">{children}</div>
    </fieldset>
  )
}

function Categorias() {
  const { register, formState } = useFormContext()
  const erro = mensagemDoCampo(formState.errors, 'categorias')
  return (
    <div role="group" aria-label="Categorias (Critério 2.1)">
      <p className="mb-2 text-label-md text-text-primary">Categorias (Critério 2.1)</p>
      <ul className="space-y-2">
        {CATEGORIAS.map((c) => (
          <li key={c.codigo}>
            <Checkbox rotulo={`Categoria ${c.codigo} — ${c.descricao}`} value={c.codigo} {...register('categorias')} />
          </li>
        ))}
      </ul>
      <MensagemErro erro={erro} className="mt-2" />
    </div>
  )
}

function Documentos() {
  const { control, register } = useFormContext()
  const { fields, append, remove } = useFieldArray({ control, name: 'documentos' })
  return (
    <Grupo
      titulo="Documentos comprobatórios"
      descricao="Instrumento, Plano de Trabalho, aditivo, empenho ou relatório só da OSC não comprovam, sozinhos, execução satisfatória (Anexo IV, 3.6.2)."
    >
      {fields.length === 0 && <p className="text-body-sm text-text-secondary">Nenhum documento.</p>}
      <ol className="space-y-3">
        {fields.map((campo, i) => (
          <li key={campo.id} className="space-y-3 rounded-card border border-card-border bg-background-default p-4">
            <p className="text-label-md text-text-primary">Documento {i + 1}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <CampoTexto nome={`documentos.${i}.tipo`} rotulo={`Tipo do documento ${i + 1}`} />
              <CampoTexto nome={`documentos.${i}.numeroSEI`} rotulo={`Nº SEI do documento ${i + 1}`} />
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <Checkbox rotulo={`Documento ${i + 1} comprova execução satisfatória`} {...register(`documentos.${i}.comprovaExecucaoSatisfatoria`)} />
              <Checkbox rotulo={`Documento ${i + 1} aceito pela Comissão`} {...register(`documentos.${i}.aceito`)} />
            </div>
            <Button variante="tertiary" tamanho="sm" icone={Trash2} onClick={() => remove(i)}>
              Remover documento {i + 1}
            </Button>
          </li>
        ))}
      </ol>
      <Button variante="secondary" tamanho="sm" icone={Plus} onClick={() => append({ tipo: '', numeroSEI: '', comprovaExecucaoSatisfatoria: false, aceito: false })}>
        Adicionar documento
      </Button>
    </Grupo>
  )
}

function MroscCampo() {
  const { register } = useFormContext()
  return <Checkbox rotulo="Parceria regida pelo MROSC (Lei 13.019/2014)" {...register('mrosc')} />
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
  /** Ações à esquerda de "Salvar experiência" (ex.: Cancelar). */
  acoesSecundarias?: ReactNode
}

export function FormExperiencia({ inicial, onSalvar, acoesSecundarias }: Props) {
  return (
    <FormularioApi
      key={inicial?.id ?? 'nova'}
      rotulo={inicial ? `Editar experiência ${inicial.descricao}` : 'Nova experiência'}
      esquema={esquemaCamposExperienciaComRegras}
      valoresIniciais={valoresIniciais(inicial)}
      transformar={transformar}
      campoDoFormulario={(campo) => (campo === 'valorAnualCentavos' ? 'valorAnual' : campo)}
      onEnviar={onSalvar}
      rotuloEnviar="Salvar experiência"
      acoesSecundarias={acoesSecundarias}
    >
      <Grupo titulo="Identificação">
        <CampoTexto nome="descricao" rotulo="Descrição" />
        <Categorias />
      </Grupo>
      <Grupo titulo="Parceria">
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoLista
            nome="modalidade"
            rotulo="Modalidade"
            opcoes={MODALIDADES.map((m) => ({ valor: m, rotulo: ROTULO_MODALIDADE[m] }))}
            vazio="Selecione a modalidade…"
          />
          <CampoTexto nome="orgaoParceiro" rotulo="Órgão parceiro" />
          <CampoTexto nome="instrumento" rotulo="Instrumento" ajuda="Ex.: Termo de Colaboração nº 01/2019" className="sm:col-span-2" />
        </div>
        <MroscCampo />
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoTexto nome="inicio" rotulo="Início" tipo="date" />
          <CampoTexto nome="fim" rotulo="Fim" tipo="date" ajuda="Vazio = em execução (considerada até a data limite)." />
        </div>
      </Grupo>
      <Grupo titulo="Porte">
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoTexto nome="vagas" rotulo="Vagas" tipo="number" />
          <CampoTexto nome="unidades" rotulo="Unidades" tipo="number" />
          <CampoTexto nome="trabalhadores" rotulo="Trabalhadores" tipo="number" />
          <CampoTexto nome="valorAnual" rotulo="Valor anual (R$)" ajuda="Já atualizado pelo índice do edital." />
        </div>
      </Grupo>
      <Documentos />
    </FormularioApi>
  )
}
