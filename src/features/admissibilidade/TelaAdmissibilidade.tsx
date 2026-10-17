// /chamamentos/:ch/propostas/:p/admissibilidade (FormPage) — registro da admissibilidade (quem tem a
// permissão); os demais perfis consultam. Grava por PUT /api/admissibilidade, na sessão aberta (sessaoId).

import { useParams } from 'react-router'
import { FormPage } from '../../components/templates/paginas'
import { Alert } from '../../components/ui/Alert'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { Skeleton } from '../../components/ui/Skeleton'
import type { Admissibilidade } from '../../domain/admissibilidade'
import { podeFazer } from '../../domain/permissoes'
import { chamarApi } from '../../lib/api'
import { dataBr } from '../../lib/datas'
import { useUsuario } from '../auth/useUsuario'
import { cabecalhoDaProposta, ContextoProposta, motivoSemSessao, useDadosProposta } from '../avaliacao/CabecalhoProposta'
import { FormAdmissibilidade } from './FormAdmissibilidade'

const ROTULO_SITUACAO = { admitida: 'Admitida', nao_admitida: 'Não admitida', desclassificada: 'Desclassificada (28.2)' }

type Gravada = Admissibilidade & { registradaPor?: { email: string | null }; registradaEm?: { toDate(): Date } }

export function TelaAdmissibilidade() {
  const { ch = '', p = '' } = useParams()
  const { usuario } = useUsuario()
  const leitura = useDadosProposta(ch, p)
  if (leitura.carregando) return <Skeleton linhas={6} rotulo="Carregando admissibilidade" />
  if (leitura.erro) return <ErrorState mensagem={leitura.erro} />
  if (!leitura.dados) return <EmptyState titulo="Proposta não encontrada" descricao="Confira o endereço ou volte ao painel do chamamento." />

  const { proposta, sessaoAberta } = leitura.dados
  const gravada = (proposta as { admissibilidade?: Gravada }).admissibilidade ?? null
  const motivo = proposta.bloqueada
    ? 'Proposta homologada.'
    : !podeFazer(usuario?.acesso ?? null, 'admissibilidade')
      ? 'Você consulta a admissibilidade; o registro exige a permissão "Admissibilidade".'
      : motivoSemSessao(leitura.dados, 'a admissibilidade')
  const autoria = gravada?.registradaPor
    ? ` Registrada por ${gravada.registradaPor.email ?? 'usuário'}${gravada.registradaEm ? ` em ${dataBr(gravada.registradaEm.toDate().toISOString().slice(0, 10))}` : ''}.`
    : ''

  return (
    <FormPage cabecalho={cabecalhoDaProposta(leitura.dados, ch, 'admissibilidade')}>
      <ContextoProposta dados={leitura.dados} ch={ch} aba="admissibilidade" />
      {gravada && (
        <Alert
          tom={gravada.situacao === 'admitida' ? 'success' : 'error'}
          titulo={`Situação registrada: ${ROTULO_SITUACAO[gravada.situacao]}`}
        >
          {autoria && <p>{autoria.trim()}</p>}
          {gravada.motivos.length > 0 && (
            <ul className="mt-1 list-inside list-disc">
              {gravada.motivos.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          )}
        </Alert>
      )}
      <FormAdmissibilidade
        key={gravada ? JSON.stringify(gravada.planos) + gravada.resultado : 'nova'}
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
