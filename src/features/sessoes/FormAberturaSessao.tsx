// Abertura da sessão em assistente (WizardPage, §13 "stepper"): 1. Abertura (data) → 2. Presentes e
// declarações (uma linha por membro) → 3. Pauta (e revisão). Um único formulário: as etapas inativas ficam
// ocultas (hidden), "Avançar" valida só os campos da etapa e, se o envio falhar, o assistente volta à
// primeira etapa com erro. Ao enviar, vira o corpo de POST /api/sessao, validado pelo mesmo esquema da /api.

import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useFormContext, useFormState, useWatch, type FieldValues } from 'react-hook-form'
import { mensagemDoCampo } from '../../components/ui/form'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Checkbox } from '../../components/ui/Checkbox'
import { Icone } from '../../components/ui/Icone'
import { CampoTexto, FormularioApi } from '../../components/ui/FormularioApi'
import { ListaDescricao } from '../../components/ui/ListaDescricao'
import { Badge } from '../../components/ui/StatusBadge'
import { TextField } from '../../components/ui/TextField'
import { ROTULO_PAPEL, type PapelComissao } from '../../domain/comissao'
import type { z } from '../../esquemas/base'
import { esquemaAbrirSessao, type Declaracao } from '../../esquemas/sessao'
import { dataBr } from '../../lib/datas'

export interface MembroComissao {
  uid: string
  email: string | null
  /** Papel na Comissão (usuarios/{uid}.comissao). */
  perfil: PapelComissao
}

export interface PropostaPauta {
  id: string
  rotulo: string
}

interface LinhaMembro {
  uid: string
  presente: boolean
  semImpedimento: boolean
  motivo: string
}

export const esquemaFormAbertura = esquemaAbrirSessao.omit({ chamamentoId: true })
export type CorpoAbertura = z.output<typeof esquemaFormAbertura>

export const PASSOS_ABERTURA = ['Abertura', 'Presentes e declarações', 'Pauta'] as const
/** Campos validados ao avançar. Os motivos vão nominalmente: o trigger do react-hook-form não grava erros
 *  aninhados de uma lista ("membros.1.motivo") quando recebe só o nome da lista. */
const camposDoPasso = (passo: number, membros: number) =>
  [['data'], ['membros', ...Array.from({ length: membros }, (_, i) => `membros.${i}.motivo`)], ['pauta']][passo]!
const passoDoCampo = (campo: string) => (campo.startsWith('membros') ? 1 : campo === 'pauta' ? 2 : 0)

/** Linhas dos membros → presentes e declarações (só de quem está presente). */
export function corpoDosMembros(linhas: LinhaMembro[]): { presentes: string[]; declaracoes: Declaracao[] } {
  const presentes = linhas.filter((l) => l.presente)
  return {
    presentes: presentes.map((l) => l.uid),
    declaracoes: presentes.map((l): Declaracao => {
      const motivo = l.motivo?.trim()
      return l.semImpedimento ? { uid: l.uid, semImpedimento: true } : { uid: l.uid, semImpedimento: false, ...(motivo ? { motivo } : {}) }
    }),
  }
}

/** "declaracoes.1.motivo" → "membros.<linha do uid>.motivo"; presentes/declaracoes → grupo dos membros. */
export function campoDosMembros(campoApi: string, corpo: unknown, linhas: { uid: string }[]): string {
  const declaracao = /^declaracoes\.(\d+)\.(\w+)$/.exec(campoApi)
  if (declaracao) {
    const uid = (corpo as { declaracoes?: { uid: string }[] }).declaracoes?.[Number(declaracao[1])]?.uid
    const linha = linhas.findIndex((l) => l.uid === uid)
    if (linha >= 0) return `membros.${linha}.${declaracao[2]}`
  }
  return campoApi === 'presentes' || campoApi.startsWith('declaracoes') ? 'membros' : campoApi
}

const nomeDoMembro = (m: MembroComissao) => m.email ?? m.uid

