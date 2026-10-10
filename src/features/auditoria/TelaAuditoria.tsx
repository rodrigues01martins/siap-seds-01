// /auditoria (ListPage) — histórico de alterações (só administrador; firestore.rules), somente leitura.
// O período vai na consulta ao Firestore (índice simples de dataHora); proposta, usuário e ação são
// filtrados aqui. Exporta para XLSX exatamente as linhas exibidas, com o rodapé de verificação.

import { collection, limit, orderBy, query, Timestamp, where, type QueryConstraint } from 'firebase/firestore'
import { useState } from 'react'
import { FileSpreadsheet } from 'lucide-react'
import { ListPage } from '../../components/templates/paginas'
import { Alert } from '../../components/ui/Alert'
import { AlertaErroApi } from '../../components/ui/AlertaErroApi'
import { Button } from '../../components/ui/Button'
import { ErrorState } from '../../components/ui/ErrorState'
import { Skeleton } from '../../components/ui/Skeleton'
import { hojeEmGoias } from '../../esquemas/base'
import { TIPO_XLSX, baixarArquivo, nomeDeArquivo } from '../../lib/arquivo'
import { useConsulta } from '../../lib/firestore'
import { filtrarAuditoria, limitesDoPeriodo, type FiltrosAuditoria as Filtros, type RegistroAuditoria } from '../../relatorios/auditoria'
import { useGeracao } from '../relatorios/useGeracao'
import { FiltrosAuditoria, TabelaAuditoria } from './TabelaAuditoria'

/** Teto de registros por consulta; acima disso, a tela pede um período menor. */
export const LIMITE_AUDITORIA = 2000
const DIA_MS = 24 * 60 * 60 * 1000

type RegistroGravado = Omit<RegistroAuditoria, 'id' | 'dataHora'> & { dataHora?: Timestamp | null }

export function TelaAuditoria() {
  const hoje = hojeEmGoias()
  const [filtros, setFiltros] = useState<Filtros>({ de: hojeEmGoias(new Date(Date.now() - 30 * DIA_MS)), ate: hoje })
  const { gerando, erro, gerar, rodape } = useGeracao()

  const chave = `auditoria|${filtros.de ?? ''}|${filtros.ate ?? ''}`
  const leitura = useConsulta<RegistroGravado>(chave, (db) => {
    const { inicio, fim } = limitesDoPeriodo(filtros.de, filtros.ate)
    const restricoes: QueryConstraint[] = []
    if (inicio) restricoes.push(where('dataHora', '>=', Timestamp.fromDate(inicio)))
    if (fim) restricoes.push(where('dataHora', '<=', Timestamp.fromDate(fim)))
    return query(collection(db, 'auditoria'), ...restricoes, orderBy('dataHora', 'desc'), limit(LIMITE_AUDITORIA))
  })

  const registros: RegistroAuditoria[] = leitura.dados.map((r) => ({ ...r, dataHora: r.dataHora?.toDate() ?? null }))
  const exibidos = filtrarAuditoria(registros, filtros)

  return (
    <ListPage
      cabecalho={{
        trilha: [{ rotulo: 'Chamamentos', para: '/' }, { rotulo: 'Histórico de alterações' }],
        titulo: 'Histórico de alterações',
        descricao: 'Cada escrita da /api grava aqui, na mesma transação, quem fez, quando e o que mudou (antes e depois). Somente leitura.',
        acoesSecundarias: (
          <Button
            variante="secondary"
            icone={FileSpreadsheet}
            desabilitado={exibidos.length === 0}
            carregando={gerando !== null}
            onClick={() =>
              gerar('xlsx', async () => {
                const { auditoriaXlsx } = await import('../../relatorios/xlsx')
                const arquivo = await auditoriaXlsx(exibidos, await rodape({ filtros, registros: exibidos }))
                baixarArquivo(arquivo, nomeDeArquivo('auditoria', filtros.de ?? '', filtros.ate ?? '') + '.xlsx', TIPO_XLSX)
              })
            }
          >
            Exportar XLSX
          </Button>
        ),
      }}
    >
      <FiltrosAuditoria inicial={filtros} onAplicar={setFiltros} />
      <AlertaErroApi erro={erro} />
      {leitura.carregando ? (
        <Skeleton linhas={6} rotulo="Carregando histórico" />
      ) : leitura.erro ? (
        <ErrorState mensagem={leitura.erro} />
      ) : (
        <>
          <p className="text-body-sm text-text-secondary" role="status">
            {exibidos.length} de {registros.length} registro(s) do período.
          </p>
          {registros.length === LIMITE_AUDITORIA && (
            <Alert tom="warning" titulo="Período com muitos registros">
              Mostrando os {LIMITE_AUDITORIA} mais recentes: escolha um período menor para ver todos.
            </Alert>
          )}
          <TabelaAuditoria registros={exibidos} />
        </>
      )}
    </ListPage>
  )
}
