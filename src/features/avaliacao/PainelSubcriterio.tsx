// Painel de um subcritério da D1 (formulário longo em seções): Identificação | Elementos (apoio, não gera
// nota) | Escala 0–4 (cartões com o descritor sempre visível) | Decisão (e voto divergente) | Justificativa e
// páginas. Valida no navegador com o mesmo esquema da /api + as regras de src/domain (página de corte,
// justificativa mínima) e avisa ANTES de enviar quando a página citada passa do corte do PA.
// Com `idFormulario`, o botão de salvar fica fora do painel (rodapé fixo da tela, atributo form).

import { TriangleAlert } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useFormContext, useWatch, type FieldValues } from 'react-hook-form'
import { mensagemDoCampo } from '../../components/ui/form'
import { Alert } from '../../components/ui/Alert'
import { Card } from '../../components/ui/Card'
import { MensagemErro } from '../../components/ui/Field'
import { cx } from '../../components/ui/cx'
import { CampoTexto, FormularioApi } from '../../components/ui/FormularioApi'
import { Icone } from '../../components/ui/Icone'
import { RadioGroup } from '../../components/ui/RadioGroup'
import { Badge } from '../../components/ui/StatusBadge'
import { TextArea } from '../../components/ui/TextArea'
import { JUSTIFICATIVA_MINIMA_PADRAO, ehEliminatorio, lerPaginas, paginasAcimaDoCorte, planoDoSubcriterio } from '../../domain/avaliacao'
import { MATRIZ_2026 } from '../../domain/matriz'
import { esquemaCamposComRegras, type CamposRegistro } from '../../esquemas/avaliacao'
import { AvisoSomenteLeitura } from './CabecalhoProposta'

export interface RegistroGravado {
  nivel: number
  justificativa: string
  paginas: number[]
  decisao: 'unanimidade' | 'maioria'
  votoDivergente?: string
}

interface Props {
  codigo: string
  registro?: RegistroGravado | null
  justificativaMinima?: number
  somenteLeitura: boolean
  motivoSomenteLeitura?: string
  onSalvar: (dados: CamposRegistro) => Promise<void>
  /** Id do <form>: o botão de salvar fica fora do painel (ex.: rodapé fixo) com form={idFormulario}. */
  idFormulario?: string
}

const ESCALA = MATRIZ_2026.dimensao1.escala
const SITUACOES = ['Presente', 'Parcial', 'Ausente'] as const

function Secao({ titulo, descricao, children }: { titulo: string; descricao?: ReactNode; children: ReactNode }) {
  return (
    <Card titulo={titulo} descricao={descricao} nivel={3}>
      {children}
    </Card>
  )
}

/** Elementos de avaliação com marcação local (só apoio à discussão; nada é gravado). */
function ChecklistElementos({ codigo, elementos }: { codigo: string; elementos: string[] }) {
  const [marcas, setMarcas] = useState<Record<number, string>>({})
  return (
    <Secao titulo="Elementos de avaliação" descricao="Apoio à discussão — não gera nota.">
      <ol className="divide-y divide-border-default">
        {elementos.map((elemento, i) => (
          <li key={elemento} className="py-3 first:pt-0 last:pb-0">
            <fieldset className="min-w-0">
              <legend className="sr-only">Elemento {i + 1}</legend>
              <p className="text-body-md text-text-primary">
                <span className="mr-2 text-label-md text-text-secondary">{i + 1}.</span>
                {elemento}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {SITUACOES.map((situacao) => (
                  <label
                    key={situacao}
                    className={cx(
                      'inline-flex h-(--sds-button-height-sm) cursor-pointer items-center gap-2 rounded-button border px-3 text-body-sm',
                      marcas[i] === situacao ? 'border-action-primary bg-action-subtle text-text-link' : 'border-border-input text-text-secondary hover:border-input-border-hover',
                    )}
                  >
                    <input
                      type="radio"
                      name={`elemento-${codigo}-${i}`}
                      checked={marcas[i] === situacao}
                      onChange={() => setMarcas((atual) => ({ ...atual, [i]: situacao }))}
                      className="size-4 accent-action-primary"
                    />
                    {situacao}
                  </label>
                ))}
              </div>
            </fieldset>
          </li>
        ))}
      </ol>
    </Secao>
  )
}

