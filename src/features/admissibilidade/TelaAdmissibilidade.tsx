// /chamamentos/:ch/propostas/:p/admissibilidade (FormPage) — registro da admissibilidade simplificada (admitida,
// motivo e páginas por PA). Grava por PUT /api/admissibilidade, na sessão aberta (sessaoId); sem sessão, consulta.

import { useParams } from 'react-router'
import { FormPage } from '../../components/templates/paginas'
import { Alert } from '../../components/ui/Alert'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { Skeleton } from '../../components/ui/Skeleton'
import { chamarApi } from '../../lib/api'
import { dataHoraBr } from '../../lib/datas'
import type { AdmissibilidadeGravada } from '../../lib/tipos'
import { cabecalhoDaProposta, ContextoProposta, motivoSemSessao, useDadosProposta } from '../avaliacao/CabecalhoProposta'
import { FormAdmissibilidade } from './FormAdmissibilidade'

const ROTULO_SITUACAO = { admitida: 'Admitida', nao_admitida: 'Não admitida', desclassificada: 'Desclassificada (28.2)' }

export function TelaAdmissibilidade() {
  const { ch = '', p = '' } = useParams()
  const leitura = useDadosProposta(ch, p)
  if (leitura.carregando) return <Skeleton linhas={6} rotulo="Carregando admissibilidade" />
  if (leitura.erro) return <ErrorState mensagem={leitura.erro} />
  if (!leitura.dados) return <EmptyState titulo="Proposta não encontrada" descricao="Confira o endereço ou volte ao painel do chamamento." />

  const { proposta, sessaoAberta } = leitura.dados
  const gravada: AdmissibilidadeGravada | null = proposta.admissibilidade ?? null
  const motivo = motivoSemSessao(leitura.dados, 'a admissibilidade')
  const por = proposta.atualizadoPor
  const em = (proposta as { atualizadoEm?: { toDate(): Date } }).atualizadoEm
  const autoria = por ? `Última alteração da proposta por ${por.nome ?? por.email ?? 'usuário'}${em ? ` em ${dataHoraBr(em.toDate())}` : ''}.` : ''
  const motivos = [...((gravada as { motivos?: string[] } | null)?.motivos ?? []), ...(gravada?.motivo ? [gravada.motivo] : [])]

  return (
    <FormPage cabecalho={cabecalhoDaProposta(leitura.dados, ch, 'admissibilidade')}>
      <ContextoProposta dados={leitura.dados} ch={ch} aba="admissibilidade" />
      {gravada && (
        <Alert
          tom={gravada.situacao === 'admitida' ? 'success' : 'error'}
          titulo={`Situação registrada: ${ROTULO_SITUACAO[gravada.situacao ?? 'admitida']}`}
        >
          {autoria && <p>{autoria}</p>}
          {motivos.length > 0 && (
            <ul className="mt-1 list-inside list-disc">
              {motivos.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          )}
        </Alert>
      )}
      <FormAdmissibilidade
        key={gravada ? JSON.stringify(gravada.planos) + String(gravada.admitida) + (gravada.motivo ?? '') : 'nova'}
        valor={gravada}
        somenteLeitura={motivo !== null}
        motivoSomenteLeitura={motivo ?? undefined}
        onSalvar={async (corpo) => {
          await chamarApi('/api/admissibilidade', { metodo: 'PUT', corpo: { chamamentoId: ch, propostaId: p, sessaoId: sessaoAberta?.id, ...corpo } })
        }}
      />
    </FormPage>
  )
}
