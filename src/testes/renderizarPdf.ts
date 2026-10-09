/// <reference types="node" />
// Apoio dos testes de relatórios: renderiza a definição com o pdfmake de Node (mesmas fontes Roboto
// do navegador) para garantir que o documento é válido, e não só o objeto de definição.

import { createRequire } from 'node:module'
import type { TDocumentDefinitions } from 'pdfmake/interfaces'

const requerer = createRequire(import.meta.url)

export async function renderizarPdf(definicao: TDocumentDefinitions): Promise<Buffer> {
  const pdfmake = requerer('pdfmake')
  pdfmake.setUrlAccessPolicy(() => false)
  pdfmake.setLocalAccessPolicy((caminho: string) => caminho.includes('pdfmake'))
  pdfmake.setFonts(requerer('pdfmake/fonts/Roboto'))
  return pdfmake.createPdf(definicao).getBuffer()
}