function LinhaDoMembro({ membro, indice }: { membro: MembroComissao; indice: number }) {
  const { register, control } = useFormContext()
  const { errors } = useFormState({ control })
  const linha = useWatch({ control, name: `membros.${indice}` }) as LinhaMembro | undefined
  const nome = nomeDoMembro(membro)
  const presente = linha?.presente ?? true
  const impedido = presente && linha?.semImpedimento === false

  return (
    <li className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.4fr)] md:items-start">
      <div className="min-w-0">
        <p className="truncate text-label-md text-text-primary">{nome}</p>
        <Badge tom="neutral" className="mt-1">
          {ROTULO_PAPEL[membro.perfil]}
        </Badge>
      </div>
      <Checkbox rotulo="Presente" aria-label={`Presente: ${nome}`} {...register(`membros.${indice}.presente`)} />
      <div className="space-y-3">
        <Checkbox
          rotulo="Declaro não haver impedimento"
          aria-label={`Sem impedimento: ${nome}`}
          desabilitado={!presente}
          {...register(`membros.${indice}.semImpedimento`)}
        />
        {impedido && (
          <TextField
            rotulo="Motivo do impedimento"
            aria-label={`Motivo do impedimento: ${nome}`}
            obrigatorio
            erro={mensagemDoCampo(errors, `membros.${indice}.motivo`)}
            {...register(`membros.${indice}.motivo`)}
          />
        )}
      </div>
    </li>
  )
}

/** Uma linha por membro: presente, declaração e motivo do impedimento (abertura e edição da sessão). */
export function LinhasMembros({ membros }: { membros: MembroComissao[] }) {
  const { formState } = useFormContext()
  const erro = mensagemDoCampo(formState.errors, 'membros')
  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">Membros presentes e declarações</legend>
      {membros.length === 0 ? (
        <Alert tom="warning" titulo="Comissão sem membros">
          Nenhum usuário com papel na Comissão. Peça ao administrador para definir o papel (presidente, relator ou membro) na tela Usuários.
        </Alert>
      ) : (
        <ul className="divide-y divide-border-default rounded-card border border-card-border bg-card-bg">
          {membros.map((m, i) => (
            <LinhaDoMembro key={m.uid} membro={m} indice={i} />
          ))}
        </ul>
      )}
      {erro && (
        <Alert tom="error" titulo="Presentes e declarações" className="mt-3">
          {erro}
        </Alert>
      )}
    </fieldset>
  )
}

function Pauta({ propostas }: { propostas: PropostaPauta[] }) {
  const { register, formState } = useFormContext()
  const erro = mensagemDoCampo(formState.errors, 'pauta')
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-label-md text-text-primary">Pauta</legend>
      {propostas.length === 0 ? (
        <p className="text-body-sm text-text-secondary">Nenhuma proposta cadastrada.</p>
      ) : (
        <ul className="space-y-2">
          {propostas.map((p) => (
            <li key={p.id}>
              <Checkbox rotulo={p.rotulo} value={p.id} {...register('pauta')} />
            </li>
          ))}
        </ul>
      )}
      {erro && (
        <Alert tom="error" titulo="Pauta" className="mt-3">
          {erro}
        </Alert>
      )}
    </fieldset>
  )
}

/** Revisão antes de abrir: data, presentes e impedimentos (do que está no formulário). */
function Revisao() {
  const data = useWatch({ name: 'data' }) as string | undefined
  const linhas = (useWatch({ name: 'membros' }) ?? []) as LinhaMembro[]
  const presentes = linhas.filter((l) => l.presente)
  const impedidos = presentes.filter((l) => !l.semImpedimento).length
  return (
    <ListaDescricao
      className="xl:grid-cols-3"
      itens={[
        { termo: 'Data da sessão', valor: data ? dataBr(data) : '—' },
        { termo: 'Presentes', valor: `${presentes.length} de ${linhas.length}` },
        { termo: 'Impedimentos declarados', valor: impedidos },
      ]}
    />
  )
}

function Etapa({ indice, atual, descricao, children }: { indice: number; atual: number; descricao: string; children: ReactNode }) {
  const titulo = useRef<HTMLHeadingElement>(null)
  const anterior = useRef(atual)
  useEffect(() => {
    // Foco no título só quando a etapa MUDA (não ao abrir a tela; seguro com o StrictMode).
    if (anterior.current !== atual && indice === atual) titulo.current?.focus()
    anterior.current = atual
  }, [atual, indice])
  return (
    <section
      hidden={indice !== atual}
      aria-labelledby={`etapa-${indice}`}
      className="space-y-4 rounded-card border border-card-border bg-card-bg p-(--sds-card-padding) shadow-card"
    >
      <div>
        <h2 id={`etapa-${indice}`} ref={titulo} tabIndex={-1} className="text-heading-3 text-text-primary">
          {indice + 1}. {PASSOS_ABERTURA[indice]}
        </h2>
        <p className="mt-1 text-body-sm text-text-secondary">{descricao}</p>
      </div>
      {children}
    </section>
  )
}

