// Abertura da sessão em uma única página: data, lote(s) em pauta e lista de presentes (só nome e papel, sem
// login e sem declaração de impedimento), com "Adicionar pessoa" e remoção com um clique. Exatamente um
// presidente e nomes não repetidos. Ao enviar, vira o corpo de POST /api/sessao, validado pelo mesmo esquema da
// /api. CamposPresentes também é usado na tela da sessão para alterar os presentes.

import { Plus, Trash2 } from 'lucide-react'
import { useFieldArray, useFormContext, useWatch, type FieldValues } from 'react-hook-form'
import { Button } from '../../components/ui/Button'
import { Checkbox } from '../../components/ui/Checkbox'
import { MensagemErro } from '../../components/ui/Field'
import { CampoLista, CampoTexto, FormularioApi } from '../../components/ui/FormularioApi'
import { mensagemDoCampo } from '../../components/ui/form'
import { PAPEIS_SESSAO, ROTULO_PAPEL } from '../../domain/comissao'
import type { z } from '../../esquemas/base'
import { esquemaAbrirSessao, type Presente } from '../../esquemas/sessao'

export interface LotePauta {
  codigo: string
  descricao: string
}

export const esquemaFormAbertura = esquemaAbrirSessao.omit({ chamamentoId: true })
export type CorpoAbertura = z.output<typeof esquemaFormAbertura>

const OPCOES_PAPEL = PAPEIS_SESSAO.map((p) => ({ valor: p, rotulo: ROTULO_PAPEL[p] }))

/** A primeira pessoa já vem como presidente; as seguintes, como membro. */
export const PRESENTES_INICIAIS: Presente[] = [{ nome: '', papel: 'presidente' }]

function LinhaPresente({ indice, onRemover }: { indice: number; onRemover: () => void }) {
  const nome = (useWatch({ name: `presentes.${indice}.nome` }) as string | undefined)?.trim()
  const n = indice + 1
  return (
    <li className="grid gap-3 rounded-card border border-card-border p-4 sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-end">
      <CampoTexto nome={`presentes.${indice}.nome`} rotulo={`Nome da pessoa ${n}`} obrigatorio />
      <CampoLista nome={`presentes.${indice}.papel`} rotulo={`Papel da pessoa ${n}`} opcoes={OPCOES_PAPEL} />
      <Button variante="tertiary" icone={Trash2} aria-label={nome ? `Remover pessoa ${n} (${nome})` : `Remover pessoa ${n}`} onClick={onRemover}>
        Remover
      </Button>
    </li>
  )
}

/** Lista de presentes (nome e papel) com "Adicionar pessoa" e remoção com um clique. */
export function CamposPresentes() {
  const { control, formState } = useFormContext()
  const { fields, append, remove } = useFieldArray({ control, name: 'presentes' })
  const erro = mensagemDoCampo(formState.errors, 'presentes')
  return (
    <fieldset className="min-w-0 space-y-3">
      <legend className="mb-1 text-label-md text-text-primary">Presentes</legend>
      <p className="text-body-sm text-text-secondary">Exatamente um presidente; os demais são membros. Só os nomes: ninguém precisa ter login.</p>
      <ol className="space-y-3">
        {fields.map((campo, i) => (
          <LinhaPresente key={campo.id} indice={i} onRemover={() => remove(i)} />
        ))}
      </ol>
      <MensagemErro erro={erro} />
      <Button variante="secondary" icone={Plus} onClick={() => append({ nome: '', papel: fields.length === 0 ? 'presidente' : 'membro' })}>
        Adicionar pessoa
      </Button>
    </fieldset>
  )
}

function CamposLotes({ lotes }: { lotes: LotePauta[] }) {
  const { register, formState } = useFormContext()
  const erro = mensagemDoCampo(formState.errors, 'lotes')
  return (
    <div role="group" aria-label="Lote(s) em pauta" className="space-y-2">
      <p className="text-label-md text-text-primary">Lote(s) em pauta</p>
      <p className="text-body-sm text-text-secondary">As propostas desses lotes são as analisadas na sessão.</p>
      <ul className="space-y-2">
        {lotes.map((l) => (
          <li key={l.codigo}>
            <Checkbox rotulo={`Lote ${l.codigo} — ${l.descricao}`} value={l.codigo} {...register('lotes')} />
          </li>
        ))}
      </ul>
      <MensagemErro erro={erro} />
    </div>
  )
}

/** Checkboxes com o mesmo nome: lista de marcados (um só checkbox devolve verdadeiro/falso). */
function lotesMarcados(valor: unknown, lotes: LotePauta[]): string[] {
  if (Array.isArray(valor)) return valor as string[]
  if (typeof valor === 'string') return [valor]
  return valor === true && lotes.length === 1 ? [lotes[0]!.codigo] : []
}

export function FormAberturaSessao({ lotes, onAbrir }: { lotes: LotePauta[]; onAbrir: (corpo: CorpoAbertura) => Promise<void> }) {
  return (
    <FormularioApi
      rotulo="Abertura de sessão"
      esquema={esquemaFormAbertura}
      valoresIniciais={{ data: '', lotes: [], presentes: PRESENTES_INICIAIS }}
      transformar={(v: FieldValues) => ({ data: v.data, lotes: lotesMarcados(v.lotes, lotes), presentes: v.presentes ?? [] })}
      rotuloEnviar="Abrir sessão"
      onEnviar={onAbrir}
    >
      <div className="space-y-6">
        <CampoTexto nome="data" rotulo="Data da sessão" tipo="date" obrigatorio />
        <CamposLotes lotes={lotes} />
        <CamposPresentes />
      </div>
    </FormularioApi>
  )
}
