// Formatação pt-BR usada nas memórias de cálculo.

export function formatarNumero(valor: number): string {
  return valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

export function formatarReais(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** "12.000.000,00" ou "R$ 1.234,5" → centavos; vazio → null; formato inválido → NaN. */
export function reaisParaCentavos(texto: string): number | null {
  const limpo = texto.replace(/R\$|\s/g, '')
  if (limpo === '') return null
  if (!/^(\d{1,3}(\.\d{3})+|\d+)(,\d{1,2})?$/.test(limpo)) return Number.NaN
  const [inteiro, fracao = ''] = limpo.replace(/\./g, '').split(',')
  return Number(inteiro) * 100 + Number(fracao.padEnd(2, '0'))
}

/** Centavos → "12.000.000,00" (campo de edição); nulo → "". */
export function centavosParaReais(centavos: number | null | undefined): string {
  if (centavos == null) return ''
  return (centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
