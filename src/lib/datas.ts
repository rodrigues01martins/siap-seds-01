// Datas no formato do Brasil.

/** "2026-10-31" → "31/10/2026". */
export function dataBr(iso: string | undefined): string {
  if (!iso) return '—'
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

/** Data e hora de Goiás (Brasília): "10/11/2026 14:32". */
export function dataHoraBr(data: Date): string {
  const fuso = 'America/Sao_Paulo'
  const dia = data.toLocaleDateString('pt-BR', { timeZone: fuso })
  const hora = data.toLocaleTimeString('pt-BR', { timeZone: fuso, hour: '2-digit', minute: '2-digit' })
  return `${dia} ${hora}`
}
