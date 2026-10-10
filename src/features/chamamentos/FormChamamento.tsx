// Cadastro e edição de chamamento (FormPage) com seus lotes: POST/PATCH /api/chamamentos.

import { Plus, Trash2 } from 'lucide-react'
import { useFieldArray, useFormContext } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router'
import { FormPage } from '../../components/templates/paginas'
import { Button } from '../../components/ui/Button'
import { ButtonLink } from '../../components/ui/ButtonLink'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { CampoTexto, FormularioApi } from '../../components/ui/FormularioApi'
import { MensagensCampo, useIdsCampo } from '../../components/ui/Field'
import { Skeleton } from '../../components/ui/Skeleton'
import { mensagemDoCampo } from '../../components/ui/form'
import { esquemaCriarChamamento } from '../../esquemas/cadastros'
import { chamarApi } from '../../lib/api'
import { useDocumento } from '../../lib/firestore'
import type { Chamamento } from '../../lib/tipos'

function Lotes() {
  const { control, formState } = useFormContext()
  const { fields, append, remove } = useFieldArray({ control, name: 'lotes' })
  const ids = useIdsCampo()
  return (
    <Card titulo="Lotes" descricao="Cada lote tem a sua classificação.">
      <ul className="space-y-4">
        {fields.map((campo, i) => (
          <li key={campo.id} className="grid gap-3 sm:grid-cols-[10rem_1fr_auto] sm:items-start">
            <CampoTexto nome={`lotes.${i}.codigo`} rotulo={`Código do lote ${i + 1}`} obrigatorio />
            <CampoTexto nome={`lotes.${i}.descricao`} rotulo={`Descrição do lote ${i + 1}`} obrigatorio />
            <Button
              variante="tertiary"
              icone={Trash2}
              onClick={() => remove(i)}
              desabilitado={fields.length === 1}
              aria-label={`Remover lote ${i + 1}`}
              className="sm:mt-6"
            >
              Remover
            </Button>
          </li>
        ))}
      </ul>
      <MensagensCampo ids={ids} erro={mensagemDoCampo(formState.errors, 'lotes')} />
      <div className="mt-4">
        <Button variante="secondary" icone={Plus} onClick={() => append({ codigo: '', descricao: '' })}>
          Adicionar lote
        </Button>
      </div>
    </Card>
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
  const titulo = ch ? 'Editar chamamento' : 'Novo chamamento'
  const trilha = [{ rotulo: 'Chamamentos', para: '/' }, ...(ch ? [{ rotulo: `Chamamento ${edicao.dados?.numero ?? ''}`, para: `/chamamentos/${ch}` }] : []), { rotulo: titulo }]

  if (ch && edicao.carregando) return <Skeleton linhas={6} rotulo="Carregando chamamento" />
  if (ch && edicao.erro) return <ErrorState mensagem={edicao.erro} />
  if (ch && !edicao.dados) return <EmptyState titulo="Chamamento não encontrado" />

  // Só os campos do formulário (o documento também tem criadoEm, atualizadoEm...).
  const atual = edicao.dados as Record<string, unknown> | null
  const iniciais = Object.fromEntries(Object.entries(VAZIO).map(([campo, vazio]) => [campo, atual?.[campo] ?? vazio])) as typeof VAZIO

  return (
    <FormPage cabecalho={{ trilha, titulo, descricao: 'Dados do Edital, prazos e lotes. Campos com * são obrigatórios.' }}>
      <FormularioApi
        rotulo={titulo}
        esquema={esquemaCriarChamamento}
        valoresIniciais={iniciais}
        rotuloEnviar={ch ? 'Salvar alterações' : 'Cadastrar chamamento'}
        acoesSecundarias={
          <ButtonLink para={ch ? `/chamamentos/${ch}` : '/'} variante="secondary">
            Cancelar
          </ButtonLink>
        }
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
        <Card titulo="Identificação">
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoTexto nome="numero" rotulo="Nº do chamamento" obrigatorio />
            <CampoTexto nome="processoSei" rotulo="Processo SEI" obrigatorio />
            <CampoTexto nome="titulo" rotulo="Título" obrigatorio className="sm:col-span-2" />
          </div>
        </Card>
        <Card titulo="Prazos e correção monetária">
          <div className="grid gap-4 sm:grid-cols-3">
            <CampoTexto nome="dataLimitePropostas" rotulo="Data limite das propostas" tipo="date" obrigatorio ajuda="Referência da D2; não muda depois que a avaliação começa." />
            <CampoTexto nome="indiceCorrecao" rotulo="Índice de correção" ajuda="Ex.: IPCA (opcional)." />
            <CampoTexto nome="dataBaseCorrecao" rotulo="Data-base da correção" tipo="date" />
            <CampoTexto nome="justificativaMinima" rotulo="Mínimo de caracteres da justificativa" tipo="number" ajuda="Opcional; padrão 20." />
          </div>
        </Card>
        <Lotes />
      </FormularioApi>
    </FormPage>
  )
}
