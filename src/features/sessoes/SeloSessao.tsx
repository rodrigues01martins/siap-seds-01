// Situação da sessão em selo (texto + cor, nunca só cor): aberta ou encerrada. Sessões que passaram pelo reset
// (antes da Simplificação 2/4) aparecem como encerradas.

import { Badge, type TomSelo } from '../../components/ui/StatusBadge'
import type { Sessao } from '../../lib/tipos'

const SELO: Record<Sessao['status'], { tom: TomSelo; rotulo: string }> = {
  aberta: { tom: 'success', rotulo: 'Aberta' },
  encerrada: { tom: 'neutral', rotulo: 'Encerrada' },
}

export function SeloSessao({ status }: { status: Sessao['status'] }) {
  const { tom, rotulo } = SELO[status] ?? SELO.encerrada
  return <Badge tom={tom}>{rotulo}</Badge>
}
