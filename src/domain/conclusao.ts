// Condições para concluir a proposta (Simplificação 2/4: "Homologar" virou "Concluir", ação reversível):
// admissibilidade registrada e, se a proposta segue para a avaliação (admitida), os níveis e as justificativas
// de todos os subcritérios da D1 (28 na matriz 2026). Não admitida ou desclassificada: basta a admissibilidade.

import { MATRIZ_2026, type Matriz } from './matriz/index.js'

export interface EntradaConclusao {
  admissibilidade?: { situacao?: string } | null
  avaliacoes: { codigo: string; nivel?: unknown; justificativa?: unknown }[]
}

const FORA_DA_AVALIACAO = ['nao_admitida', 'desclassificada']

/** O que falta para concluir (vazio = pode concluir), em frases curtas para a mensagem da /api e da tela. */
export function problemasParaConcluir(entrada: EntradaConclusao, matriz: Matriz = MATRIZ_2026): string[] {
  const problemas: string[] = []
  const situacao = entrada.admissibilidade?.situacao
  if (!entrada.admissibilidade) problemas.push('registre a admissibilidade')
  if (situacao !== undefined && FORA_DA_AVALIACAO.includes(situacao)) return problemas

  const codigos = matriz.dimensao1.planos.flatMap((p) => p.subcriterios.map((s) => s.codigo))
  const porCodigo = new Map(entrada.avaliacoes.map((a) => [a.codigo, a]))
  const comNivel = codigos.filter((c) => Number.isInteger(porCodigo.get(c)?.nivel))
  const semJustificativa = comNivel.filter((c) => {
    const justificativa = porCodigo.get(c)?.justificativa
    return typeof justificativa !== 'string' || justificativa.trim() === ''
  })

  const total = codigos.length
  if (comNivel.length < total) problemas.push(`faltam ${total - comNivel.length} de ${total} níveis da D1`)
  if (semJustificativa.length > 0) problemas.push(`faltam ${semJustificativa.length} de ${total} justificativas da D1`)
  return problemas
}
