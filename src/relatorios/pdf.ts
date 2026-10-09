// Gera e baixa o PDF no navegador (pdfmake com as fontes Roboto embutidas).
// Carregado sob demanda (import dinâmico) para não pesar no carregamento inicial do app.

import * as moduloPdfMake from 'pdfmake/build/pdfmake'
import vfs from 'pdfmake/build/vfs_fonts'
import type { TDocumentDefinitions } from 'pdfmake/interfaces'

// O build do pdfmake é UMD: conforme o empacotador, a API vem no default ou no próprio módulo.
const pdfMake = (moduloPdfMake as unknown as { default?: typeof moduloPdfMake }).default ?? moduloPdfMake

pdfMake.addVirtualFileSystem(vfs)
// Os documentos não buscam nada fora da página (imagens, fontes remotas).
pdfMake.setUrlAccessPolicy(() => false)

export async function baixarPdf(definicao: TDocumentDefinitions, nomeArquivo: string): Promise<void> {
  await pdfMake.createPdf(definicao).download(nomeArquivo)
}
