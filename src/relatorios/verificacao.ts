// Código de verificação dos documentos: SHA-256 da serialização canônica dos dados usados para gerá-los.
// Canônica = chaves de objeto em ordem alfabética, datas e Timestamps em ISO, campos undefined omitidos.
// Mesmos dados → mesmo código, em qualquer navegador; quem duvidar refaz o cálculo com os mesmos dados.

/** Valor em JSON puro, com chaves ordenadas e datas em ISO (base da serialização canônica). */
export function normalizar(valor: unknown): unknown {
  if (valor === undefined || valor === null) return null
  if (valor instanceof Date) return valor.toISOString()
  if (Array.isArray(valor)) return valor.map(normalizar)
  if (typeof valor === 'object') {
    const comData = valor as { toDate?: unknown }
    if (typeof comData.toDate === 'function') return (comData.toDate as () => Date)().toISOString()
    const objeto = valor as Record<string, unknown>
    return Object.fromEntries(
      Object.keys(objeto)
        .filter((chave) => objeto[chave] !== undefined)
        .sort()
        .map((chave) => [chave, normalizar(objeto[chave])]),
    )
  }
  return valor
}

/** JSON com chaves ordenadas (a mesma entrada sempre gera o mesmo texto). */
export function serializarCanonico(valor: unknown): string {
  return JSON.stringify(normalizar(valor))
}

/** SHA-256 (hexadecimal, 64 dígitos) da serialização canônica. Usa a Web Crypto do navegador/Node. */
export async function codigoVerificacao(dados: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(serializarCanonico(dados))
  const resumo = await globalThis.crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(resumo), (b) => b.toString(16).padStart(2, '0')).join('')
}
