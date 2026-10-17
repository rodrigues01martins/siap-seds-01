// Aba Admissão (Anexo III, item 28, simplificada): admitida sim/não, motivo (se não) e as páginas inicial e final
// de cada PA numa linha, com páginas, página de corte e o excedente calculados na hora (src/domain).
// Salvamento automático do registro inteiro: "admitida" na hora; motivo e páginas com debounce. As páginas só
// liberam depois de escolher sim/não (a /api exige a escolha). Página inválida não é enviada (aviso no campo).

import { Alert } from '../../components/ui/Alert'
import { RadioGroup } from '../../components/ui/RadioGroup'
import { TextArea } from '../../components/ui/TextArea'
import { MOTIVACAO_MINIMA } from '../../domain/admissibilidade'
import { MATRIZ_2026 } from '../../domain/matriz'
import { apurarPlanos, problemasDaAdmissao, type PlanoAdmissibilidade } from '../../esquemas/admissibilidade'
import { chamarApi } from '../../lib/api'
import type { AdmissibilidadeGravada } from '../../lib/tipos'
import { ATRASO_TEXTO, useCampo, useFila } from './salvamento'
import { chaveAdmissao } from './valores'

const PLANOS = MATRIZ_2026.dimensao1.planos

export interface Admissao {
  admitida: boolean | null
  motivo: string
  planos: PlanoAdmissibilidade[]
}

/** Registro gravado → valor da tela (os 6 PAs, na ordem da matriz). */
export function paraAdmissao(gravada: AdmissibilidadeGravada | undefined): Admissao {
  return {
    admitida: gravada?.admitida ?? null,
    motivo: gravada?.motivo ?? '',
    planos: PLANOS.map((pa) => {
      const plano = gravada?.planos?.find((p) => p.codigo === pa.codigo)
      return { codigo: pa.codigo, paginaInicial: plano?.paginaInicial ?? null, paginaFinal: plano?.paginaFinal ?? null }
    }),
  }
}

interface Props {
  ch: string
  p: string
  sessaoId: string | null
  gravada: AdmissibilidadeGravada | undefined
  motivoSomenteLeitura: string | null
}

const pagina = (texto: string): number | null => (texto.trim() === '' ? null : Number(texto))

