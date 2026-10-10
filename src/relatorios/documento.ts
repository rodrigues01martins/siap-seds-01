// Partes comuns dos documentos gerados no navegador: cabeçalho com a marca e a hierarquia do Kit, rodapé
// (gerado em, por quem, versão da matriz e código de verificação), marca d'água "MINUTA" e a moldura do PDF
// (pdfmake), com a identidade do DS: títulos em azul institucional e tabelas com neutral.100 alternado.
// Código puro: só monta a definição do documento; quem baixa o arquivo é src/relatorios/pdf.ts.

import type { Content, ContentTable, PageOrientation, TDocumentDefinitions } from 'pdfmake/interfaces'
import { CONTEXTO, GOVERNO, SECRETARIA, SIGLA, SISTEMA } from '../lib/marca.js'
import { corDoToken, variaveisCss } from '../styles/lerTokens.js'
import tokensCss from '../styles/tokens.css?raw'

/** Cores dos documentos: pdfmake e exceljs só aceitam HEX, então elas são LIDAS de src/styles/tokens.css
 *  (nenhum HEX fora dos tokens). Cada uma aponta para o token do DS. */
const TOKENS = variaveisCss(tokensCss)
const token = (nome: string) => corDoToken(nome, TOKENS)
export const CORES_DOCUMENTO = {
  azulInstitucional: token('sds-action-primary'),
  zebra: token('sds-neutral-100'),
  cabecalhoTabela: token('sds-neutral-200'),
  texto: token('sds-text-primary'),
  textoSecundario: token('sds-text-secondary'),
  borda: token('sds-border-default'),
  atencao: token('sds-status-warning-text'),
  erro: token('sds-status-error'),
} as const

/** Fonte dos PDFs. Gotham é licenciada: só entra com os arquivos oficiais (public/fonts/) registrados no
 *  pdfmake (src/relatorios/pdf.ts). Sem eles, a Roboto embutida do pdfmake. */
export const FONTE_PDF = 'Roboto'

export interface Rodape {
  geradoEm: Date
  /** E-mail de quem gerou (ou o uid, se não houver e-mail). */
  geradoPor: string
  versaoMatriz: string
  /** SHA-256 dos dados usados (src/relatorios/verificacao.ts). */
  codigo: string
}

export const MARCA_MINUTA = 'MINUTA'

/** Documento com alguma proposta não homologada leva a marca d'água "MINUTA". */
export function precisaMinuta(propostas: readonly { bloqueada?: boolean }[]): boolean {
  return propostas.some((p) => p.bloqueada !== true)
}

const FORMATO_DATA_HORA = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

/** dd/mm/aaaa hh:mm:ss no horário de Brasília (Goiás). */
export function formatarDataHora(data: Date): string {
  return FORMATO_DATA_HORA.format(data).replace(',', '')
}

export function linhasRodape(r: Rodape): string[] {
  return [
    `Gerado em ${formatarDataHora(r.geradoEm)} por ${r.geradoPor} · Matriz de avaliação versão ${r.versaoMatriz}`,
    `Código de verificação (SHA-256): ${r.codigo}`,
  ]
}

export const ESTILOS: TDocumentDefinitions['styles'] = {
  titulo: { fontSize: 15, bold: true, color: CORES_DOCUMENTO.azulInstitucional, margin: [0, 0, 0, 4] },
  subtitulo: { fontSize: 10, color: CORES_DOCUMENTO.textoSecundario, margin: [0, 0, 0, 10] },
  secao: { fontSize: 11, bold: true, color: CORES_DOCUMENTO.azulInstitucional, margin: [0, 12, 0, 4] },
  cabecalhoTabela: { bold: true, color: CORES_DOCUMENTO.texto },
  pequeno: { fontSize: 8, color: CORES_DOCUMENTO.textoSecundario },
  marca: { fontSize: 11, bold: true, color: CORES_DOCUMENTO.texto },
  marcaNivel: { fontSize: 8, color: CORES_DOCUMENTO.texto },
  aviso: { bold: true, color: CORES_DOCUMENTO.atencao },
}

/** Cabeçalho de todas as páginas: marca (texto, até haver arquivos oficiais em public/brand/) na hierarquia
 *  do Kit — Secretaria → Governo de Goiás — e, à direita, o sistema. Filete azul institucional abaixo. */
function cabecalhoInstitucional(larguraPagina: number): Content {
  return {
    margin: [40, 20, 40, 0],
    stack: [
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: SIGLA, style: 'marca' },
              { text: `${SECRETARIA} · ${GOVERNO}`, style: 'marcaNivel' },
            ],
          },
          {
            width: 'auto',
            alignment: 'right',
            stack: [
              { text: SISTEMA, style: 'marcaNivel', bold: true },
              { text: CONTEXTO, style: 'pequeno' },
            ],
          },
        ],
      },
      { canvas: [{ type: 'line', x1: 0, y1: 6, x2: larguraPagina - 80, y2: 6, lineWidth: 1.5, lineColor: CORES_DOCUMENTO.azulInstitucional }] },
    ],
  }
}

export function montarPdf({
  titulo,
  subtitulo,
  conteudo,
  rodape,
  minuta,
  orientacao = 'portrait',
}: {
  titulo: string
  subtitulo?: string
  conteudo: Content[]
  rodape: Rodape
  minuta: boolean
  orientacao?: PageOrientation
}): TDocumentDefinitions {
  const linhas = linhasRodape(rodape)
  return {
    info: { title: titulo, creator: 'SIAP SEDS/GO', subject: `Código de verificação ${rodape.codigo}` },
    pageSize: 'A4',
    pageOrientation: orientacao,
    pageMargins: [40, 72, 40, 60],
    defaultStyle: { font: FONTE_PDF, fontSize: 9, color: CORES_DOCUMENTO.texto },
    styles: ESTILOS,
    ...(minuta ? { watermark: { text: MARCA_MINUTA, opacity: 0.12, bold: true, angle: -45 } } : {}),
    header: (_pagina, _total, tamanho) => cabecalhoInstitucional(tamanho.width),
    content: [
      { text: titulo, style: 'titulo' },
      ...(subtitulo ? [{ text: subtitulo, style: 'subtitulo' }] : []),
      ...conteudo,
    ],
    footer: (pagina, total) => ({
      margin: [40, 10, 40, 0],
      stack: [
        ...linhas.map((texto) => ({ text: texto, style: 'pequeno' })),
        { text: `Página ${pagina} de ${total}`, style: 'pequeno', alignment: 'right' as const },
      ],
    }),
  }
}

/** Tabela com cabeçalho repetido nas quebras de página, cabeçalho em neutral.200 e linhas alternadas em
 *  neutral.100 (zebra), filetes horizontais finos. */
export function tabela(cabecalho: string[], linhas: Content[][], larguras?: (string | number)[]): ContentTable {
  return {
    table: {
      headerRows: 1,
      widths: larguras ?? cabecalho.map(() => '*'),
      body: [cabecalho.map((t) => ({ text: t, style: 'cabecalhoTabela' })), ...linhas],
    },
    layout: {
      fillColor: (linha: number) => (linha === 0 ? CORES_DOCUMENTO.cabecalhoTabela : linha % 2 === 0 ? CORES_DOCUMENTO.zebra : null),
      hLineWidth: (linha: number, no: { table: { body: unknown[] } }) => (linha === 0 || linha === no.table.body.length ? 0 : 0.5),
      vLineWidth: () => 0,
      hLineColor: () => CORES_DOCUMENTO.borda,
      paddingTop: () => 3,
      paddingBottom: () => 3,
    },
    margin: [0, 0, 0, 6],
  }
}