/** Escala 0–4 como grupo de opções em cartões; o descritor fica sempre visível e descreve a opção. */
function Escala() {
  const { register, formState } = useFormContext()
  const erro = mensagemDoCampo(formState.errors, 'nivel')
  return (
    <Secao titulo="Escala 0–4" descricao="Escolha o nível que melhor descreve o que o Caderno apresenta.">
      <fieldset role="radiogroup" aria-invalid={erro ? true : undefined} aria-describedby={erro ? 'erro-nivel' : undefined} className="min-w-0">
        <legend className="sr-only">Nível</legend>
        <div className="grid gap-3">
          {ESCALA.map(({ nivel, descritor }) => (
            <label
              key={nivel}
              className={cx(
                'flex cursor-pointer items-start gap-3 rounded-card border border-border-input bg-card-bg p-4 transition-colors duration-fast ease-standard',
                'hover:border-input-border-hover has-[:checked]:border-action-primary has-[:checked]:bg-action-subtle has-[:disabled]:cursor-not-allowed',
              )}
            >
              <input
                type="radio"
                value={String(nivel)}
                {...register('nivel')}
                aria-label={`Nível ${nivel}`}
                aria-describedby={`descritor-nivel-${nivel}`}
                className="mt-1 size-5 shrink-0 accent-action-primary"
              />
              <span className="min-w-0">
                <span className="block text-heading-4 text-text-primary">Nível {nivel}</span>
                <span id={`descritor-nivel-${nivel}`} className="mt-1 block text-body-md text-text-secondary">
                  {descritor}
                </span>
              </span>
            </label>
          ))}
        </div>
        <MensagemErro id="erro-nivel" erro={erro} className="mt-2" />
      </fieldset>
    </Secao>
  )
}

function AlertaEliminatorio({ codigo }: { codigo: string }) {
  const nivel = useWatch({ name: 'nivel' }) as string | undefined
  if (nivel !== '0' || !ehEliminatorio(codigo)) return null
  return (
    <Alert tom="error" titulo="Subcritério eliminatório" rotulo="Subcritério eliminatório">
      Nível 0 no subcritério {codigo} implica desclassificação da proposta, independentemente da pontuação global (Anexo IV, 3.10).
    </Alert>
  )
}

function Decisao() {
  const { register, formState } = useFormContext()
  const decisao = useWatch({ name: 'decisao' }) as string | undefined
  return (
    <Secao titulo="Decisão">
      <div className="space-y-4">
        <RadioGroup
          rotulo="Decisão da Comissão"
          opcoes={[
            { valor: 'unanimidade', rotulo: 'Unanimidade' },
            { valor: 'maioria', rotulo: 'Maioria' },
          ]}
          erro={mensagemDoCampo(formState.errors, 'decisao')}
          {...register('decisao')}
        />
        {decisao === 'maioria' && <CampoTexto nome="votoDivergente" rotulo="Voto divergente" tipo="textarea" />}
      </div>
    </Secao>
  )
}

function Justificativa({ minimo }: { minimo: number }) {
  const { register, formState } = useFormContext()
  const texto = (useWatch({ name: 'justificativa' }) as string | undefined) ?? ''
  return (
    <TextArea
      rotulo="Justificativa"
      obrigatorio
      minimo={minimo}
      value={texto}
      erro={mensagemDoCampo(formState.errors, 'justificativa')}
      {...register('justificativa')}
    />
  )
}

function AvisoCorte({ codigo }: { codigo: string }) {
  const texto = (useWatch({ name: 'paginas' }) as string | undefined) ?? ''
  const corte = paginasAcimaDoCorte(codigo, lerPaginas(texto).paginas)
  if (!corte || corte.acima.length === 0) return null
  const lista = corte.acima.join(', ')
  return (
    <p
      role="status"
      aria-label="Aviso de página de corte"
      className="flex items-start gap-2 rounded-input border-l-4 border-status-warning bg-status-warning-surface p-3 text-body-sm text-status-warning-text"
    >
      <Icone icone={TriangleAlert} tamanho={20} className="shrink-0" />
      <span>
        {corte.acima.length === 1 ? 'Página' : 'Páginas'} {lista} acima do limite de {corte.limite} páginas do {corte.plano} (página de corte). Corrija antes
        de salvar: a /api recusa.
      </span>
    </p>
  )
}