export function AbaAdmissao({ ch, p, sessaoId, gravada, motivoSomenteLeitura }: Props) {
  const fila = useFila()
  const chave = chaveAdmissao(p)
  const valor = useCampo<Admissao>(chave, paraAdmissao(gravada))
  const somenteLeitura = motivoSomenteLeitura !== null
  const apurados = apurarPlanos(valor.planos)
  const problemas = problemasDaAdmissao({ admitida: valor.admitida ?? true, motivo: valor.motivo, planos: valor.planos })

  function mudar(novo: Admissao, atraso: number) {
    const erros = problemasDaAdmissao({ admitida: novo.admitida ?? true, motivo: novo.motivo, planos: novo.planos })
    if (novo.admitida === null) {
      fila.guardar(chave, novo, 'escolha se a proposta foi admitida')
      return
    }
    if (Object.keys(erros).length > 0) {
      fila.guardar(chave, novo, `admissão: ${Object.values(erros)[0]}`)
      return
    }
    fila.salvar(
      chave,
      novo,
      (v) =>
        chamarApi('/api/admissibilidade', {
          metodo: 'PUT',
          corpo: { chamamentoId: ch, propostaId: p, sessaoId, admitida: v.admitida, ...(v.motivo.trim() ? { motivo: v.motivo } : {}), planos: v.planos },
        }),
      atraso,
    )
  }

  function mudarPlano(i: number, campo: 'paginaInicial' | 'paginaFinal', texto: string) {
    const planos = valor.planos.map((plano, j) => (j === i ? { ...plano, [campo]: pagina(texto) } : plano))
    mudar({ ...valor, planos }, ATRASO_TEXTO)
  }

  const excedidos = apurados.filter((a) => a.excede > 0)
  const semEscolha = valor.admitida === null

  return (
    <div className="space-y-6">
      {motivoSomenteLeitura && (
        <Alert tom="info" titulo="Somente leitura">
          {motivoSomenteLeitura}
        </Alert>
      )}
      <section aria-label="Admissão" className="space-y-4 rounded-card border border-card-border bg-card-bg p-(--sds-card-padding) shadow-card">
        <RadioGroup
          rotulo="A proposta foi admitida?"
          name={`admitida-${p}`}
          className="[&>div]:flex-row [&>div]:gap-6"
          valor={valor.admitida === null ? undefined : valor.admitida ? 'sim' : 'nao'}
          somenteLeitura={somenteLeitura}
          opcoes={[
            { valor: 'sim', rotulo: 'Sim, admitida' },
            { valor: 'nao', rotulo: 'Não admitida' },
          ]}
          onChange={(e) => mudar({ ...valor, admitida: e.target.value === 'sim' }, 0)}
        />
        {valor.admitida === false && (
          <TextArea
            rotulo="Motivo da não admissão"
            ajuda={`Obrigatório para concluir (ao menos ${MOTIVACAO_MINIMA} caracteres).`}
            rows={2}
            minimo={MOTIVACAO_MINIMA}
            value={valor.motivo}
            somenteLeitura={somenteLeitura}
            onChange={(e) => mudar({ ...valor, motivo: e.target.value }, ATRASO_TEXTO)}
          />
        )}
      </section>

      <section aria-label="Páginas por Plano de Ação" className="rounded-card border border-card-border bg-card-bg shadow-card">
        <div className="px-(--sds-card-padding) pt-4">
          <h3 className="text-heading-4 text-text-primary">Páginas por Plano de Ação</h3>
          <p className="mt-1 text-body-sm text-text-secondary">
            {semEscolha
              ? 'Escolha acima se a proposta foi admitida para registrar as páginas.'
              : 'Página de corte = página inicial + limite − 1: o que vier depois não é considerado (Anexo III, 7.1).'}
          </p>
        </div>
        <div className="relative overflow-x-auto p-(--sds-card-padding)">
          <table aria-label="Páginas por Plano de Ação" className="w-full border-collapse text-left text-body-sm">
            <thead className="bg-table-header-bg text-table-header-fg">
              <tr>
                {['PA', 'Limite', 'Página inicial', 'Página final', 'Páginas', 'Página de corte', 'Situação'].map((t) => (
                  <th key={t} scope="col" className="h-(--sds-table-header-height) px-3 text-label-md">
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PLANOS.map((pa, i) => {
                const plano = valor.planos[i]!
                const apurado = apurados[i]!
                return (
                  <tr key={pa.codigo} data-excede={apurado.excede > 0 ? 'true' : undefined} className="border-b border-table-border align-top last:border-b-0">
                    <th scope="row" className="px-3 py-2 text-label-md text-text-primary">
                      {pa.codigo}
                    </th>
                    <td className="px-3 py-2 tabular-nums">{pa.limitePaginas}</td>
                    {(['paginaInicial', 'paginaFinal'] as const).map((campo) => {
                      const erro = problemas[`planos.${i}.${campo}`]
                      const rotulo = `${campo === 'paginaInicial' ? 'Página inicial' : 'Página final'} do ${pa.codigo}`
                      return (
                        <td key={campo} className="px-3 py-2">
                          <input
                            type="number"
                            min={1}
                            aria-label={rotulo}
                            aria-invalid={erro ? true : undefined}
                            aria-describedby={erro ? `${pa.codigo}-${campo}-mensagem` : undefined}
                            value={plano[campo] ?? ''}
                            disabled={somenteLeitura || semEscolha}
                            onChange={(e) => mudarPlano(i, campo, e.target.value)}
                            className="h-(--sds-input-height) w-24 rounded-input border border-input-border bg-input-bg px-2 text-body-md text-input-fg disabled:cursor-not-allowed disabled:bg-input-bg-disabled aria-invalid:border-input-border-error"
                          />
                          <span id={`${pa.codigo}-${campo}-mensagem`} aria-live="polite" className="block text-caption text-status-error-text">
                            {erro}
                          </span>
                        </td>
                      )
                    })}
                    <td className="px-3 py-2 tabular-nums">{apurado.paginas ?? '—'}</td>
                    <td className="px-3 py-2 tabular-nums">{apurado.paginaCorte ?? '—'}</td>
                    <td className="px-3 py-2">
                      {apurado.excede > 0 ? (
                        <span className="text-status-warning-text">Excede o limite de {pa.limitePaginas} em {apurado.excede} página(s)</span>
                      ) : apurado.paginas !== null ? (
                        <span className="text-status-success-text">Dentro do limite</span>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {excedidos.length > 0 && (
          <div className="px-(--sds-card-padding) pb-4">
            <Alert tom="warning" titulo="Limite de páginas" rotulo="Limite de páginas">
              {excedidos.map((a) => `${a.codigo} excede o limite de ${a.limite} em ${a.excede} página(s)`).join('; ')}: o que passar da página de
              corte não é considerado.
            </Alert>
          </div>
        )}
      </section>
    </div>
  )
}
