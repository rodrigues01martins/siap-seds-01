// /chamamentos/:ch (DetailPage): dados do chamamento, propostas por lote com status (e "Concluída") e sessões.
// Lixeira em cada item (lote, proposta, sessão): exclusão livre em cascata com a prévia (DialogoExclusao).

import { ClipboardCheck, FilePlus2, Presentation, SquarePen, Trophy } from 'lucide-react'
import { useParams } from 'react-router'
import { DetailPage } from '../../components/templates/paginas'
import { ButtonLink } from '../../components/ui/ButtonLink'
import { Card } from '../../components/ui/Card'
import { DataTable } from '../../components/ui/DataTable'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Skeleton } from '../../components/ui/Skeleton'
import { dataBr } from '../../lib/datas'
import { formatarCnpj } from '../../domain/cnpj'
import { podeFazer } from '../../domain/permissoes'
import { situacaoDaProposta } from '../../domain/situacaoProposta'
import { useColecao, useDocumento, type ComId } from '../../lib/firestore'
import { rotaAvaliar, rotaSessao } from '../../lib/rotas'
import type { Chamamento, Osc, Proposta, Sessao } from '../../lib/tipos'
import { useUsuario } from '../auth/useUsuario'
import { useExclusao } from '../exclusao/useExclusao'
import { SeloSessao } from '../sessoes/SeloSessao'

const numero = (valor: number | undefined) => (valor === undefined ? '—' : valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 }))

