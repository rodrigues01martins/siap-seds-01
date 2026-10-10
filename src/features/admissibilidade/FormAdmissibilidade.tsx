// Admissibilidade do Caderno (Anexo III, item 28) em seções (cards): 1. requisitos essenciais (28.1, do JSON),
// 2. páginas por PA com página de corte (limite do JSON) e alerta de atenção (ícone + texto) quando excede,
// 3. irregularidades meramente formais (28.5) e 4. resultado com motivação.
// Ausência de qualquer PA → desclassificação automática (28.2), mostrada antes de enviar.

import { CircleCheck, CircleX, TriangleAlert } from 'lucide-react'
import { useFormContext, useWatch, type FieldValues } from 'react-hook-form'
import { mensagemDoCampo } from '../../components/ui/form'
import { Alert } from '../../components/ui/Alert'
import { Card } from '../../components/ui/Card'
import { Checkbox } from '../../components/ui/Checkbox'
import { cx } from '../../components/ui/cx'
import { classeEntrada } from '../../components/ui/Field'
import { CampoTexto, FormularioApi } from '../../components/ui/FormularioApi'
import { Icone } from '../../components/ui/Icone'
import { RadioGroup } from '../../components/ui/RadioGroup'
import { Badge } from '../../components/ui/StatusBadge'
import { apurarPlano, type Admissibilidade, type PaginasPlano } from '../../domain/admissibilidade'
import { MATRIZ_2026 } from '../../domain/matriz'
import { esquemaCamposAdmissibilidadeComRegras, type CamposAdmissibilidade } from '../../esquemas/admissibilidade'
import { AvisoSomenteLeitura } from '../avaliacao/CabecalhoProposta'

const REGRAS = MATRIZ_2026.admissibilidade
const PLANOS = MATRIZ_2026.dimensao1.planos

interface LinhaPlano {
  codigo: string
  ausente: boolean
  paginaInicial: number | '' | undefined
  paginaFinal: number | '' | undefined
}

const numero = (valor: unknown) => (typeof valor === 'number' && Number.isFinite(valor) ? valor : null)

const comoPlano = (linha: LinhaPlano | undefined, codigo: string): PaginasPlano => ({
  codigo,
  ausente: Boolean(linha?.ausente),
  paginaInicial: linha?.ausente ? null : numero(linha?.paginaInicial),
  paginaFinal: linha?.ausente ? null : numero(linha?.paginaFinal),
})

function ErroDoGrupo({ id, mensagem }: { id?: string; mensagem?: string }) {
  if (!mensagem) return null
  return (
    <p id={id} className="mt-2 flex items-start gap-1 text-body-sm text-status-error-text">
      <Icone icone={TriangleAlert} tamanho={16} className="mt-0.5 shrink-0" />
      <span>
        <span className="sr-only">Erro:</span> {mensagem}
      </span>
    </p>
  )
}

function Requisitos() {
  const { register, formState, control } = useFormContext()
  const planos = (useWatch({ control, name: 'planos' }) ?? []) as LinhaPlano[]
  const marcados = (useWatch({ control, name: 'requisitosAtendidos' }) ?? []) as string[] | string | false
  const todosPresentes = planos.every((p) => !p?.ausente)
  const atendidos = (Array.isArray(marcados) ? marcados.length : marcados ? 1 : 0) + (todosPresentes ? 1 : 0)
  const erro = mensagemDoCampo(formState.errors, 'requisitosAtendidos')
  return (
    <Card
      titulo="1. Requisitos essenciais (Anexo III, 28.1)"
      descricao="Marque os requisitos atendidos. O 28.1.VII é apurado pela tabela de páginas."
      acoes={
        <Badge tom={atendidos === REGRAS.requisitosEssenciais.length ? 'success' : 'neutral'}>{`${atendidos} de ${REGRAS.requisitosEssenciais.length} atendidos`}</Badge>
      }
    >
      <fieldset className="min-w-0">
        <legend className="sr-only">Requisitos essenciais</legend>
        <ul className="grid gap-3 lg:grid-cols-2">
          {REGRAS.requisitosEssenciais.map((r) => {
            const rotulo = `${r.codigo} — ${r.descricao}`
            return (
              <li key={r.codigo}>
                {r.codigo === REGRAS.requisitoPlanos ? (
                  <Checkbox rotulo={rotulo} checked={todosPresentes} onChange={() => undefined} desabilitado ajuda="Apurado pela tabela de páginas (seção 2)." />
                ) : (
                  <Checkbox rotulo={rotulo} value={r.codigo} {...register('requisitosAtendidos')} />
                )}
              </li>
            )
          })}
        </ul>
        <ErroDoGrupo mensagem={erro} />
      </fieldset>
    </Card>
  )
}