export function PainelSubcriterio({ codigo, registro, justificativaMinima, somenteLeitura, motivoSomenteLeitura, onSalvar, idFormulario }: Props) {
  const plano = planoDoSubcriterio(codigo)
  const subcriterio = plano?.subcriterios.find((s) => s.codigo === codigo)
  if (!plano || !subcriterio) return <Alert tom="error" titulo="Subcritério inexistente">Subcritério {codigo} não existe na matriz.</Alert>
  const minimo = justificativaMinima ?? JUSTIFICATIVA_MINIMA_PADRAO

  const transformar = (v: FieldValues) => {
    const { paginas, invalidos } = lerPaginas((v.paginas as string | undefined) ?? '')
    const voto = (v.votoDivergente as string | undefined)?.trim()
    return {
      codigo,
      nivel: v.nivel === '' || v.nivel == null ? undefined : Number(v.nivel),
      justificativa: v.justificativa ?? '',
      // Texto que não é página vira 0: o domínio recusa com a mensagem certa.
      paginas: [...paginas, ...invalidos.map(() => 0)],
      decisao: v.decisao || undefined,
      ...(v.decisao === 'maioria' && voto ? { votoDivergente: voto } : {}),
    }
  }

  return (
    <article aria-labelledby={`subcriterio-${codigo}`} className="space-y-6">
      <section aria-label="Identificação" className="rounded-card border border-card-border bg-card-bg p-(--sds-card-padding) shadow-card">
        <p className="text-label-md text-text-secondary">
          {plano.codigo} — {plano.titulo}
        </p>
        <h2 id={`subcriterio-${codigo}`} className="mt-1 text-heading-3 text-text-primary">
          {subcriterio.codigo} — {subcriterio.titulo}
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge tom="neutral">{`Limite do ${plano.codigo}: ${plano.limitePaginas} páginas`}</Badge>
          {ehEliminatorio(codigo) && <Badge tom="error">Eliminatório: nível 0 desclassifica</Badge>}
          {registro ? <Badge tom="success">{`Registrado: nível ${registro.nivel}`}</Badge> : <Badge tom="warning">Pendente</Badge>}
        </div>
      </section>

      <ChecklistElementos codigo={codigo} elementos={subcriterio.elementos} />

      {somenteLeitura && <AvisoSomenteLeitura motivo={motivoSomenteLeitura} />}

      <FormularioApi
        key={codigo}
        id={idFormulario}
        rotulo={`Avaliação do subcritério ${codigo}`}
        esquema={esquemaCamposComRegras(justificativaMinima)}
        valoresIniciais={{
          nivel: registro ? String(registro.nivel) : '',
          decisao: registro?.decisao ?? '',
          votoDivergente: registro?.votoDivergente ?? '',
          justificativa: registro?.justificativa ?? '',
          paginas: registro?.paginas.join(', ') ?? '',
        }}
        transformar={transformar}
        onEnviar={onSalvar}
        rotuloEnviar="Salvar avaliação"
        somenteLeitura={somenteLeitura}
        rodape={idFormulario ? <></> : undefined}
      >
        <Escala />
        <AlertaEliminatorio codigo={codigo} />
        <Decisao />
        <Secao titulo="Justificativa e páginas">
          <div className="space-y-4">
            <Justificativa minimo={minimo} />
            <CampoTexto nome="paginas" rotulo="Páginas citadas" ajuda={`Numeração do ${plano.codigo}, separadas por vírgula (1 a ${plano.limitePaginas}).`} />
            <AvisoCorte codigo={codigo} />
          </div>
        </Secao>
      </FormularioApi>
    </article>
  )
}
