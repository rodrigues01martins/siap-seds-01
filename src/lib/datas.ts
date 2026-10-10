// Datas no formato do Brasil.

/** "2026-10-31" → "31/10/2026". */
export function dataBr(iso: string | undefined): string {
  if (!iso) return '—'
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}
