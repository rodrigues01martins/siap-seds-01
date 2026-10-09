// Partes comuns dos documentos gerados no navegador: rodapé (gerado em, por quem, versão da matriz e
// código de verificação), marca d'água "MINUTA" e a moldura do PDF (pdfmake).
// Código puro: só monta a definição do documento; quem baixa o arquivo é src/relatorios/pdf.ts.

import type { Content, PageOrientation, TDocumentDefinitions } from 'pdfmake/interfaces'

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
  titulo: { fontSize: 14, bold: true, margin: [0, 0, 0, 4] },
  subtitulo: { fontSize: 10, color: '#475569', margin: [0, 0, 0, 10] },
  secao: { fontSize: 11, bold: true, margin: [0, 12, 0, 4] },
  cabecalhoTabela: { bold: true, fillColor: '#e2e8f0' },
  pequeno: { fontSize: 8, color: '#334155' },
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
    pageMargins: [40, 40, 40, 60],
    defaultStyle: { fontSize: 9 },
    styles: ESTILOS,
    ...(minuta ? { watermark: { text: MARCA_MINUTA, opacity: 0.12, bold: true, angle: -45 } } : {}),
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

/** Tabela simples com cabeçalho repetido nas quebras de página. */
export function tabela(cabecalho: string[], linhas: Content[][], larguras?: (string | number)[]): Content {
  return {
    table: {
      headerRows: 1,
      widths: larguras ?? cabecalho.map(() => '*'),
      body: [cabecalho.map((t) => ({ text: t, style: 'cabecalhoTabela' })), ...linhas],
    },
    layout: 'lightHorizontalLines',
    margin: [0, 0, 0, 6],
  }
}
