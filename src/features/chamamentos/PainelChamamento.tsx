// /chamamentos/:ch (DetailPage): dados do chamamento, propostas por lote com status e sessões.
// Admin: "Excluir" proposta no menu de ações da linha (DialogoExclusao; homologada fica bloqueada).

import { FilePlus2, Presentation, SquarePen, Trophy } from 'lucide-react'
import { useParams } from 'react-router'
import { DetailPage } from '../../components/templates/paginas'
import { ButtonLink } from '../../components/ui/ButtonLink'
import { Card } from '../../components/ui/Card'
import { DataTable } from '../../components/ui/DataTable'
import { MenuAcoes } from '../../components/ui/MenuAcoes'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { Badge, StatusBadge } from '../../components/ui/StatusBadge'
import { Skeleton } from '../../components/ui/Skeleton'
import { dataBr } from '../../lib/datas'
import { formatarCnpj } from '../../domain/cnpj'
import { podeFazer } from '../../domain/permissoes'
import { statusDaProposta } from '../../domain/statusProposta'
import { useColecao, useDocumento, type ComId } from '../../lib/firestore'
import type { Chamamento, Osc, Proposta, Sessao } from '../../lib/tipos'
import { useUsuario } from '../auth/useUsuario'
import { emExclusao, SeloEmExclusao, useExclusao } from '../exclusao/useExclusao'

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
  const podeEditar = podeFazer(acesso, 'chamamentos')
  const podeProposta = podeFazer(acesso, 'propostas')
  const admin = acesso?.admin === true
  const sessaoAberta = sessoes.dados.find((s) => s.status === 'aberta')
  const caminho = `/chamamentos/${ch}`

  return (
    <DetailPage
      cabecalho={{
        trilha: [...trilhaBase, { rotulo: `Chamamento ${c.numero}` }],
        titulo: `Chamamento ${c.numero}`,
        descricao: c.titulo,
        acoesSecundarias: podeEditar ? (
          <ButtonLink para={`${caminho}/editar`} variante="secondary" icone={SquarePen}>
            Editar chamamento
          </ButtonLink>
        ) : undefined,
        acaoPrimaria: podeProposta ? (
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
            <ButtonLink para={`${caminho}/lotes/${encodeURIComponent(lote.codigo)}/classificacao`} variante="secondary" tamanho="sm" icone={Trophy}>
              Classificação do lote
            </ButtonLink>
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
              { id: 'status', titulo: 'Status', celula: (p) => (emExclusao(p) ? <SeloEmExclusao /> : <StatusBadge status={statusDaProposta(p)} />) },
            ]}
            acoes={(p) => {
              const nome = nomeOsc.get(p.oscCnpj) ?? p.id
              const base = `${caminho}/propostas/${p.id}`
              return (
                <span className="flex flex-wrap justify-end gap-1">
                  {(
                    [
                      ['admissibilidade', 'Admissibilidade'],
                      ['d1', 'D1'],
                      ['d2', 'D2'],
                      ['diligencias', 'Diligências'],
                    ] as const
                  ).map(([rota, rotulo]) => (
                    <ButtonLink key={rota} para={`${base}/${rota}`} variante="tertiary" tamanho="sm" aria-label={`${rotulo} — ${nome}`}>
                      {rotulo}
                    </ButtonLink>
                  ))}
                  {podeProposta && !p.bloqueada && (
                    <ButtonLink para={`${base}/editar`} variante="tertiary" tamanho="sm" aria-label={`Editar proposta — ${nome}`}>
                      Editar
                    </ButtonLink>
                  )}
                  {admin && (
                    <MenuAcoes
                      rotulo={`Mais ações — proposta ${p.protocolo ?? p.id}`}
                      itens={[
                        exclusao.itemExcluir({
                          tipo: 'proposta',
                          ids: { chamamentoId: ch ?? '', propostaId: p.id },
                          identificador: p.protocolo ?? p.id,
                          nome: `proposta ${p.protocolo ?? p.id} — ${nome}`,
                        }),
                      ]}
                    />
                  )}
                </span>
              )
            }}
          />
        </Card>
      ))}

      <Card
        titulo="Sessões da Comissão"
        acoes={
          podeFazer(acesso, 'sessaoAbrirEncerrar') && !sessaoAberta ? (
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
            { id: 'situacao', titulo: 'Situação', celula: (s) => <Badge tom={s.status === 'aberta' ? 'success' : 'neutral'}>{s.status === 'aberta' ? 'Aberta' : 'Encerrada'}</Badge> },
            { id: 'presentes', titulo: 'Presentes', celula: (s) => String(s.presentes.length), alinhar: 'direita' },
            { id: 'pauta', titulo: 'Propostas na pauta', celula: (s) => String(s.pauta.length), alinhar: 'direita' },
          ]}
          acoes={(s) => (
            <ButtonLink para={`${caminho}/sessoes/${s.id}`} variante="tertiary" tamanho="sm" aria-label={`Abrir sessão de ${dataBr(s.data)}`}>
              Abrir
            </ButtonLink>
          )}
        />
      </Card>
      {exclusao.dialogo}
    </DetailPage>
  )
}
