// Rótulos do foco da sessão (o que o telão mostra).

import type { TipoFoco } from '../../esquemas/sessao'
import type { Sessao } from '../../lib/tipos'

export const ROTULO_TIPO_FOCO: Record<TipoFoco, string> = {
  admissibilidade: 'Admissibilidade',
  subcriterio: 'Subcritério da D1',
  d2: 'Dimensão 2',
  resumo: 'Resumo da proposta',
}

/** Foco gravado antes da Etapa 5 não tem `tipo`: era sempre um subcritério. */
export function tipoDoFoco(foco: NonNullable<Sessao['foco']>): TipoFoco {
  return foco.tipo ?? 'subcriterio'
}

export function descreverFoco(foco: NonNullable<Sessao['foco']>): string {
  const tipo = tipoDoFoco(foco)
  return tipo === 'subcriterio' ? `subcritério ${foco.subcriterio}` : ROTULO_TIPO_FOCO[tipo]
}
