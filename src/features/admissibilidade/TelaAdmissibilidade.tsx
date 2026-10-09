// /chamamentos/:ch/propostas/:p/admissibilidade — registro da admissibilidade (presidente e relator);
// os demais perfis consultam. Grava por PUT /api/admissibilidade.

import { useParams } from 'react-router'
import { EstadoLeitura, dataBr } from '../../componentes/basicos'
import type { Admissibilidade } from '../../domain/admissibilidade'
import { podeFazer } from '../../domain/permissoes'
import { chamarApi } from '../../lib/api'
import { useUsuario } from '../auth/useUsuario'
import { CabecalhoProposta, useDadosProposta } from '../avaliacao/CabecalhoProposta'
import { FormAdmissibilidade } from './FormAdmissibilidade'

const ROTULO_SITUACAO = { admitida: 'Admitida', nao_admitida: 'Não admitida', desclassificada: 'Desclassificada (28.2)' }

type Gravada = Admissibilidade & { registradaPor?: { email: string | null }; registradaEm?: { toDate(): Date } }

export function TelaAdmissibilidade() {
  const { ch = '', p = '' } = useParams()
  const { usuario } = useUsuario()
  const leitura = useDadosProposta(ch, p)
  if (leitura.carregando || leitura.erro) return <EstadoLeitura carregando={leitura.carregando} erro={leitura.erro} />
  if (!leitura.dados) return <p className="text-slate-600">Proposta não encontrada.</p>

  const { proposta } = leitura.dados
  const gravada = (proposta as { admissibilidade?: Gravada }).admissibilidade ?? null
  const motivo = proposta.bloqueada
    ? 'Proposta homologada: somente leitura.'
    : !podeFazer(usuario?.perfil ?? null, 'admissibilidade')
      ? 'Seu perfil consulta a admissibilidade; o registro é do presidente ou do relator.'
      : null

  return (
    <>
      <CabecalhoProposta dados={leitura.dados} ch={ch} aba="admissibilidade" />
      {gravada && (
        <section className="mb-4 rounded-lg border border-slate-200 bg-white p-4 text-sm">
          <p>
            Situação registrada: <strong>{ROTULO_SITUACAO[gravada.situacao]}</strong>
            {gravada.registradaPor && (
              <span className="text-slate-500">
                {' '}
                — por {gravada.registradaPor.email ?? 'usuário'}
                {gravada.registradaEm ? ` em ${dataBr(gravada.registradaEm.toDate().toISOString().slice(0, 10))}` : ''}
              </span>
            )}
          </p>
          {gravada.motivos.length > 0 && (
            <ul className="mt-1 list-inside list-disc text-red-800">
              {gravada.motivos.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          )}
        </section>
      )}
      <div className="max-w-5xl rounded-lg border border-slate-200 bg-white p-5">
        <FormAdmissibilidade
          key={gravada ? JSON.stringify(gravada.planos) + gravada.resultado : 'nova'}
          valor={gravada}
          somenteLeitura={motivo !== null}
          motivoSomenteLeitura={motivo ?? undefined}
          onSalvar={async (corpo) => {
            await chamarApi('/api/admissibilidade', { metodo: 'PUT', corpo: { chamamentoId: ch, propostaId: p, ...corpo } })
          }}
        />
      </div>
    </>
  )
}
