// Admissibilidade do Caderno (Anexo III, item 28), simplificada em duas seções (cards): 1. admitida (sim/não),
// com motivo obrigatório quando não; 2. páginas inicial/final por PA com página de corte (limite do JSON) e
// alerta de atenção (ícone + texto) quando excede. Sem checklist 28.1 nem de formatação (28.5).

import { CircleCheck, TriangleAlert } from 'lucide-react'
import { useFormContext, useWatch, type FieldValues } from 'react-hook-form'
import { mensagemDoCampo } from '../../components/ui/form'
import { Alert } from '../../components/ui/Alert'
import { Card } from '../../components/ui/Card'
import { cx } from '../../components/ui/cx'
import { classeEntrada, MensagemErro } from '../../components/ui/Field'
import { CampoTexto, FormularioApi } from '../../components/ui/FormularioApi'
import { Icone } from '../../components/ui/Icone'
import { RadioGroup } from '../../components/ui/RadioGroup'
import { apurarPlano } from '../../domain/admissibilidade'
import { MATRIZ_2026 } from '../../domain/matriz'
import { esquemaCamposAdmissibilidadeComRegras, type CamposAdmissibilidade, type PlanoAdmissibilidade } from '../../esquemas/admissibilidade'
import type { AdmissibilidadeGravada } from '../../lib/tipos'
import { AvisoSomenteLeitura } from '../avaliacao/CabecalhoProposta'

const REGRAS = MATRIZ_2026.admissibilidade
const PLANOS = MATRIZ_2026.dimensao1.planos

interface LinhaPlano {
  codigo: string
  paginaInicial: number | '' | undefined
  paginaFinal: number | '' | undefined
}

const numero = (valor: unknown) => (typeof valor === 'number' && Number.isFinite(valor) ? valor : null)

const comoPlano = (linha: LinhaPlano | undefined, codigo: string): PlanoAdmissibilidade => ({
  codigo,
  paginaInicial: numero(linha?.paginaInicial),
  paginaFinal: numero(linha?.paginaFinal),
})

function ErroDoGrupo({ id, mensagem }: { id?: string; mensagem?: string }) {
  return <MensagemErro id={id} erro={mensagem} className="mt-2" />
}

function CelulaPagina({ indice, campo, codigo }: { indice: number; campo: 'paginaInicial' | 'paginaFinal'; codigo: string }) {
  const { register, formState } = useFormContext()
  const nome = `planos.${indice}.${campo}`
  const erro = mensagemDoCampo(formState.errors, nome)
  const rotulo = `${campo === 'paginaInicial' ? 'Página inicial' : 'Página final'} do ${codigo}`
  const idErro = `${nome}-erro`.replace(/\./g, '-')
  return (
    <td className="px-3 py-2 align-top">
      <input
        type="number"
        min={1}
        inputMode="numeric"
        {...register(nome, { setValueAs: (v: unknown) => (v === '' || v == null ? undefined : Number(v)) })}
        aria-label={rotulo}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? idErro : undefined}
        className={classeEntrada({ erro }, 'h-(--sds-input-height) w-24 tabular-nums')}
      />
      <ErroDoGrupo id={idErro} mensagem={erro} />
    </td>
  )
}

