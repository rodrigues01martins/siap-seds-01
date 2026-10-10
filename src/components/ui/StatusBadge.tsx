// Selo de status da proposta: ponto + texto (nunca só cor), raio total.
//
// Mapeamento de cor (decisão do sistema, tons do DS §7):
// | Status          | Tom     | Por quê                                             |
// | apta            | success | passou nas eliminatórias e está completa            |
// | homologada      | info    | ato oficial concluído (azul institucional, estável) |
// | inapta          | warning | D1 abaixo do corte de 67,2 (resultado, não falha)   |
// | empatada        | warning | exige atenção: critérios do Edital ou da Comissão   |
// | desclassificada | error   | eliminada (nível 0 em 1.1/1.2 ou PA ausente)        |
// | não admitida    | error   | não passou na admissibilidade (Anexo III, item 28)  |
// | pendente        | neutral | avaliação em andamento                              |

import { cx } from './cx'

export type StatusSelo = 'apta' | 'homologada' | 'inapta' | 'empatada' | 'desclassificada' | 'nao_admitida' | 'pendente'
export type TomSelo = 'success' | 'info' | 'warning' | 'error' | 'neutral'

export const MAPA_STATUS: Record<StatusSelo, { tom: TomSelo; rotulo: string }> = {
  apta: { tom: 'success', rotulo: 'Apta' },
  homologada: { tom: 'info', rotulo: 'Homologada' },
  inapta: { tom: 'warning', rotulo: 'Inapta' },
  empatada: { tom: 'warning', rotulo: 'Empatada' },
  desclassificada: { tom: 'error', rotulo: 'Desclassificada' },
  nao_admitida: { tom: 'error', rotulo: 'Não admitida' },
  pendente: { tom: 'neutral', rotulo: 'Pendente' },
}

const CLASSES: Record<TomSelo, { selo: string; ponto: string }> = {
  success: { selo: 'bg-badge-success-bg text-badge-success-fg', ponto: 'bg-badge-success-dot' },
  info: { selo: 'bg-badge-info-bg text-badge-info-fg', ponto: 'bg-badge-info-dot' },
  warning: { selo: 'bg-badge-warning-bg text-badge-warning-fg', ponto: 'bg-badge-warning-dot' },
  error: { selo: 'bg-badge-error-bg text-badge-error-fg', ponto: 'bg-badge-error-dot' },
  neutral: { selo: 'bg-badge-neutral-bg text-badge-neutral-fg', ponto: 'bg-badge-neutral-dot' },
}

/** Selo genérico (tom + texto). */
export function Badge({ tom, children, className }: { tom: TomSelo; children: string; className?: string }) {
  return (
    <span data-status={tom} className={cx('inline-flex items-center gap-1.5 rounded-badge px-2 py-0.5 text-label-md whitespace-nowrap', CLASSES[tom].selo, className)}>
      <span data-ponto aria-hidden="true" className={cx('size-2 shrink-0 rounded-badge', CLASSES[tom].ponto)} />
      {children}
    </span>
  )
}

/** Selo de status da proposta, com o rótulo e a cor do mapeamento acima. */
export function StatusBadge({ status, className }: { status: StatusSelo; className?: string }) {
  const { tom, rotulo } = MAPA_STATUS[status]
  return (
    <Badge tom={tom} className={className}>
      {rotulo}
    </Badge>
  )
}
