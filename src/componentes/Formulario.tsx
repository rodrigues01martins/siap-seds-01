// Formulário reutilizável: react-hook-form + o MESMO esquema zod que a /api usa (src/esquemas).
// Erros do navegador e erros 400 da /api caem nos mesmos campos ("lotes.0.codigo"...);
// outros erros (401/403/409...) aparecem no AlertaErro.

import { useId, useState, type ReactNode } from 'react'
import {
  FormProvider,
  useForm,
  useFormContext,
  type DefaultValues,
  type FieldErrors,
  type FieldValues,
  type Resolver,
} from 'react-hook-form'
import { CAMPO_RAIZ, camposDoErro, type z } from '../esquemas/base'
import { ErroApi } from '../lib/api'
import { AlertaErro } from './AlertaErro'

type Campos = Record<string, string>

interface PropsFormulario<E extends z.ZodType<FieldValues>> {
  /** Esquema do corpo enviado à /api. */
  esquema: E
  valoresIniciais: DefaultValues<FieldValues>
  onEnviar: (dados: z.output<E>) => Promise<void>
  rotuloEnviar: string
  children: ReactNode
  /** Valores do formulário → corpo da /api (padrão: os próprios valores). */
  transformar?: (valores: FieldValues) => unknown
  /** Campo da /api ("declaracoes.0.motivo") → campo do formulário (padrão: o mesmo). */
  campoDoFormulario?: (campoApi: string, corpo: unknown) => string
  /** Volta aos valores iniciais depois de enviar com sucesso. */
  limparAoConcluir?: boolean
  desabilitado?: boolean
}

const identidade = <T,>(valor: T) => valor

/** { "a.0.b": msg } → { a: { 0: { b: { message } } } }, o formato de erros do react-hook-form. */
function paraErros(campos: Campos): FieldErrors {
  const erros: Record<string, unknown> = {}
  for (const [caminho, message] of Object.entries(campos)) {
    const partes = caminho === CAMPO_RAIZ ? ['root'] : caminho.split('.')
    let alvo = erros
    partes.slice(0, -1).forEach((parte) => {
      alvo[parte] ??= {}
      alvo = alvo[parte] as Record<string, unknown>
    })
    alvo[partes.at(-1)!] = { type: 'validacao', message }
  }
  return erros as FieldErrors
}

/** Mensagem de erro de um campo ("lotes.0.codigo") dentro de FieldErrors. */
export function mensagemDoCampo(erros: FieldErrors, nome: string): string | undefined {
  const erro = nome.split('.').reduce<unknown>((atual, parte) => (atual as Record<string, unknown> | undefined)?.[parte], erros)
  return (erro as { message?: string } | undefined)?.message
}

