// Estrutura comum dos campos (§13): rótulo ligado ao campo, texto de ajuda, mensagem de erro ou de
// sucesso com ícone e texto (nunca só cor) e as classes de estado da entrada (default, hover, focus,
// filled, disabled, readonly, error, success), todas de tokens semânticos.

import { CircleCheck, TriangleAlert } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { cx } from './cx'
import { Icone } from './Icone'

export interface PropsCampoBase {
  rotulo: string
  ajuda?: string
  erro?: string
  sucesso?: string
  obrigatorio?: boolean
  desabilitado?: boolean
  somenteLeitura?: boolean
}

export interface AtributosEntrada {
  id: string
  'aria-describedby'?: string
  'aria-invalid'?: true
  required?: boolean
  disabled?: boolean
  readOnly?: boolean
}

/** Ids do campo e da ajuda/mensagem, para ligar tudo por aria-describedby. */
export function useIdsCampo(id?: string) {
  const gerado = useId()
  const base = id ?? `campo${gerado.replace(/:/g, '')}`
  return { id: base, ajuda: `${base}-ajuda`, mensagem: `${base}-mensagem`, extra: `${base}-extra` }
}

export function atributosEntrada(
  ids: ReturnType<typeof useIdsCampo>,
  { ajuda, erro, sucesso, obrigatorio, desabilitado, somenteLeitura }: Omit<PropsCampoBase, 'rotulo'>,
  comExtra = false,
): AtributosEntrada {
  const descricoes = [ajuda && ids.ajuda, (erro || sucesso) && ids.mensagem, comExtra && ids.extra].filter(Boolean)
  return {
    id: ids.id,
    'aria-describedby': descricoes.length ? descricoes.join(' ') : undefined,
    'aria-invalid': erro ? true : undefined,
    required: obrigatorio || undefined,
    disabled: desabilitado || undefined,
    readOnly: somenteLeitura || undefined,
  }
}

/** Classes da entrada (input, select, textarea) conforme o estado. */
export function classeEntrada({ erro, sucesso }: { erro?: string; sucesso?: string }, extra?: string): string {
  return cx(
    'w-full rounded-input border bg-input-bg px-(--sds-input-padding-x) text-body-md text-input-fg',
    'placeholder:text-input-placeholder transition-colors duration-fast ease-standard',
    erro ? 'border-input-border-error' : sucesso ? 'border-input-border-success' : 'border-input-border hover:border-input-border-hover',
    'focus-visible:border-input-border-focus',
    'disabled:cursor-not-allowed disabled:bg-input-bg-disabled disabled:text-input-fg-disabled',
    'read-only:bg-input-bg-readonly',
    extra,
  )
}

export function Rotulo({ htmlFor, children, obrigatorio }: { htmlFor: string; children: ReactNode; obrigatorio?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-label-md text-text-primary">
      {children}
      {obrigatorio && (
        <span className="text-status-error-text" aria-hidden="true">
          {' '}
          *
        </span>
      )}
    </label>
  )
}

/** Ajuda e mensagem (erro tem prioridade sobre sucesso). O prefixo "Erro:"/"Sucesso:" é lido pelo leitor de tela. */
export function MensagensCampo({ ids, ajuda, erro, sucesso }: { ids: ReturnType<typeof useIdsCampo> } & Pick<PropsCampoBase, 'ajuda' | 'erro' | 'sucesso'>) {
  return (
    <>
      {ajuda && (
        <p id={ids.ajuda} className="mt-1 text-body-sm text-text-secondary">
          {ajuda}
        </p>
      )}
      {erro ? (
        <p id={ids.mensagem} className="mt-1 flex items-start gap-1 text-body-sm text-status-error-text">
          <Icone icone={TriangleAlert} tamanho={16} className="mt-0.5 shrink-0" />
          <span>
            <span className="sr-only">Erro:</span> {erro}
          </span>
        </p>
      ) : (
        sucesso && (
          <p id={ids.mensagem} className="mt-1 flex items-start gap-1 text-body-sm text-status-success-text">
            <Icone icone={CircleCheck} tamanho={16} className="mt-0.5 shrink-0" />
            <span>
              <span className="sr-only">Sucesso:</span> {sucesso}
            </span>
          </p>
        )
      )}
    </>
  )
}

/** Moldura do campo: rótulo, a entrada (render prop com os atributos de acessibilidade) e as mensagens. */
export function Field({
  id,
  rotulo,
  children,
  extra,
  className,
  ...props
}: PropsCampoBase & {
  id?: string
  className?: string
  /** Conteúdo após a entrada e antes das mensagens (ex.: contador do TextArea), ligado por aria-describedby. */
  extra?: ReactNode
  children: (atributos: AtributosEntrada) => ReactNode
}) {
  const ids = useIdsCampo(id)
  return (
    <div className={className}>
      <Rotulo htmlFor={ids.id} obrigatorio={props.obrigatorio}>
        {rotulo}
      </Rotulo>
      {children(atributosEntrada(ids, props, Boolean(extra)))}
      {extra && (
        <div id={ids.extra} className="mt-1 text-caption text-text-muted">
          {extra}
        </div>
      )}
      <MensagensCampo ids={ids} ajuda={props.ajuda} erro={props.erro} sucesso={props.sucesso} />
    </div>
  )
}
