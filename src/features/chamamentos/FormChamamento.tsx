// Cadastro e edição de chamamento (admin) com seus lotes: POST/PATCH /api/chamamentos.

import { useFieldArray, useFormContext } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router'
import { Botao, EstadoLeitura, Titulo } from '../../componentes/basicos'
import { Campo, Formulario, mensagemDoCampo } from '../../componentes/Formulario'
import { esquemaCriarChamamento } from '../../esquemas/cadastros'
import { chamarApi } from '../../lib/api'
import { useDocumento } from '../../lib/firestore'
import type { Chamamento } from '../../lib/tipos'

function Lotes() {
  const { control, formState } = useFormContext()
  const { fields, append, remove } = useFieldArray({ control, name: 'lotes' })
  const erroGrupo = mensagemDoCampo(formState.errors, 'lotes')

  return (
    <fieldset className="rounded-md border border-slate-200 p-3">
      <legend className="px-1 text-sm font-medium text-slate-700">Lotes</legend>
      <div className="space-y-3">
        {fields.map((campo, i) => (
          <div key={campo.id} className="grid gap-2 sm:grid-cols-[8rem_1fr_auto] sm:items-end">
            <Campo nome={`lotes.${i}.codigo`} rotulo={`Código do lote ${i + 1}`} />
            <Campo nome={`lotes.${i}.descricao`} rotulo={`Descrição do lote ${i + 1}`} />
            <Botao onClick={() => remove(i)} perigo desabilitado={fields.length === 1}>
              Remover
            </Botao>
          </div>
        ))}
      </div>
      {erroGrupo && <p className="mt-1 text-sm text-red-700">{erroGrupo}</p>}
      <div className="mt-3">
        <Botao onClick={() => append({ codigo: '', descricao: '' })}>Adicionar lote</Botao>
      </div>
    </fieldset>
  )
}

const VAZIO = {
  numero: '',
  titulo: '',
  processoSei: '',
  dataLimitePropostas: '',
  indiceCorrecao: '',
  dataBaseCorrecao: '',
  justificativaMinima: '',
  lotes: [{ codigo: '', descricao: '' }],
}

export function FormChamamento() {
  const { ch } = useParams()
  const navegar = useNavigate()
  const edicao = useDocumento<Chamamento>(ch ? `chamamentos/${ch}` : null)

  if (ch && (edicao.carregando || edicao.erro)) return <EstadoLeitura carregando={edicao.carregando} erro={edicao.erro} />
  if (ch && !edicao.dados) return <p className="text-slate-600">Chamamento não encontrado.</p>

  // Só os campos do formulário (o documento também tem criadoEm, atualizadoEm...).
  const atual = edicao.dados as Record<string, unknown> | null
  const iniciais = Object.fromEntries(
    Object.entries(VAZIO).map(([campo, vazio]) => [campo, atual?.[campo] ?? vazio]),
  ) as typeof VAZIO

  return (
    <>
      <Titulo>{ch ? 'Editar chamamento' : 'Novo chamamento'}</Titulo>
      <div className="max-w-3xl rounded-lg border border-slate-200 bg-white p-6">
        <Formulario
          esquema={esquemaCriarChamamento}
          valoresIniciais={iniciais}
          rotuloEnviar={ch ? 'Salvar alterações' : 'Cadastrar chamamento'}
          onEnviar={async (dados) => {
            if (ch) {
              await chamarApi('/api/chamamentos', { metodo: 'PATCH', corpo: { id: ch, ...dados } })
              navegar(`/chamamentos/${ch}`)
            } else {
              const { id } = await chamarApi<{ id: string }>('/api/chamamentos', { metodo: 'POST', corpo: dados })
              navegar(`/chamamentos/${id}`)
            }
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo nome="numero" rotulo="Nº do chamamento" />
            <Campo nome="processoSei" rotulo="Processo SEI" />
          </div>
          <Campo nome="titulo" rotulo="Título" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Campo
              nome="dataLimitePropostas"
              rotulo="Data limite das propostas"
              tipo="date"
              ajuda="Referência da D2; não muda depois que a avaliação começa."
            />
            <Campo nome="indiceCorrecao" rotulo="Índice de correção" ajuda="Ex.: IPCA (opcional)" />
            <Campo nome="dataBaseCorrecao" rotulo="Data-base da correção" tipo="date" />
          </div>
          <Campo
            nome="justificativaMinima"
            rotulo="Mínimo de caracteres da justificativa"
            tipo="number"
            ajuda="Opcional; padrão 20."
          />
          <Lotes />
        </Formulario>
      </div>
    </>
  )
}
