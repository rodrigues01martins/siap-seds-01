// Situação da sessão em selo (texto + cor, nunca só cor): aberta, encerrada, reiniciando (reset em andamento
// ou interrompido) e reiniciada (registros desconsiderados pelo reset do presidente).

import { Badge, type TomSelo } from '../../components/ui/StatusBadge'
import type { Sessao } from '../../lib/tipos'

const SELO: Record<Sessao['status'], { tom: TomSelo; rotulo: string }> = {
  aberta: { tom: 'success', rotulo: 'Aberta' },
  encerrada: { tom: 'neutral', rotulo: 'Encerrada' },
  reiniciando: { tom: 'warning', rotulo: 'Reiniciando' },
  reiniciada: { tom: 'info', rotulo: 'Reiniciada' },
}

export function SeloSessao({ status }: { status: Sessao['status'] }) {
  const { tom, rotulo } = SELO[status] ?? SELO.encerrada
  return <Badge tom={tom}>{rotulo}</Badge>
}
