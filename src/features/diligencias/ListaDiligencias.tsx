// Diligências da proposta (RF-28): lista (DataTable com status), formulário de abertura (objeto, prazo) e
// tratamento de uma diligência (registrar resposta e encerrar). Aviso fixo: diligência não admite inclusão
// de conteúdo técnico novo (Anexo III, 29.3).

import { MessageSquareReply, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { ButtonLink } from '../../components/ui/ButtonLink'
import { Card } from '../../components/ui/Card'
import { DataTable } from '../../components/ui/DataTable'
import { CampoTexto, FormularioApi } from '../../components/ui/FormularioApi'
import { Icone } from '../../components/ui/Icone'
import { ListaDescricao } from '../../components/ui/ListaDescricao'
import { Badge, type TomSelo } from '../../components/ui/StatusBadge'
import { z } from '../../esquemas/base'
import { esquemaCamposDiligencia, esquemaConclusao, esquemaResposta } from '../../esquemas/resultado'
import { dataBr } from '../../lib/datas'

export interface DiligenciaGravada {
  id: string
  objeto: string
  prazo: string
  status: 'aberta' | 'respondida' | 'encerrada'
  resposta?: { texto: string; registradaPor?: { email: string | null } }
  conclusao?: string
  criadaPor?: { email: string | null }
}

const SITUACAO: Record<DiligenciaGravada['status'], { rotulo: string; tom: TomSelo }> = {
  aberta: { rotulo: 'Aberta', tom: 'warning' },
  respondida: { rotulo: 'Respondida', tom: 'info' },
  encerrada: { rotulo: 'Encerrada', tom: 'neutral' },
}
const esquemaRespostaForm = z.strictObject({ resposta: esquemaResposta })
const esquemaConclusaoForm = z.strictObject({ conclusao: esquemaConclusao })

export const SituacaoDiligencia = ({ status }: { status: DiligenciaGravada['status'] }) => <Badge tom={SITUACAO[status].tom}>{SITUACAO[status].rotulo}</Badge>

/** Aviso permanente (nota, não alerta: não é anunciado a cada abertura da tela). */
export function AvisoConteudoNovo() {
  return (
    <p role="note" className="flex items-start gap-3 rounded-input border-l-4 border-status-warning bg-status-warning-surface p-4 text-body-md text-text-primary">
      <Icone icone={TriangleAlert} tamanho={20} className="mt-0.5 shrink-0 text-status-warning-text" />
      <span>
        <strong className="text-status-warning-text">Atenção:</strong> diligência não admite inclusão de conteúdo técnico novo (Anexo III, 29.3).
      </span>
    </p>
  )
}

interface PropsLista {
  diligencias: DiligenciaGravada[]
  /** Caminho de uma diligência (tela de resposta/encerramento). */
  caminho: (id: string) => string
  somenteLeitura: boolean
  vazio?: ReactNode
}

export function ListaDiligencias({ diligencias, caminho, somenteLeitura }: PropsLista) {
  return (
    <DataTable<DiligenciaGravada>
      rotulo="Diligências da proposta"
      linhas={diligencias}
      chave={(d) => d.id}
      busca={{ rotulo: 'Buscar diligência', texto: (d) => `${d.objeto} ${d.resposta?.texto ?? ''} ${d.conclusao ?? ''}` }}
      filtros={[
        {
          id: 'status',
          rotulo: 'Situação',
          opcoes: (Object.keys(SITUACAO) as DiligenciaGravada['status'][]).map((s) => ({ valor: s, rotulo: SITUACAO[s].rotulo })),
          aplicar: (d, v) => d.status === v,
        },
      ]}
      vazio={{ titulo: 'Nenhuma diligência registrada' }}
      colunas={[
        { id: 'objeto', titulo: 'Objeto', ordenar: (d) => d.objeto, celula: (d) => <span className="block min-w-64 py-2">{d.objeto}</span> },
        { id: 'prazo', titulo: 'Prazo', ordenar: (d) => d.prazo, celula: (d) => <span className="whitespace-nowrap">{dataBr(d.prazo)}</span> },
        { id: 'status', titulo: 'Situação', ordenar: (d) => d.status, celula: (d) => <SituacaoDiligencia status={d.status} /> },
        { id: 'autor', titulo: 'Aberta por', celula: (d) => d.criadaPor?.email ?? '—' },
      ]}
      acoes={(d) => (
        <ButtonLink
          para={caminho(d.id)}
          variante="tertiary"
          tamanho="sm"
          icone={MessageSquareReply}
          aria-label={`${somenteLeitura || d.status === 'encerrada' ? 'Ver' : 'Responder ou encerrar'}: ${d.objeto}`}
        >
          {somenteLeitura || d.status === 'encerrada' ? 'Ver' : 'Responder ou encerrar'}
        </ButtonLink>
      )}
    />
  )
}

export function FormNovaDiligencia({ onCriar, acoesSecundarias }: { onCriar: (dados: { objeto: string; prazo: string }) => Promise<void>; acoesSecundarias?: ReactNode }) {
  return (
    <FormularioApi
      rotulo="Nova diligência"
      esquema={esquemaCamposDiligencia}
      valoresIniciais={{ objeto: '', prazo: '' }}
      limparAoConcluir
      rotuloEnviar="Abrir diligência"
      onEnviar={onCriar}
      acoesSecundarias={acoesSecundarias}
    >
      <Card titulo="Diligência" descricao="O que a OSC deve esclarecer e até quando.">
        <div className="space-y-4">
          <CampoTexto nome="objeto" rotulo="Objeto" tipo="textarea" />
          <CampoTexto nome="prazo" rotulo="Prazo" tipo="date" className="max-w-xs" />
        </div>
      </Card>
    </FormularioApi>
  )
}

interface PropsTratar {
  diligencia: DiligenciaGravada
  somenteLeitura: boolean
  onResponder: (resposta: string) => Promise<void>
  onEncerrar: (conclusao: string) => Promise<void>
}

/** Uma diligência: dados, resposta registrada e conclusão; formulários enquanto não está encerrada. */
export function TratarDiligencia({ diligencia: d, somenteLeitura, onResponder, onEncerrar }: PropsTratar) {
  const editavel = !somenteLeitura && d.status !== 'encerrada'
  return (
    <article aria-label={d.objeto} className="space-y-6">
      <Card titulo="Dados da diligência">
        <ListaDescricao
          className="xl:grid-cols-3"
          itens={[
            { termo: 'Situação', valor: <SituacaoDiligencia status={d.status} /> },
            { termo: 'Prazo', valor: dataBr(d.prazo) },
            { termo: 'Aberta por', valor: d.criadaPor?.email ?? '—' },
          ]}
        />
        <p className="mt-4 text-body-md text-text-primary">
          <span className="block text-label-md text-text-secondary">Objeto</span>
          {d.objeto}
        </p>
        {d.resposta && (
          <p className="mt-4 text-body-md text-text-primary">
            <span className="block text-label-md text-text-secondary">Resposta</span>
            {d.resposta.texto}
          </p>
        )}
        {d.conclusao && (
          <p className="mt-4 text-body-md text-text-primary">
            <span className="block text-label-md text-text-secondary">Conclusão</span>
            {d.conclusao}
          </p>
        )}
      </Card>
      {editavel && (
        <>
          <Card titulo="Registrar resposta" descricao="Texto da resposta da OSC (ou o nº SEI em que foi juntada).">
            <FormularioApi
              rotulo="Registrar resposta"
              esquema={esquemaRespostaForm}
              valoresIniciais={{ resposta: d.resposta?.texto ?? '' }}
              rotuloEnviar="Registrar resposta"
              onEnviar={({ resposta }) => onResponder(resposta)}
            >
              <CampoTexto nome="resposta" rotulo="Resposta" tipo="textarea" />
            </FormularioApi>
          </Card>
          <Card titulo="Encerrar diligência" descricao="A conclusão da Comissão encerra a diligência; diligência em aberto impede a homologação.">
            <FormularioApi
              rotulo="Encerrar diligência"
              esquema={esquemaConclusaoForm}
              valoresIniciais={{ conclusao: '' }}
              rotuloEnviar="Encerrar diligência"
              onEnviar={({ conclusao }) => onEncerrar(conclusao)}
            >
              <CampoTexto nome="conclusao" rotulo="Conclusão" tipo="textarea" />
            </FormularioApi>
          </Card>
        </>
      )}
    </article>
  )
}
