// /auditoria — trilha de auditoria (admin, presidente, controle; firestore.rules), somente leitura.
// O período vai na consulta ao Firestore (índice simples de dataHora); proposta, usuário e ação são
// filtrados aqui. Exporta para XLSX exatamente as linhas exibidas, com o rodapé de verificação.

import { collection, limit, orderBy, query, Timestamp, where, type QueryConstraint } from 'firebase/firestore'
import { useState } from 'react'
import { AlertaErro } from '../../componentes/AlertaErro'
import { EstadoLeitura, Titulo } from '../../componentes/basicos'
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
    <>
      <Titulo
        acoes={
          <button
            type="button"
            disabled={exibidos.length === 0 || gerando !== null}
            onClick={() =>
              gerar('xlsx', async () => {
                const { auditoriaXlsx } = await import('../../relatorios/xlsx')
                const arquivo = await auditoriaXlsx(exibidos, await rodape({ filtros, registros: exibidos }))
                baixarArquivo(arquivo, nomeDeArquivo('auditoria', filtros.de ?? '', filtros.ate ?? '') + '.xlsx', TIPO_XLSX)
              })
            }
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            {gerando ? 'Gerando…' : 'Exportar XLSX'}
          </button>
        }
      >
        Trilha de auditoria
      </Titulo>
      <p className="mb-4 text-sm text-slate-600">
        Cada escrita da /api grava aqui, na mesma transação, quem fez, quando, o que mudou (antes e depois). Somente leitura.
      </p>
      <FiltrosAuditoria inicial={filtros} onAplicar={setFiltros} />
      <AlertaErro erro={erro} />
      <div className="mt-4">
        {leitura.carregando || leitura.erro ? (
          <EstadoLeitura carregando={leitura.carregando} erro={leitura.erro} />
        ) : (
          <>
            <p className="mb-2 text-sm text-slate-700" role="status">
              {exibidos.length} de {registros.length} registro(s) do período.
              {registros.length === LIMITE_AUDITORIA && ` Mostrando os ${LIMITE_AUDITORIA} mais recentes: escolha um período menor para ver todos.`}
            </p>
            <TabelaAuditoria registros={exibidos} />
          </>
        )}
      </div>
    </>
  )
}
