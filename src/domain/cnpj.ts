// Validação de CNPJ numérico e alfanumérico (IN RFB 2.229/2024, em vigor desde julho de 2026).
// Cada caractere vale (código ASCII − 48): dígitos 0–9 valem 0–9 e letras A–Z valem 17–42.

const PESOS_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
const PESOS_2 = [6, ...PESOS_1]

/** Remove pontuação e espaços e põe letras em maiúsculas. */
export function normalizarCnpj(valor: string): string {
  return valor.replace(/[\s./-]/g, '').toUpperCase()
}

function digitoVerificador(valores: number[], pesos: number[]): number {
  const resto = valores.reduce((soma, valor, i) => soma + valor * pesos[i]!, 0) % 11
  return resto < 2 ? 0 : 11 - resto
}

export function cnpjValido(valor: string): boolean {
  const cnpj = normalizarCnpj(valor)
  if (!/^[A-Z0-9]{12}\d{2}$/.test(cnpj)) return false
  if (/^(.)\1{13}$/.test(cnpj)) return false
  const valores = [...cnpj].map((caractere) => caractere.charCodeAt(0) - 48)
  const d1 = digitoVerificador(valores.slice(0, 12), PESOS_1)
  const d2 = digitoVerificador([...valores.slice(0, 12), d1], PESOS_2)
  return valores[12] === d1 && valores[13] === d2
}
