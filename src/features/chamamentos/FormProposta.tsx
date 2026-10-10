// Cadastro e edição de proposta (FormPage): OSC, lote, protocolo e nº SEI — POST/PATCH /api/propostas.

import type { FieldValues } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router'
import { FormPage } from '../../components/templates/paginas'
import { Alert } from '../../components/ui/Alert'
import { ButtonLink } from '../../components/ui/ButtonLink'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { CampoLista, CampoTexto, FormularioApi } from '../../components/ui/FormularioApi'
import { Skeleton } from '../../components/ui/Skeleton'
import { formatarCnpj } from '../../domain/cnpj'
import { esquemaCriarProposta } from '../../esquemas/cadastros'
import { chamarApi } from '../../lib/api'
import { useColecao, useDocumento } from '../../lib/firestore'
import type { Chamamento, Osc, Proposta } from '../../lib/tipos'

const VAZIO = { oscCnpj: '', loteCodigo: '', protocolo: '', numeroSEI: '', observacao: '' }

export function FormProposta() {
  const { ch, p } = useParams()
  const navegar = useNavigate()
  const chamamento = useDocumento<Chamamento>(`chamamentos/${ch}`)
  const oscs = useColecao<Osc>('oscs')
  const proposta = useDocumento<Proposta>(p ? `chamamentos/${ch}/propostas/${p}` : null)

  const carregando = chamamento.carregando || oscs.carregando || (p !== undefined && proposta.carregando)
  const erro = chamamento.erro ?? oscs.erro ?? proposta.erro
  if (carregando) return <Skeleton linhas={6} rotulo="Carregando proposta" />
  if (erro) return <ErrorState mensagem={erro} />
  if (!chamamento.dados) return <EmptyState titulo="Chamamento não encontrado" />
  if (p && !proposta.dados) return <EmptyState titulo="Proposta não encontrada" />

  const atual = proposta.dados as Record<string, unknown> | null
  const iniciais = Object.fromEntries(Object.entries(VAZIO).map(([campo, vazio]) => [campo, atual?.[campo] ?? vazio]))
  const opcoesOsc = [...oscs.dados]
    .sort((a, b) => a.razaoSocial.localeCompare(b.razaoSocial))
    .map((o) => ({ valor: o.cnpj, rotulo: `${o.razaoSocial} — ${formatarCnpj(o.cnpj)}` }))
  const titulo = p ? 'Editar proposta' : 'Nova proposta'
  const voltar = `/chamamentos/${ch}`

  return (
    <FormPage
      cabecalho={{
        trilha: [{ rotulo: 'Chamamentos', para: '/' }, { rotulo: `Chamamento ${chamamento.dados.numero}`, para: voltar }, { rotulo: titulo }],
        titulo,
        descricao: `Chamamento ${chamamento.dados.numero}. O Caderno é consultado no SEI pelo nº do documento; o app não guarda o PDF.`,
      }}
    >
      <FormularioApi
        rotulo={titulo}
        esquema={esquemaCriarProposta}
        valoresIniciais={iniciais}
        transformar={(valores: FieldValues) => ({ ...valores, chamamentoId: ch })}
        rotuloEnviar={p ? 'Salvar alterações' : 'Cadastrar proposta'}
        acoesSecundarias={
          <ButtonLink para={voltar} variante="secondary">
            Cancelar
          </ButtonLink>
        }
        onEnviar={async (dados) => {
          if (p) await chamarApi('/api/propostas', { metodo: 'PATCH', corpo: { ...dados, propostaId: p } })
          else await chamarApi('/api/propostas', { metodo: 'POST', corpo: dados })
          navegar(voltar)
        }}
      >
        <Card titulo="Identificação">
          <div className="grid gap-4">
            <CampoLista nome="oscCnpj" rotulo="OSC" opcoes={opcoesOsc} vazio="Selecione a OSC…" obrigatorio />
            {opcoesOsc.length === 0 && (
              <Alert tom="warning" titulo="Nenhuma OSC cadastrada" acao={<ButtonLink para="/oscs" variante="secondary" tamanho="sm">Cadastrar OSC</ButtonLink>}>
                Cadastre a OSC antes da proposta.
              </Alert>
            )}
            <CampoLista
              nome="loteCodigo"
              rotulo="Lote"
              obrigatorio
              opcoes={chamamento.dados.lotes.map((l) => ({ valor: l.codigo, rotulo: `${l.codigo} — ${l.descricao}` }))}
              vazio="Selecione o lote…"
            />
          </div>
        </Card>
        <Card titulo="Documentos">
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoTexto nome="protocolo" rotulo="Protocolo" obrigatorio />
            <CampoTexto nome="numeroSEI" rotulo="Nº do documento SEI" obrigatorio />
            <CampoTexto nome="observacao" rotulo="Observação" tipo="textarea" className="sm:col-span-2" />
          </div>
        </Card>
      </FormularioApi>
    </FormPage>
  )
}