function TabelaPaginas() {
  const { control, formState } = useFormContext()
  const linhas = (useWatch({ control, name: 'planos' }) ?? []) as LinhaPlano[]
  const apurados = PLANOS.map((pa, i) => ({ pa, apurado: apurarPlano({ ...comoPlano(linhas[i], pa.codigo), ausente: false }, pa.limitePaginas) }))
  const excedem = apurados.filter((a) => a.apurado.excede > 0)
  const erroGrupo = mensagemDoCampo(formState.errors, 'planos')

  return (
    <Card
      titulo="2. Páginas por Plano de Ação"
      descricao={`Numeração do Caderno no SEI. Página de corte = página inicial + limite do PA − 1 (${MATRIZ_2026.dimensao1.fonteLimitePaginas}).`}
    >
      <div className="space-y-4">
        {excedem.length > 0 && (
          <Alert tom="warning" titulo="Plano de Ação acima do limite de páginas" rotulo="Limite de páginas">
            {excedem.map((e) => `${e.pa.codigo} excede o limite de ${e.pa.limitePaginas} em ${e.apurado.excede} página(s)`).join('; ')}. Confira a página de
            corte na tabela.
          </Alert>
        )}
        <div className="overflow-x-auto rounded-card border border-table-border">
          <table aria-label="Páginas por Plano de Ação" className="w-full border-collapse text-left text-body-sm">
            <thead className="bg-table-header-bg text-table-header-fg">
              <tr>
                {['PA', 'Página inicial', 'Página final', 'Páginas', 'Limite', 'Página de corte', 'Situação'].map((t, i) => (
                  <th key={t} scope="col" className={cx('h-(--sds-table-header-height) border-b border-table-border px-3 text-label-md', i >= 3 && i <= 5 && 'text-right')}>
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {apurados.map(({ pa, apurado }, i) => {
                const excede = apurado.excede > 0
                return (
                  <tr
                    key={pa.codigo}
                    aria-label={`${pa.codigo} — ${pa.titulo}`}
                    data-excede={excede ? 'true' : 'false'}
                    className={cx(
                      'border-b border-table-border text-text-primary last:border-b-0',
                      excede ? 'bg-status-warning-surface' : 'bg-table-row-bg',
                    )}
                  >
                    <th scope="row" className="px-3 py-2 text-left align-top text-label-md">
                      {pa.codigo}
                    </th>
                    <CelulaPagina indice={i} campo="paginaInicial" codigo={pa.codigo} />
                    <CelulaPagina indice={i} campo="paginaFinal" codigo={pa.codigo} />
                    <td className="px-3 py-2 pt-4 text-right align-top tabular-nums">{apurado.paginas ?? '—'}</td>
                    <td className="px-3 py-2 pt-4 text-right align-top tabular-nums">{pa.limitePaginas}</td>
                    <td className="px-3 py-2 pt-4 text-right align-top tabular-nums">{apurado.paginaCorte ?? '—'}</td>
                    <td className="px-3 py-2 pt-3 align-top">
                      {excede ? (
                        <span className="inline-flex items-start gap-1 text-label-md text-status-warning-text">
                          <Icone icone={TriangleAlert} tamanho={16} className="mt-0.5 shrink-0" />
                          <span>
                            Excede o limite de {pa.limitePaginas} em {apurado.excede} página(s)
                          </span>
                        </span>
                      ) : apurado.paginas !== null ? (
                        <span className="inline-flex items-center gap-1 text-label-md text-status-success-text">
                          <Icone icone={CircleCheck} tamanho={16} />
                          Dentro do limite
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <ErroDoGrupo mensagem={erroGrupo} />
        <p className="text-body-sm text-text-secondary">{REGRAS.tratamentoPlanoIlegivel}</p>
      </div>
    </Card>
  )
}

function Admissao() {
  const { register, formState } = useFormContext()
  const admitida = useWatch({ name: 'admitida' }) as string | undefined
  return (
    <Card titulo="1. Admissão" descricao="Se não for admitida, a proposta não segue para a avaliação (D1 e D2).">
      <div className="space-y-4">
        <RadioGroup
          rotulo="A proposta foi admitida?"
          opcoes={[
            { valor: 'sim', rotulo: 'Sim, admitida' },
            { valor: 'nao', rotulo: 'Não admitida' },
          ]}
          erro={mensagemDoCampo(formState.errors, 'admitida')}
          {...register('admitida')}
        />
        {admitida === 'nao' && <CampoTexto nome="motivo" rotulo="Motivo" tipo="textarea" obrigatorio ajuda="Obrigatório quando a proposta não é admitida." />}
      </div>
    </Card>
  )
}

function valoresIniciais(valor?: AdmissibilidadeGravada | null): FieldValues {
  const admitida = valor?.admitida ?? (valor?.situacao ? valor.situacao === 'admitida' : undefined)
  return {
    admitida: admitida === undefined ? '' : admitida ? 'sim' : 'nao',
    motivo: valor?.motivo ?? '',
    planos: PLANOS.map((pa) => {
      const p = valor?.planos?.find((x) => x.codigo === pa.codigo)
      return { codigo: pa.codigo, paginaInicial: p?.paginaInicial ?? '', paginaFinal: p?.paginaFinal ?? '' }
    }),
  }
}

function transformar(v: FieldValues) {
  const admitida = v.admitida === 'sim' ? true : v.admitida === 'nao' ? false : undefined
  return {
    admitida,
    ...(admitida === false ? { motivo: v.motivo } : {}),
    planos: PLANOS.map((pa, i) => comoPlano((v.planos as LinhaPlano[] | undefined)?.[i], pa.codigo)),
  }
}

interface Props {
  valor?: AdmissibilidadeGravada | null
  somenteLeitura: boolean
  motivoSomenteLeitura?: string
  onSalvar: (corpo: CamposAdmissibilidade) => Promise<void>
}

export function FormAdmissibilidade({ valor, somenteLeitura, motivoSomenteLeitura, onSalvar }: Props) {
  return (
    <div className="space-y-6">
      {somenteLeitura && <AvisoSomenteLeitura motivo={motivoSomenteLeitura} />}
      <FormularioApi
        rotulo="Admissibilidade"
        esquema={esquemaCamposAdmissibilidadeComRegras}
        valoresIniciais={valoresIniciais(valor)}
        transformar={transformar}
        onEnviar={onSalvar}
        rotuloEnviar="Registrar admissibilidade"
        somenteLeitura={somenteLeitura}
      >
        <Admissao />
        <TabelaPaginas />
      </FormularioApi>
    </div>
  )
}
