// Início (ListPage): lista de chamamentos com busca e ordenação; "Novo chamamento" para quem cadastra.
// Admin: "Excluir" no menu de ações da linha (DialogoExclusao).

import { ClipboardList, FolderOpen } from 'lucide-react'
import { ListPage } from '../../components/templates/paginas'
import { ButtonLink } from '../../components/ui/ButtonLink'
import { DataTable, type ColunaTabela } from '../../components/ui/DataTable'
import { MenuAcoes } from '../../components/ui/MenuAcoes'
import { dataBr } from '../../lib/datas'
import { podeFazer } from '../../domain/permissoes'
import { useColecao, type ComId } from '../../lib/firestore'
import type { Chamamento } from '../../lib/tipos'
import { useUsuario } from '../auth/useUsuario'
import { emExclusao, SeloEmExclusao, useExclusao } from '../exclusao/useExclusao'

const COLUNAS: ColunaTabela<ComId<Chamamento>>[] = [
  { id: 'numero', titulo: 'Nº', celula: (c) => c.numero, ordenar: (c) => c.numero },
  {
    id: 'titulo',
    titulo: 'Título',
    celula: (c) => (
      <span className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{c.titulo}</span>
        {emExclusao(c) && <SeloEmExclusao />}
      </span>
    ),
    ordenar: (c) => c.titulo,
  },
  { id: 'sei', titulo: 'Processo SEI', celula: (c) => c.processoSei ?? '—' },
  { id: 'limite', titulo: 'Data limite', celula: (c) => dataBr(c.dataLimitePropostas), ordenar: (c) => c.dataLimitePropostas ?? '' },
  { id: 'lotes', titulo: 'Lotes', celula: (c) => String(c.lotes?.length ?? 0), alinhar: 'direita' },
]

/** Início: lista de chamamentos (qualquer usuário com acesso; quem tem "Chamamentos" cadastra). */
export function Inicio() {
  const { usuario } = useUsuario()
  const leitura = useColecao<Chamamento>('chamamentos')
  const podeCadastrar = podeFazer(usuario?.acesso ?? null, 'chamamentos')
  const admin = usuario?.acesso?.admin === true
  const exclusao = useExclusao()

  return (
    <ListPage
      cabecalho={{
        titulo: 'Chamamentos',
        descricao: 'Abra um chamamento para ver as propostas por lote, as sessões e a classificação.',
        acaoPrimaria: podeCadastrar ? (
          <ButtonLink para="/chamamentos/novo" icone={ClipboardList}>
            Novo chamamento
          </ButtonLink>
        ) : undefined,
      }}
    >
      <DataTable
        rotulo="Chamamentos"
        colunas={COLUNAS}
        linhas={[...leitura.dados].sort((a, b) => a.numero.localeCompare(b.numero))}
        chave={(c) => c.id}
        carregando={leitura.carregando}
        erro={leitura.erro}
        busca={{ rotulo: 'Buscar por número ou título', texto: (c) => `${c.numero} ${c.titulo}` }}
        vazio={{ titulo: 'Nenhum chamamento cadastrado', descricao: podeCadastrar ? 'Use "Novo chamamento" para começar.' : undefined }}
        acoes={(c) => (
          <span className="flex justify-end gap-1">
            <ButtonLink para={`/chamamentos/${c.id}`} variante="tertiary" tamanho="sm" icone={FolderOpen} aria-label={`Abrir chamamento ${c.numero}`}>
              Abrir
            </ButtonLink>
            {admin && (
              <MenuAcoes
                rotulo={`Mais ações — chamamento ${c.numero}`}
                itens={[exclusao.itemExcluir({ tipo: 'chamamento', ids: { id: c.id }, identificador: c.numero, nome: `chamamento ${c.numero}` })]}
              />
            )}
          </span>
        )}
      />
      {exclusao.dialogo}
    </ListPage>
  )
}