export function PainelChamamento() {
  const { ch } = useParams()
  const { usuario } = useUsuario()
  const acesso = usuario?.acesso ?? null
  const chamamento = useDocumento<Chamamento>(`chamamentos/${ch}`)
  const propostas = useColecao<Proposta>(`chamamentos/${ch}/propostas`)
  const oscs = useColecao<Osc>('oscs')
  const sessoes = useColecao<Sessao>(`chamamentos/${ch}/sessoes`)
  const exclusao = useExclusao()

  const carregando = chamamento.carregando || propostas.carregando || oscs.carregando || sessoes.carregando
  const erro = chamamento.erro ?? propostas.erro ?? oscs.erro ?? sessoes.erro
  const trilhaBase = [{ rotulo: 'Chamamentos', para: '/' }]
  if (carregando) return <Skeleton linhas={6} rotulo="Carregando chamamento" />
  if (erro) return <ErrorState mensagem={erro} />
  if (!chamamento.dados) return <EmptyState titulo="Chamamento não encontrado" descricao="Confira o endereço ou volte à lista de chamamentos." />

  const c = chamamento.dados
  const nomeOsc = new Map(oscs.dados.map((o) => [o.cnpj, o.razaoSocial]))
  // Admin e presidente fazem tudo (a rota já exige um dos perfis).
  const podeGravar = podeFazer(acesso)
  const sessaoAberta = sessoes.dados.find((s) => s.status === 'aberta')
  const caminho = `/chamamentos/${ch}`

  return (
    <DetailPage
      cabecalho={{
        trilha: [...trilhaBase, { rotulo: `Chamamento ${c.numero}` }],
        titulo: `Chamamento ${c.numero}`,
        descricao: c.titulo,
        acoesSecundarias: podeGravar ? (
          <ButtonLink para={`${caminho}/editar`} variante="secondary" icone={SquarePen}>
            Editar chamamento
          </ButtonLink>
        ) : undefined,
        acaoPrimaria: podeGravar ? (
          <ButtonLink para={`${caminho}/propostas/nova`} icone={FilePlus2}>
            Nova proposta
          </ButtonLink>
        ) : undefined,
      }}
      resumo={[
        { termo: 'Processo SEI', valor: c.processoSei ?? '—' },
        { termo: 'Data limite das propostas', valor: dataBr(c.dataLimitePropostas) },
        { termo: 'Propostas', valor: propostas.dados.length },
      ]}
    >
      {c.lotes.map((lote) => (
        <Card
          key={lote.codigo}
          titulo={`Lote ${lote.codigo} — ${lote.descricao}`}
          acoes={
            <span className="flex flex-wrap items-center gap-1">
              <ButtonLink para={`${caminho}/lotes/${encodeURIComponent(lote.codigo)}/classificacao`} variante="secondary" tamanho="sm" icone={Trophy}>
                Classificação do lote
              </ButtonLink>
              {podeGravar && exclusao.botao({ rota: '/api/chamamentos', ids: { id: ch ?? '', lote: lote.codigo }, nome: `lote ${lote.codigo} — ${lote.descricao}` })}
            </span>
          }
        >
          <DataTable<ComId<Proposta>>
            rotulo={`Propostas do lote ${lote.codigo}`}
            linhas={propostas.dados.filter((p) => p.loteCodigo === lote.codigo)}
            chave={(p) => p.id}
            vazio={{ titulo: 'Nenhuma proposta neste lote' }}
            colunas={[
              {
                id: 'osc',
                titulo: 'OSC',
                ordenar: (p) => nomeOsc.get(p.oscCnpj) ?? '',
                celula: (p) => (
                  <>
                    <span className="font-semibold">{nomeOsc.get(p.oscCnpj) ?? 'OSC não encontrada'}</span>
                    <span className="block text-caption text-text-muted">{formatarCnpj(p.oscCnpj)}</span>
                  </>
                ),
              },
              { id: 'protocolo', titulo: 'Protocolo', celula: (p) => p.protocolo ?? '—' },
              { id: 'sei', titulo: 'Nº SEI', celula: (p) => p.numeroSEI ?? '—' },
              { id: 'nf', titulo: 'NF', celula: (p) => numero(p.totais?.nf), ordenar: (p) => p.totais?.nf ?? -1, alinhar: 'direita' },
              {
                id: 'status',
                titulo: 'Status',
                celula: (p) => (
                  <span className="flex flex-wrap gap-1">
                    <StatusBadge status={situacaoDaProposta(p)} />
                    {p.concluida && <StatusBadge status="concluida" />}
                  </span>
                ),
              },
            ]}
            acoes={(p) => {
              const nome = nomeOsc.get(p.oscCnpj) ?? p.id
              const base = `${caminho}/propostas/${p.id}`
              return (
                <span className="flex flex-wrap justify-end gap-1">
                  <ButtonLink para={rotaAvaliar(ch ?? '', p.id)} variante="tertiary" tamanho="sm" icone={ClipboardCheck} aria-label={`Avaliar — ${nome}`}>
                    Avaliar
                  </ButtonLink>
                  {podeGravar && (
                    <ButtonLink para={`${base}/editar`} variante="tertiary" tamanho="sm" aria-label={`Editar proposta — ${nome}`}>
                      Editar
                    </ButtonLink>
                  )}
                  {podeGravar &&
                    exclusao.botao({ rota: '/api/propostas', ids: { chamamentoId: ch ?? '', propostaId: p.id }, nome: `proposta ${p.protocolo ?? p.id} — ${nome}` })}
                </span>
              )
            }}
          />
        </Card>
      ))}

      <Card
        titulo="Sessões da Comissão"
        acoes={
          podeGravar && !sessaoAberta ? (
            <ButtonLink para={`${caminho}/sessoes/nova`} variante="secondary" tamanho="sm" icone={Presentation}>
              Abrir sessão
            </ButtonLink>
          ) : undefined
        }
      >
        <DataTable<ComId<Sessao>>
          rotulo="Sessões"
          linhas={[...sessoes.dados].sort((a, b) => b.data.localeCompare(a.data))}
          chave={(s) => s.id}
          vazio={{ titulo: 'Nenhuma sessão registrada' }}
          colunas={[
            { id: 'data', titulo: 'Data', celula: (s) => dataBr(s.data), ordenar: (s) => s.data },
            { id: 'situacao', titulo: 'Situação', celula: (s) => <SeloSessao status={s.status} /> },
            { id: 'presentes', titulo: 'Presentes', celula: (s) => String(s.presentes.length), alinhar: 'direita' },
            { id: 'lotes', titulo: 'Lotes em pauta', celula: (s) => (s.lotes ?? []).join(', ') || '—' },
          ]}
          acoes={(s) => (
            <span className="flex justify-end gap-1">
              <ButtonLink para={rotaSessao(ch ?? '', s.id)} variante="tertiary" tamanho="sm" aria-label={`Abrir sessão de ${dataBr(s.data)}`}>
                Abrir
              </ButtonLink>
              {podeGravar && exclusao.botao({ rota: '/api/sessao', ids: { chamamentoId: ch ?? '', sessaoId: s.id }, nome: `sessão de ${dataBr(s.data)}` })}
            </span>
          )}
        />
      </Card>
      {exclusao.dialogo}
    </DetailPage>
  )
}