function CelulaPagina({ indice, campo, codigo }: { indice: number; campo: 'paginaInicial' | 'paginaFinal'; codigo: string }) {
  const { register, formState, control } = useFormContext()
  const ausente = useWatch({ control, name: `planos.${indice}.ausente` }) as boolean | undefined
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
        disabled={ausente}
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
  const { register, control, formState } = useFormContext()
  const linhas = (useWatch({ control, name: 'planos' }) ?? []) as LinhaPlano[]
  const apurados = PLANOS.map((pa, i) => ({ pa, apurado: apurarPlano(comoPlano(linhas[i], pa.codigo), pa.limitePaginas) }))
  const ausentes = apurados.filter((a) => a.apurado.ausente).map((a) => a.pa.codigo)
  const excedem = apurados.filter((a) => a.apurado.excede > 0)
  const erroGrupo = mensagemDoCampo(formState.errors, 'planos')

  return (
    <Card
      titulo="2. Páginas por Plano de Ação"
      descricao={`Numeração do Caderno no SEI. Página de corte = página inicial + limite do PA − 1 (${MATRIZ_2026.dimensao1.fonteLimitePaginas}).`}
    >
      <div className="space-y-4">
        {ausentes.length > 0 && (
          <Alert tom="error" titulo="Desclassificação automática (Anexo III, 28.2)" rotulo="Desclassificação">
            Ausência do {ausentes.join(', ')}: desclassificação automática da proposta (Anexo III, 28.2).
          </Alert>
        )}
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
                {['PA', 'Ausente', 'Página inicial', 'Página final', 'Páginas', 'Limite', 'Página de corte', 'Situação'].map((t, i) => (
                  <th key={t} scope="col" className={cx('h-(--sds-table-header-height) border-b border-table-border px-3 text-label-md', i >= 4 && i <= 6 && 'text-right')}>
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
                      excede ? 'bg-status-warning-surface' : apurado.ausente ? 'bg-background-default text-text-secondary' : 'bg-table-row-bg',
                    )}
                  >
                    <th scope="row" className="px-3 py-2 text-left align-top text-label-md">
                      {pa.codigo}
                    </th>
                    <td className="px-3 py-2 align-top">
                      <input
                        type="checkbox"
                        {...register(`planos.${i}.ausente`)}
                        aria-label={`${pa.codigo} ausente`}
                        className="mt-2.5 size-5 cursor-pointer accent-action-primary disabled:cursor-not-allowed"
                      />
                    </td>
                    <CelulaPagina indice={i} campo="paginaInicial" codigo={pa.codigo} />
                    <CelulaPagina indice={i} campo="paginaFinal" codigo={pa.codigo} />
                    <td className="px-3 py-2 pt-4 text-right align-top tabular-nums">{apurado.paginas ?? '—'}</td>
                    <td className="px-3 py-2 pt-4 text-right align-top tabular-nums">{pa.limitePaginas}</td>
                    <td className="px-3 py-2 pt-4 text-right align-top tabular-nums">{apurado.paginaCorte ?? '—'}</td>
                    <td className="px-3 py-2 pt-3 align-top">
                      {apurado.ausente ? (
                        <span className="inline-flex items-center gap-1 text-label-md text-status-error-text">
                          <Icone icone={CircleX} tamanho={16} />
                          Ausente
                        </span>
                      ) : excede ? (
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

function Irregularidades() {
  const { register } = useFormContext()
  return (
    <Card titulo="3. Irregularidades meramente formais (Anexo III, 28.5)" descricao={REGRAS.irregularidadesFormais.observacao}>
      <fieldset className="min-w-0 space-y-4">
        <legend className="sr-only">Irregularidades meramente formais</legend>
        <ul className="grid gap-3 lg:grid-cols-2">
          {REGRAS.irregularidadesFormais.tipos.map((t) => (
            <li key={t.codigo}>
              <Checkbox rotulo={`${t.codigo} — ${t.descricao}`} value={t.codigo} {...register('irregularidadesFormais')} />
            </li>
          ))}
        </ul>
        <CampoTexto nome="observacaoIrregularidades" rotulo="Observação sobre as irregularidades" tipo="textarea" />
      </fieldset>
    </Card>
  )
}

function Resultado() {
  const { register, formState } = useFormContext()
  const resultado = useWatch({ name: 'resultado' }) as string | undefined
  return (
    <Card titulo="4. Resultado">
      <div className="space-y-4">
        <RadioGroup
          rotulo="Resultado da admissibilidade"
          opcoes={[
            { valor: 'admitida', rotulo: 'Admitida' },
            { valor: 'nao_admitida', rotulo: 'Não admitida' },
          ]}
          erro={mensagemDoCampo(formState.errors, 'resultado')}
          {...register('resultado')}
        />
        {resultado === 'nao_admitida' && <CampoTexto nome="motivacao" rotulo="Motivação" tipo="textarea" obrigatorio ajuda="Obrigatória quando a proposta não é admitida." />}
      </div>
    </Card>
  )
}

function valoresIniciais(valor?: Admissibilidade | null): FieldValues {
  return {
    requisitosAtendidos: valor ? Object.entries(valor.requisitos).filter(([c, ok]) => ok && c !== REGRAS.requisitoPlanos).map(([c]) => c) : [],
    irregularidadesFormais: valor?.irregularidadesFormais ?? [],
    observacaoIrregularidades: valor?.observacaoIrregularidades ?? '',
    planos: PLANOS.map((pa) => {
      const p = valor?.planos.find((x) => x.codigo === pa.codigo)
      return { codigo: pa.codigo, ausente: p?.ausente ?? false, paginaInicial: p?.paginaInicial ?? '', paginaFinal: p?.paginaFinal ?? '' }
    }),
    resultado: valor?.resultado ?? '',
    motivacao: valor?.motivacao ?? '',
  }
}

function transformar(v: FieldValues) {
  const atendidos = Array.isArray(v.requisitosAtendidos) ? v.requisitosAtendidos : v.requisitosAtendidos ? [v.requisitosAtendidos] : []
  const irregularidades = Array.isArray(v.irregularidadesFormais) ? v.irregularidadesFormais : v.irregularidadesFormais ? [v.irregularidadesFormais] : []
  return {
    requisitos: Object.fromEntries(
      REGRAS.requisitosEssenciais.filter((r) => r.codigo !== REGRAS.requisitoPlanos).map((r) => [r.codigo, atendidos.includes(r.codigo)]),
    ),
    irregularidadesFormais: irregularidades,
    observacaoIrregularidades: v.observacaoIrregularidades,
    planos: PLANOS.map((pa, i) => comoPlano((v.planos as LinhaPlano[] | undefined)?.[i], pa.codigo)),
    resultado: v.resultado || undefined,
    motivacao: v.resultado === 'nao_admitida' ? v.motivacao : undefined,
  }
}

interface Props {
  valor?: Admissibilidade | null
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
        campoDoFormulario={(campo) => (campo === 'requisitos' ? 'requisitosAtendidos' : campo)}
        onEnviar={onSalvar}
        rotuloEnviar="Registrar admissibilidade"
        somenteLeitura={somenteLeitura}
      >
        <Requisitos />
        <TabelaPaginas />
        <Irregularidades />
        <Resultado />
      </FormularioApi>
    </div>
  )
}
