// Entrega ao navegador um arquivo gerado na própria página (PDF, XLSX). Nada é enviado a servidor.

export function baixarArquivo(conteudo: BlobPart, nome: string, tipo: string): void {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }))
  const link = document.createElement('a')
  link.href = url
  link.download = nome
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const TIPO_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

/** Nome de arquivo seguro: sem acentos, espaços ou barras. */
export function nomeDeArquivo(...partes: string[]): string {
  return partes
    .join('-')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}
