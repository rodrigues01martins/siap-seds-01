// Pauta da sessão e progresso das propostas (tela da sessão e "Proposta anterior / próxima" da avaliação).

import { MATRIZ_2026 } from '../../domain/matriz'
import { pendenciasDoRegistro } from '../../esquemas/avaliacao'

const CODIGOS = MATRIZ_2026.dimensao1.planos.flatMap((p) => p.subcriterios.map((s) => s.codigo))

/** Propostas dos lotes em pauta, por lote e pelo nome da OSC (ids). */
export function ordenarPauta(
  propostas: { id: string; loteCodigo: string; oscCnpj: string }[],
  lotes: string[],
  nomeOsc: Map<string, string>,
): string[] {
  const nome = (cnpj: string) => nomeOsc.get(cnpj) ?? cnpj
  return propostas
    .filter((p) => lotes.includes(p.loteCodigo))
    .sort((a, b) => a.loteCodigo.localeCompare(b.loteCodigo) || nome(a.oscCnpj).localeCompare(nome(b.oscCnpj)))
    .map((p) => p.id)
}

export function vizinhas(pauta: string[], id: string): { anterior: string | null; proxima: string | null } {
  const i = pauta.indexOf(id)
  if (i < 0) return { anterior: null, proxima: null }
  return { anterior: pauta[i - 1] ?? null, proxima: pauta[i + 1] ?? null }
}

/** Subcritérios completos (nível e justificativa com o mínimo) de todos os da matriz. */
export function progressoD1(
  avaliacoes: { id: string; nivel?: number | null; justificativa?: string }[],
  justificativaMinima?: number,
): { completos: number; total: number } {
  const porCodigo = new Map(avaliacoes.map((a) => [a.id, a]))
  const completos = CODIGOS.filter((c) => pendenciasDoRegistro(porCodigo.get(c), justificativaMinima).length === 0).length
  return { completos, total: CODIGOS.length }
}

export function textoProgresso(d1: { completos: number; total: number }, experiencias: number): string {
  return `D1 ${d1.completos}/${d1.total} · D2 ${experiencias > 0 ? 'ok' : '—'}`
}