/** Voltar / Avançar (valida a etapa) / Abrir sessão; depois de um envio com erro, vai à etapa do erro. */
function NavegacaoAssistente({ passo, membros, onPasso }: { passo: number; membros: number; onPasso: (passo: number) => void }) {
  const { trigger, formState } = useFormContext()
  const { submitCount, errors, isSubmitting } = formState
  const ultimo = passo === PASSOS_ABERTURA.length - 1
  useEffect(() => {
    if (submitCount === 0) return
    const campos = Object.keys(errors).filter((c) => c !== 'root')
    if (campos.length > 0) onPasso(Math.min(...campos.map(passoDoCampo)))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só ao fim de cada envio
  }, [submitCount])

  return (
    <div className="flex flex-wrap justify-between gap-3">
      <div>
        {passo > 0 && (
          <Button variante="secondary" icone={ArrowLeft} onClick={() => onPasso(passo - 1)}>
            Voltar
          </Button>
        )}
      </div>
      {/* key distinta: sem ela o React reaproveita o mesmo <button>, que vira type="submit" ainda durante o
          clique em "Avançar" e o navegador envia o formulário antes da revisão da pauta. */}
      {ultimo ? (
        <Button key="enviar" type="submit" carregando={isSubmitting}>
          Abrir sessão
        </Button>
      ) : (
        <Button
          key="avancar"
          onClick={async () => {
            if (await trigger(camposDoPasso(passo, membros))) onPasso(passo + 1)
          }}
        >
          Avançar
          <Icone icone={ArrowRight} tamanho={16} />
        </Button>
      )}
    </div>
  )
}

interface Props {
  membros: MembroComissao[]
  propostas: PropostaPauta[]
  onAbrir: (corpo: CorpoAbertura) => Promise<void>
  /** Etapa atual (controlada pela WizardPage); sem ela, o próprio formulário controla. */
  passo?: number
  onPasso?: (passo: number) => void
}

export function FormAberturaSessao({ membros, propostas, onAbrir, passo: passoExterno, onPasso }: Props) {
  const [passoInterno, setPassoInterno] = useState(0)
  const passo = passoExterno ?? passoInterno
  const irPara = (p: number) => {
    setPassoInterno(p)
    onPasso?.(p)
  }
  const linhas: LinhaMembro[] = membros.map((m) => ({ uid: m.uid, presente: true, semImpedimento: true, motivo: '' }))

  const transformar = (valores: FieldValues) => ({
    data: valores.data,
    pauta: Array.isArray(valores.pauta) ? valores.pauta : valores.pauta ? [valores.pauta] : [],
    ...corpoDosMembros((valores.membros ?? []) as LinhaMembro[]),
  })

  return (
    <FormularioApi
      rotulo="Abertura de sessão"
      esquema={esquemaFormAbertura}
      valoresIniciais={{ data: '', pauta: propostas.map((p) => p.id), membros: linhas }}
      transformar={transformar}
      campoDoFormulario={(campo, corpo) => campoDosMembros(campo, corpo, linhas)}
      onEnviar={onAbrir}
      rotuloEnviar="Abrir sessão"
      rodape={<NavegacaoAssistente passo={passo} membros={membros.length} onPasso={irPara} />}
    >
      <Etapa indice={0} atual={passo} descricao="Data em que a Comissão se reúne. Ela aparece na ata e nos registros de avaliação.">
        <CampoTexto nome="data" rotulo="Data da sessão" tipo="date" obrigatorio className="max-w-xs" />
      </Etapa>
      <Etapa indice={1} atual={passo} descricao="Marque quem está presente e a declaração de impedimento de cada membro (impedimento exige motivo).">
        <LinhasMembros membros={membros} />
      </Etapa>
      <Etapa indice={2} atual={passo} descricao="Propostas que a Comissão avalia nesta sessão. Confira o resumo antes de abrir.">
        <Pauta propostas={propostas} />
        <Revisao />
      </Etapa>
    </FormularioApi>
  )
}
