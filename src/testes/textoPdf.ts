// Apoio dos testes de relatórios: extrai o texto de uma definição do pdfmake (conteúdo e rodapé).

import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces'

export function textoDe(conteudo: Content | Content[] | undefined | null): string {
  if (conteudo === undefined || conteudo === null) return ''
  if (typeof conteudo === 'string' || typeof conteudo === 'number') return String(conteudo)
  if (Array.isArray(conteudo)) return conteudo.map((c) => textoDe(c as Content)).join('\n')
  const no = conteudo as unknown as Record<string, unknown>
  const partes: string[] = []
  for (const chave of ['text', 'stack', 'columns', 'ul', 'ol']) {
    if (no[chave] !== undefined) partes.push(textoDe(no[chave] as Content))
  }
  const tabela = no.table as { body?: unknown[][] } | undefined
  if (tabela?.body) partes.push(tabela.body.map((linha) => linha.map((c) => textoDe(c as Content)).join(' | ')).join('\n'))
  return partes.join('\n')
}

/** Texto do corpo do documento. */
export function textoDoPdf(definicao: TDocumentDefinitions): string {
  return textoDe(definicao.content)
}

/** Texto do rodapé da página `pagina` de `total`. */
export function textoDoRodape(definicao: TDocumentDefinitions, pagina = 1, total = 1): string {
  const rodape = definicao.footer
  if (typeof rodape === 'function') {
    return textoDe(rodape(pagina, total, { width: 595, height: 842, orientation: 'portrait' }) as Content)
  }
  return textoDe(rodape as Content)
}

/** Texto da marca d'água (ou null). */
export function marcaDagua(definicao: TDocumentDefinitions): string | null {
  const marca = definicao.watermark
  if (!marca) return null
  return typeof marca === 'string' ? marca : marca.text
}
