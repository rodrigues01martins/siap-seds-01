// Formulário de cadastro ligado à /api com os componentes do DS: react-hook-form + o MESMO esquema zod da /api
// (src/esquemas). Erros do navegador e erros 400 da /api caem nos mesmos campos ("lotes.0.codigo"); os
// demais (401, 403, 409…) aparecem no AlertaErroApi. Ações: [secundárias] [enviar] — uma única primária.
// Campos ligados: CampoTexto (texto, área, data, número, e-mail, CNPJ) e CampoLista (seleção).

import { useState, type ReactNode } from 'react'
import { FormProvider, useForm, useFormContext, type DefaultValues, type FieldValues, type Resolver } from 'react-hook-form'
import { mensagemDoCampo, paraErros } from '../../componentes/Formulario'
import { CAMPO_RAIZ, camposDoErro, type z } from '../../esquemas/base'
import { ErroApi } from '../../lib/api'
import { Alert } from './Alert'
import { AlertaErroApi } from './AlertaErroApi'
import { Button } from './Button'
import { CNPJField } from './CNPJField'
import { DatePicker } from './DatePicker'
import { NumberField } from './NumberField'
import { Select, type OpcaoSelect } from './Select'
import { TextArea } from './TextArea'
import { TextField } from './TextField'

type Campos = Record<string, string>
const identidade = <T,>(valor: T) => valor

export interface PropsFormularioApi<E extends z.ZodType<FieldValues>> {
  esquema: E
  valoresIniciais: DefaultValues<FieldValues>
  onEnviar: (dados: z.output<E>) => Promise<void>
  rotuloEnviar: string
  children: ReactNode
  /** Valores do formulário → corpo da /api (padrão: os próprios valores). */
  transformar?: (valores: FieldValues) => unknown
  /** Campo da /api → campo do formulário (padrão: o mesmo). */
  campoDoFormulario?: (campoApi: string, corpo: unknown) => string
  limparAoConcluir?: boolean
  somenteLeitura?: boolean
  /** Ações secundárias (ex.: Cancelar), à esquerda do botão de enviar. */
  acoesSecundarias?: ReactNode
  /** Nome acessível do formulário. */
  rotulo?: string
}

export function FormularioApi<E extends z.ZodType<FieldValues>>({
  esquema,
  valoresIniciais,
  onEnviar,
  rotuloEnviar,
  children,
  transformar = identidade,
  campoDoFormulario = identidade,
  limparAoConcluir = false,
  somenteLeitura = false,
  acoesSecundarias,
  rotulo,
}: PropsFormularioApi<E>) {
  const mapear = (campos: Campos, corpo: unknown): Campos =>
    Object.fromEntries(Object.entries(campos).map(([campo, msg]) => [campo === CAMPO_RAIZ ? campo : campoDoFormulario(campo, corpo), msg]))

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
        for (const [campo, message] of Object.entries(mapear(erro.campos, transformar(getValues())))) {
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
        aria-label={rotulo}
        noValidate
        onSubmit={(evento) => {
          setErroServidor(null)
          return enviar(evento)
        }}
        className="space-y-6"
      >
        <fieldset disabled={somenteLeitura} className="min-w-0 space-y-6">
          {children}
        </fieldset>
        {erroRaiz && (
          <Alert tom="error" titulo="Confira os dados">
            {erroRaiz}
          </Alert>
        )}
        <AlertaErroApi erro={erroServidor} />
        {!somenteLeitura && (
          <div className="flex flex-wrap justify-end gap-3">
            {acoesSecundarias}
            <Button type="submit" carregando={formState.isSubmitting}>
              {rotuloEnviar}
            </Button>
          </div>
        )}
      </form>
    </FormProvider>
  )
}

export interface PropsCampoTexto {
  nome: string
  rotulo: string
  tipo?: 'text' | 'date' | 'number' | 'email' | 'textarea' | 'cnpj'
  ajuda?: string
  obrigatorio?: boolean
  somenteLeitura?: boolean
  placeholder?: string
  /** Contador da área de texto. */
  minimo?: number
  maximo?: number
  className?: string
}

/** Campo de texto ligado ao formulário (register + mensagem de erro do esquema ou da /api). */
export function CampoTexto({ nome, rotulo, tipo = 'text', ajuda, obrigatorio, somenteLeitura, placeholder, minimo, maximo, className }: PropsCampoTexto) {
  const { register, formState } = useFormContext()
  const erro = mensagemDoCampo(formState.errors, nome)
  const comuns = { rotulo, ajuda, erro, obrigatorio, somenteLeitura, placeholder, className }
  if (tipo === 'number') {
    return <NumberField {...comuns} {...register(nome, { setValueAs: (v: unknown) => (v === '' || v == null ? undefined : Number(v)) })} />
  }
  const registro = register(nome)
  if (tipo === 'textarea') return <TextArea {...comuns} minimo={minimo} maximo={maximo} {...registro} />
  if (tipo === 'date') return <DatePicker {...comuns} {...registro} />
  if (tipo === 'cnpj') return <CNPJField {...comuns} {...registro} />
  return <TextField {...comuns} type={tipo} {...registro} />
}

/** Lista de seleção ligada ao formulário. */
export function CampoLista({
  nome,
  rotulo,
  opcoes,
  vazio = 'Selecione…',
  ajuda,
  obrigatorio,
  className,
}: {
  nome: string
  rotulo: string
  opcoes: OpcaoSelect[]
  vazio?: string
  ajuda?: string
  obrigatorio?: boolean
  className?: string
}) {
  const { register, formState } = useFormContext()
  return (
    <Select
      rotulo={rotulo}
      opcoes={opcoes}
      vazio={vazio}
      ajuda={ajuda}
      obrigatorio={obrigatorio}
      className={className}
      erro={mensagemDoCampo(formState.errors, nome)}
      {...register(nome)}
    />
  )
}
