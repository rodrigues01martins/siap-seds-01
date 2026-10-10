// Planilhas XLSX (exceljs), geradas no navegador: quadro-resumo do lote e trilha de auditoria.
// Carregado sob demanda (import dinâmico) para não pesar no carregamento inicial do app.
// Cada planilha termina com o rodapé dos documentos e o repete no rodapé de impressão.

import ExcelJS from 'exceljs'
import { descreverCaminho, diferencas, jsonIndentado, type RegistroAuditoria } from './auditoria.js'
import { MARCA_MINUTA, formatarDataHora, linhasRodape, type Rodape } from './documento.js'
import { COLUNAS_QUADRO, subtituloQuadro, textoEmpate, tituloQuadro, type CabecalhoQuadro, type Quadro } from './quadroResumo.js'

function novoLivro(): ExcelJS.Workbook {
  const livro = new ExcelJS.Workbook()
  livro.creator = 'SIAP SEDS/GO'
  livro.created = new Date()
  return livro
}

function cabecalhoEmNegrito(linha: ExcelJS.Row) {
  linha.font = { bold: true }
  linha.eachCell((celula) => {
    celula.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }
  })
}

function escreverRodape(planilha: ExcelJS.Worksheet, rodape: Rodape) {
  planilha.addRow([])
  for (const texto of linhasRodape(rodape)) planilha.addRow([texto]).font = { italic: true, size: 9 }
  // Rodapé de impressão (o "&" é caractere de controle do Excel).
  planilha.headerFooter.oddFooter = `&8${linhasRodape(rodape).join(' · ').replace(/&/g, '&&')} · Página &P de &N`
}

async function paraBytes(livro: ExcelJS.Workbook): Promise<ArrayBuffer> {
  return (await livro.xlsx.writeBuffer()) as ArrayBuffer
}

export async function quadroXlsx(cabecalho: CabecalhoQuadro, quadro: Quadro, rodape: Rodape, minuta: boolean): Promise<ArrayBuffer> {
  const livro = novoLivro()
  const planilha = livro.addWorksheet(`Lote ${cabecalho.lote.codigo}`.slice(0, 31), {
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })
  if (minuta) {
    const marca = planilha.addRow([`${MARCA_MINUTA} — há proposta não homologada neste lote`])
    marca.font = { bold: true, size: 14, color: { argb: 'FFB91C1C' } }
  }
  planilha.addRow([tituloQuadro(cabecalho)]).font = { bold: true, size: 13 }
  planilha.addRow([subtituloQuadro(cabecalho)])
  if (quadro.aviso) planilha.addRow([quadro.aviso]).font = { bold: true, color: { argb: 'FF92400E' } }
  planilha.addRow([])

  cabecalhoEmNegrito(planilha.addRow(COLUNAS_QUADRO))
  for (const l of quadro.linhas) {
    planilha.addRow([l.posicao, l.nomeOsc, ...l.pas, l.d1, l.d2, l.nf, l.situacao, l.observacao])
  }
  planilha.columns.forEach((coluna, i) => {
    coluna.width = i === 1 ? 36 : i === COLUNAS_QUADRO.length - 1 ? 60 : i === COLUNAS_QUADRO.length - 2 ? 18 : 9
  })

  if (quadro.empates.length > 0) {
    planilha.addRow([])
    planilha.addRow(['Empates não resolvidos pelos critérios do Edital (RF-27)']).font = { bold: true }
    for (const e of quadro.empates) planilha.addRow([textoEmpate(e)])
  }
  escreverRodape(planilha, rodape)
  return paraBytes(livro)
}

export const COLUNAS_AUDITORIA = ['Data/hora', 'Usuário', 'Perfil', 'Ação', 'Objeto', 'Caminho', 'Campos alterados', 'Antes', 'Depois']

export async function auditoriaXlsx(registros: RegistroAuditoria[], rodape: Rodape): Promise<ArrayBuffer> {
  const livro = novoLivro()
  const planilha = livro.addWorksheet('Auditoria', { views: [{ state: 'frozen', ySplit: 1 }] })
  cabecalhoEmNegrito(planilha.addRow(COLUNAS_AUDITORIA))
  for (const r of registros) {
    planilha.addRow([
      r.dataHora ? formatarDataHora(r.dataHora) : '—',
      r.email ?? r.uid,
      r.perfil,
      r.acao,
      descreverCaminho(r.caminho),
      r.caminho,
      diferencas(r.antes, r.depois)
        .map((d) => d.campo)
        .join(', '),
      jsonIndentado(r.antes),
      jsonIndentado(r.depois),
    ])
  }
  const larguras = [19, 30, 11, 8, 40, 50, 30, 60, 60]
  planilha.columns.forEach((coluna, i) => {
    coluna.width = larguras[i]
    coluna.alignment = { vertical: 'top', wrapText: i >= 6 }
  })
  escreverRodape(planilha, rodape)
  return paraBytes(livro)
}
