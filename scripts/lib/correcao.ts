// Manutenção 1: campos de correção monetária que saíram do chamamento (índice e data-base). Código puro, usado
// por scripts/remover-campos-correcao.ts para planejar o que apagar (e o que registrar na auditoria).

export const CAMPOS_CORRECAO = ['indiceCorrecao', 'dataBaseCorrecao'] as const

export interface RemocaoPlanejada {
  id: string
  campos: string[]
  /** Valores antigos dos campos apagados (vão para o "antes" da auditoria). */
  antes: Record<string, unknown>
}

export function planejarRemocao(chamamentos: { id: string; dados: Record<string, unknown> }[]): RemocaoPlanejada[] {
  return chamamentos.flatMap(({ id, dados }) => {
    const campos = CAMPOS_CORRECAO.filter((campo) => campo in dados)
    return campos.length === 0 ? [] : [{ id, campos: [...campos], antes: Object.fromEntries(campos.map((c) => [c, dados[c]])) }]
  })
}