export function Formulario<E extends z.ZodType<FieldValues>>({
  esquema,
  valoresIniciais,
  onEnviar,
  rotuloEnviar,
  children,
  transformar = identidade,
  campoDoFormulario = identidade,
  limparAoConcluir = false,
  desabilitado = false,
}: PropsFormulario<E>) {
  const mapear = (campos: Campos, corpo: unknown): Campos =>
    Object.fromEntries(
      Object.entries(campos).map(([campo, mensagem]) => [
        campo === CAMPO_RAIZ ? campo : campoDoFormulario(campo, corpo),
        mensagem,
      ]),
    )

  const resolver: Resolver<FieldValues, unknown, z.output<E>> = async (valores) => {
    const corpo = transformar(valores)
    const resultado = esquema.safeParse(corpo)
    if (resultado.success) return { values: resultado.data, errors: {} }
    return { values: {}, errors: paraErros(mapear(camposDoErro(resultado.error), corpo)) }
  }

  const metodos = useForm<FieldValues, unknown, z.output<E>>({ resolver, defaultValues: valoresIniciais })
  const { handleSubmit, setError, reset, formState, getValues } = metodos
  const [erroServidor, setErroServidor] = useState<unknown>(null)

  const enviar = handleSubmit(async (dados) => {
    try {
      await onEnviar(dados)
      if (limparAoConcluir) reset(valoresIniciais)
    } catch (erro) {
      if (erro instanceof ErroApi && erro.campos) {
        const campos = mapear(erro.campos, transformar(getValues()))
        for (const [campo, message] of Object.entries(campos)) {
          if (campo !== CAMPO_RAIZ) setError(campo, { type: 'servidor', message })
        }
      }
      setErroServidor(erro)
    }
  })

  const erroRaiz = formState.errors.root?.message
  return (
    <FormProvider {...metodos}>
      <form
        onSubmit={(evento) => {
          setErroServidor(null)
          return enviar(evento)
        }}
        noValidate
        className="space-y-4"
      >
        {children}
        {erroRaiz && <p className="text-sm text-red-700">{erroRaiz}</p>}
        <AlertaErro erro={erroServidor} />
        <button
          type="submit"
          disabled={desabilitado || formState.isSubmitting}
          aria-busy={formState.isSubmitting}
          className="rounded-md bg-sky-700 px-4 py-2 font-medium text-white hover:bg-sky-800 disabled:opacity-50"
        >
          {rotuloEnviar}
        </button>
      </form>
    </FormProvider>
  )
}

// ---------- Campos ----------

interface PropsCampo {
  nome: string
  rotulo: string
  tipo?: 'text' | 'date' | 'number' | 'email' | 'textarea'
  /** Formata o texto enquanto a pessoa digita (ex.: mascararCnpj). */
  mascara?: (valor: string) => string
  somenteLeitura?: boolean
  ajuda?: string
}

const classeEntrada =
  'mt-1 w-full rounded-md border border-slate-300 px-3 py-2 aria-[invalid=true]:border-red-500 read-only:bg-slate-100'

export function Campo({ nome, rotulo, tipo = 'text', mascara, somenteLeitura, ajuda }: PropsCampo) {
  const { register, formState } = useFormContext()
  const id = useId()
  const erro = mensagemDoCampo(formState.errors, nome)
  const registro = register(
    nome,
    tipo === 'number' ? { setValueAs: (v: unknown) => (v === '' || v == null ? undefined : Number(v)) } : {},
  )
  const descricao = erro ? `${id}-erro` : ajuda ? `${id}-ajuda` : undefined
  const comuns = {
    id,
    ...registro,
    readOnly: somenteLeitura,
    'aria-invalid': erro ? true : undefined,
    'aria-describedby': descricao,
    className: classeEntrada,
  }

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {rotulo}
      </label>
      {tipo === 'textarea' ? (
        <textarea {...comuns} rows={3} />
      ) : (
        <input
          {...comuns}
          type={tipo}
          onChange={(evento) => {
            if (mascara) evento.target.value = mascara(evento.target.value)
            return registro.onChange(evento)
          }}
        />
      )}
      {erro ? (
        <p id={`${id}-erro`} className="mt-1 text-sm text-red-700">
          {erro}
        </p>
      ) : (
        ajuda && (
          <p id={`${id}-ajuda`} className="mt-1 text-sm text-slate-500">
            {ajuda}
          </p>
        )
      )}
    </div>
  )
}

interface PropsSelecao {
  nome: string
  rotulo: string
  opcoes: { valor: string; rotulo: string }[]
  vazio?: string
}

export function CampoSelecao({ nome, rotulo, opcoes, vazio = 'Selecione…' }: PropsSelecao) {
  const { register, formState } = useFormContext()
  const id = useId()
  const erro = mensagemDoCampo(formState.errors, nome)
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {rotulo}
      </label>
      <select
        id={id}
        {...register(nome)}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? `${id}-erro` : undefined}
        className={classeEntrada}
      >
        <option value="">{vazio}</option>
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
      {erro && (
        <p id={`${id}-erro`} className="mt-1 text-sm text-red-700">
          {erro}
        </p>
      )}
    </div>
  )
}
