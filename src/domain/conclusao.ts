// Condições para concluir a proposta (Simplificação 2/4: "Homologar" virou "Concluir", ação reversível):
// admissibilidade registrada e completa e, se a proposta segue para a avaliação (admitida), os níveis e as
// justificativas de todos os subcritérios da D1 (28 na matriz 2026). Não admitida ou desclassificada: basta a
// admissibilidade. Com o salvamento automático (Simplificação 3/4) a /api grava rascunhos — justificativa curta,
// motivo em branco, páginas faltando —, e é aqui que os mínimos são conferidos.

import { MOTIVACAO_MINIMA } from './admissibilidade.js'
import { JUSTIFICATIVA_MINIMA_PADRAO } from './avaliacao.js'
import { MATRIZ_2026, type Matriz } from './matriz/index.js'

export interface EntradaConclusao {
  admissibilidade?: {
    situacao?: string
    admitida?: boolean
    motivo?: string
    planos?: { codigo: string; paginaInicial?: number | null; paginaFinal?: number | null }[]
  } | null
  avaliacoes: { codigo: string; nivel?: unknown; justificativa?: unknown }[]
}

const FORA_DA_AVALIACAO = ['nao_admitida', 'desclassificada']

/** O que falta na admissibilidade gravada (registros anteriores à 2/4, sem `admitida`, não são conferidos). */
function problemasDaAdmissibilidade(admissibilidade: NonNullable<EntradaConclusao['admissibilidade']>): string[] {
  if (admissibilidade.admitida === false && (admissibilidade.motivo?.trim().length ?? 0) < MOTIVACAO_MINIMA) {
    return [`informe o motivo da não admissão (ao menos ${MOTIVACAO_MINIMA} caracteres)`]
  }
  if (admissibilidade.admitida === true && admissibilidade.planos) {
    const semPaginas = admissibilidade.planos.filter((p) => p.paginaInicial == null || p.paginaFinal == null).map((p) => p.codigo)
    if (semPaginas.length > 0) return [`informe as páginas de ${semPaginas.join(', ')} na admissibilidade`]
  }
  return []
}

/** O que falta para concluir (vazio = pode concluir), em frases curtas para a mensagem da /api e da tela. */
export function problemasParaConcluir(
  entrada: EntradaConclusao,
  opcoes: { justificativaMinima?: number } = {},
  matriz: Matriz = MATRIZ_2026,
): string[] {
  const problemas: string[] = []
  const situacao = entrada.admissibilidade?.situacao
  if (!entrada.admissibilidade) problemas.push('registre a admissibilidade')
  else problemas.push(...problemasDaAdmissibilidade(entrada.admissibilidade))
  if (situacao !== undefined && FORA_DA_AVALIACAO.includes(situacao)) return problemas

  const minimo = opcoes.justificativaMinima ?? JUSTIFICATIVA_MINIMA_PADRAO
  const codigos = matriz.dimensao1.planos.flatMap((p) => p.subcriterios.map((s) => s.codigo))
  const porCodigo = new Map(entrada.avaliacoes.map((a) => [a.codigo, a]))
  const comNivel = codigos.filter((c) => Number.isInteger(porCodigo.get(c)?.nivel))
  const semJustificativa = comNivel.filter((c) => {
    const justificativa = porCodigo.get(c)?.justificativa
    return typeof justificativa !== 'string' || justificativa.trim().length < minimo
  })

  const total = codigos.length
  if (comNivel.length < total) problemas.push(`faltam ${total - comNivel.length} de ${total} níveis da D1`)
  if (semJustificativa.length > 0) {
    problemas.push(`faltam ${semJustificativa.length} de ${total} justificativas da D1 (mínimo de ${minimo} caracteres)`)
  }
  return problemas
}
