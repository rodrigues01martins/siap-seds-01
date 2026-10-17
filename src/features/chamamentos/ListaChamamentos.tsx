// Início (ListPage): em destaque, a sessão aberta com "Continuar" (ou "Abrir sessão", escolhendo o chamamento);
// abaixo, a lista de chamamentos com busca e ordenação e "Novo chamamento". Lixeira em cada linha: exclusão livre
// com a prévia (DialogoExclusao). Admin e presidente fazem tudo.

import { collection, query, where } from 'firebase/firestore'
import { ClipboardList, FolderOpen, Play, Presentation } from 'lucide-react'
import { useState } from 'react'
import { ListPage } from '../../components/templates/paginas'
import { ButtonLink } from '../../components/ui/ButtonLink'
import { DataTable, type ColunaTabela } from '../../components/ui/DataTable'
import { dataBr } from '../../lib/datas'
import { useColecao, useConsultas, type ComId } from '../../lib/firestore'
import { rotaSessao } from '../../lib/rotas'
import type { Chamamento, Sessao } from '../../lib/tipos'
import { Card } from '../../components/ui/Card'
import { Select } from '../../components/ui/Select'
import { useExclusao } from '../exclusao/useExclusao'

const COLUNAS: ColunaTabela<ComId<Chamamento>>[] = [
  { id: 'numero', titulo: 'Nº', celula: (c) => c.numero, ordenar: (c) => c.numero },
  {
    id: 'titulo',
    titulo: 'Título',
    celula: (c) => <span className="font-semibold">{c.titulo}</span>,
    ordenar: (c) => c.titulo,
  },
  { id: 'sei', titulo: 'Processo SEI', celula: (c) => c.processoSei ?? '—' },
  { id: 'limite', titulo: 'Data limite', celula: (c) => dataBr(c.dataLimitePropostas), ordenar: (c) => c.dataLimitePropostas ?? '' },
  { id: 'lotes', titulo: 'Lotes', celula: (c) => String(c.lotes?.length ?? 0), alinhar: 'direita' },
]

type SessaoAberta = ComId<Sessao> & { chamamento: ComId<Chamamento> }

/** Sessões abertas de todos os chamamentos, em tempo real (uma consulta por chamamento). */
function useSessoesAbertas(chamamentos: ComId<Chamamento>[]): SessaoAberta[] {
  const porChamamento = useConsultas<Sessao>(
    chamamentos.map((c) => c.id),
    (db, id) => query(collection(db, `chamamentos/${id}/sessoes`), where('status', '==', 'aberta')),
  )
  return chamamentos.flatMap((c) => (porChamamento[c.id] ?? []).map((s) => ({ ...s, chamamento: c })))
}

/** Sessão aberta em destaque ("Continuar"); sem sessão, "Abrir sessão" no chamamento escolhido. */
function SessaoEmDestaque({ chamamentos }: { chamamentos: ComId<Chamamento>[] }) {
  const abertas = useSessoesAbertas(chamamentos)
  const [escolhido, setEscolhido] = useState('')
  if (chamamentos.length === 0) return null
  if (abertas.length > 0) {
    return (
      <section aria-label="Sessão aberta" className="space-y-3">
        {abertas.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center gap-4 rounded-card border-2 border-action-primary bg-action-subtle p-(--sds-card-padding)">
            <div className="min-w-0 flex-1">
              <p className="text-label-md text-text-link">Sessão aberta</p>
              <p className="text-heading-3 text-text-primary">
                {dataBr(s.data)} · Chamamento {s.chamamento.numero}
              </p>
              <p className="text-body-sm text-text-secondary">
                Lote(s) em pauta: {(s.lotes ?? []).join(', ') || '—'} · {s.presentes.length} presente(s)
              </p>
            </div>
            <ButtonLink para={rotaSessao(s.chamamento.id, s.id)} icone={Play}>
              Continuar
            </ButtonLink>
          </div>
        ))}
      </section>
    )
  }
  const alvo = escolhido || chamamentos[0]!.id
  return (
    <Card titulo="Nenhuma sessão aberta" descricao="Abra a sessão da Comissão para avaliar as propostas em pauta.">
      <div className="flex flex-wrap items-end gap-3">
        {chamamentos.length > 1 && (
          <Select
            rotulo="Chamamento"
            value={alvo}
            onChange={(e) => setEscolhido(e.target.value)}
            opcoes={chamamentos.map((c) => ({ valor: c.id, rotulo: `${c.numero} — ${c.titulo}` }))}
            className="min-w-64"
          />
        )}
        <ButtonLink para={`/chamamentos/${alvo}/sessoes/nova`} icone={Presentation}>
          Abrir sessão
        </ButtonLink>
      </div>
    </Card>
  )
}

/** Início: sessão aberta em destaque e a lista de chamamentos; admin e presidente cadastram e excluem. */
export function Inicio() {
  const leitura = useColecao<Chamamento>('chamamentos')
  const exclusao = useExclusao()

  return (
    <ListPage
      cabecalho={{
        titulo: 'Início',
        descricao: 'Continue a sessão aberta ou abra um chamamento para ver as propostas por lote, as sessões e a classificação.',
        acoesSecundarias: (
          <ButtonLink para="/chamamentos/novo" variante="secondary" icone={ClipboardList}>
            Novo chamamento
          </ButtonLink>
        ),
      }}
    >
      <SessaoEmDestaque chamamentos={[...leitura.dados].sort((a, b) => a.numero.localeCompare(b.numero))} />
      <DataTable
        rotulo="Chamamentos"
        colunas={COLUNAS}
        linhas={[...leitura.dados].sort((a, b) => a.numero.localeCompare(b.numero))}
        chave={(c) => c.id}
        carregando={leitura.carregando}
        erro={leitura.erro}
        busca={{ rotulo: 'Buscar por número ou título', texto: (c) => `${c.numero} ${c.titulo}` }}
        vazio={{ titulo: 'Nenhum chamamento cadastrado', descricao: 'Use "Novo chamamento" para começar.' }}
        acoes={(c) => (
          <span className="flex justify-end gap-1">
            <ButtonLink para={`/chamamentos/${c.id}`} variante="tertiary" tamanho="sm" icone={FolderOpen} aria-label={`Abrir chamamento ${c.numero}`}>
              Abrir
            </ButtonLink>
            {exclusao.botao({ rota: '/api/chamamentos', ids: { id: c.id }, nome: `chamamento ${c.numero}` })}
          </span>
        )}
      />
      {exclusao.dialogo}
    </ListPage>
  )
}
