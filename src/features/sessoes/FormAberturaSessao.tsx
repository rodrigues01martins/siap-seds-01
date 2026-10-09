// Tela de abertura da sessão: data, membros presentes, declaração de impedimento por membro e pauta.
// O formulário guarda uma linha por membro; ao enviar, vira o corpo de POST /api/sessao
// (presentes + declarações só de quem está presente), validado pelo mesmo esquema da /api.

import { useFormContext, useWatch, type FieldValues } from 'react-hook-form'
import { Campo, Formulario, mensagemDoCampo } from '../../componentes/Formulario'
import type { Perfil } from '../../domain/perfis'
import type { z } from '../../esquemas/base'
import { esquemaAbrirSessao, type Declaracao } from '../../esquemas/sessao'

export interface MembroComissao {
  uid: string
  email: string | null
  perfil: Perfil
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
  const { register, formState, control } = useFormContext()
  const linha = useWatch({ control, name: `membros.${indice}` }) as LinhaMembro | undefined
  const nome = nomeDoMembro(membro)
  const presente = linha?.presente ?? true
  const impedido = presente && linha?.semImpedimento === false
  const erroMotivo = mensagemDoCampo(formState.errors, `membros.${indice}.motivo`)
  const idMotivo = `motivo-${membro.uid}`

  return (
    <tr className="border-t border-slate-200 align-top">
      <td className="py-2 pr-4">
        <span className="font-medium">{nome}</span>
        <span className="ml-2 text-xs text-slate-500">{membro.perfil}</span>
      </td>
      <td className="py-2 pr-4">
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" {...register(`membros.${indice}.presente`)} aria-label={`Presente: ${nome}`} />
          Presente
        </label>
      </td>
      <td className="py-2">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            {...register(`membros.${indice}.semImpedimento`)}
            disabled={!presente}
            aria-label={`Sem impedimento: ${nome}`}
          />
          Declaro não haver impedimento
        </label>
        {impedido && (
          <div className="mt-2">
            <label htmlFor={idMotivo} className="block text-sm text-slate-700">
              Motivo do impedimento
            </label>
            <input
              id={idMotivo}
              {...register(`membros.${indice}.motivo`)}
              aria-label={`Motivo do impedimento: ${nome}`}
              aria-invalid={erroMotivo ? true : undefined}
              aria-describedby={erroMotivo ? `${idMotivo}-erro` : undefined}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 aria-[invalid=true]:border-red-500"
            />
            {erroMotivo && (
              <p id={`${idMotivo}-erro`} className="mt-1 text-sm text-red-700">
                {erroMotivo}
              </p>
            )}
          </div>
        )}
      </td>
    </tr>
  )
}

/** Uma linha por membro: presente, declaração e motivo do impedimento (abertura e edição da sessão). */
export function LinhasMembros({ membros }: { membros: MembroComissao[] }) {
  const { formState } = useFormContext()
  const erro = mensagemDoCampo(formState.errors, 'membros')
  return (
    <fieldset>
      <legend className="text-sm font-medium text-slate-700">Membros presentes e declarações</legend>
      {membros.length === 0 ? (
        <p className="mt-2 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          Nenhum membro da Comissão com perfil atribuído. Peça ao administrador para dar os perfis (presidente,
          relator, membro).
        </p>
      ) : (
        <table className="mt-2 w-full text-sm">
          <tbody>
            {membros.map((m, i) => (
              <LinhaDoMembro key={m.uid} membro={m} indice={i} />
            ))}
          </tbody>
        </table>
      )}
      {erro && <p className="mt-1 text-sm text-red-700">{erro}</p>}
    </fieldset>
  )
}

function Pauta({ propostas }: { propostas: PropostaPauta[] }) {
  const { register, formState } = useFormContext()
  const erro = mensagemDoCampo(formState.errors, 'pauta')
  return (
    <fieldset>
      <legend className="text-sm font-medium text-slate-700">Pauta</legend>
      <ul className="mt-2 space-y-1">
        {propostas.map((p) => (
          <li key={p.id}>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" value={p.id} {...register('pauta')} />
              {p.rotulo}
            </label>
          </li>
        ))}
      </ul>
      {propostas.length === 0 && <p className="text-sm text-slate-500">Nenhuma proposta cadastrada.</p>}
      {erro && <p className="mt-1 text-sm text-red-700">{erro}</p>}
    </fieldset>
  )
}

interface Props {
  membros: MembroComissao[]
  propostas: PropostaPauta[]
  onAbrir: (corpo: CorpoAbertura) => Promise<void>
}

export function FormAberturaSessao({ membros, propostas, onAbrir }: Props) {
  const linhas: LinhaMembro[] = membros.map((m) => ({ uid: m.uid, presente: true, semImpedimento: true, motivo: '' }))

  const transformar = (valores: FieldValues) => ({
    data: valores.data,
    pauta: Array.isArray(valores.pauta) ? valores.pauta : valores.pauta ? [valores.pauta] : [],
    ...corpoDosMembros((valores.membros ?? []) as LinhaMembro[]),
  })

  return (
    <Formulario
      esquema={esquemaFormAbertura}
      valoresIniciais={{ data: '', pauta: propostas.map((p) => p.id), membros: linhas }}
      transformar={transformar}
      campoDoFormulario={(campo, corpo) => campoDosMembros(campo, corpo, linhas)}
      onEnviar={onAbrir}
      rotuloEnviar="Abrir sessão"
    >
      <Campo nome="data" rotulo="Data da sessão" tipo="date" />
      <LinhasMembros membros={membros} />
      <Pauta propostas={propostas} />
    </Formulario>
  )
}
