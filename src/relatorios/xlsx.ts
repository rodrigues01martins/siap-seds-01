// Planilhas XLSX (exceljs), geradas no navegador: quadro-resumo do lote e trilha de auditoria.
// Carregado sob demanda (import dinâmico) para não pesar no carregamento inicial do app.
// Cada planilha termina com o rodapé dos documentos e o repete no rodapé de impressão.

import ExcelJS from 'exceljs'
import { descreverCaminho, diferencas, jsonIndentado, type RegistroAuditoria } from './auditoria.js'
import { CONTEXTO, GOVERNO, SECRETARIA, SIGLA, SISTEMA } from '../lib/marca.js'
import { CORES_DOCUMENTO, MARCA_MINUTA, formatarDataHora, linhasRodape, type Rodape } from './documento.js'
import { COLUNAS_QUADRO, subtituloQuadro, textoEmpate, tituloQuadro, type CabecalhoQuadro, type Quadro } from './quadroResumo.js'

function novoLivro(): ExcelJS.Workbook {
  const livro = new ExcelJS.Workbook()
  livro.creator = 'SIAP SEDS/GO'
  livro.created = new Date()
  return livro
}

/** Cor HEX do DS → ARGB do exceljs (opaca), a partir das cores usadas nos PDFs. */
const argb = (hex: string) => `FF${hex.slice(1).toUpperCase()}`
const preencher = (linha: ExcelJS.Row, hex: string) =>
  linha.eachCell((celula) => {
    celula.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(hex) } }
  })

function cabecalhoEmNegrito(linha: ExcelJS.Row) {
  linha.font = { bold: true, color: { argb: argb(CORES_DOCUMENTO.texto) } }
  preencher(linha, CORES_DOCUMENTO.cabecalhoTabela)
}

/** Linhas de dados alternadas em neutral.100 (a 2ª, 4ª… depois do cabeçalho), como nos PDFs. */
function zebrar(linhas: ExcelJS.Row[]) {
  linhas.forEach((linha, i) => {
    if (i % 2 === 1) preencher(linha, CORES_DOCUMENTO.zebra)
  })
}

/** Marca na hierarquia do Kit (Secretaria → Governo de Goiás) no topo e no cabeçalho de impressão. */
function escreverMarca(planilha: ExcelJS.Worksheet, comLinhas: boolean) {
  planilha.headerFooter.oddHeader = `&L&8${SIGLA} — ${SECRETARIA} · ${GOVERNO}&R&8${SISTEMA}`
  if (!comLinhas) return
  planilha.addRow([SIGLA]).font = { bold: true, size: 12 }
  planilha.addRow([`${SECRETARIA} · ${GOVERNO}`]).font = { size: 9 }
  planilha.addRow([`${SISTEMA} — ${CONTEXTO}`]).font = { size: 9, color: { argb: argb(CORES_DOCUMENTO.textoSecundario) } }
  planilha.addRow([])
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
  escreverMarca(planilha, true)
  if (minuta) {
    const marca = planilha.addRow([`${MARCA_MINUTA} — há proposta não homologada neste lote`])
    marca.font = { bold: true, size: 14, color: { argb: argb(CORES_DOCUMENTO.erro) } }
  }
  planilha.addRow([tituloQuadro(cabecalho)]).font = { bold: true, size: 13, color: { argb: argb(CORES_DOCUMENTO.azulInstitucional) } }
  planilha.addRow([subtituloQuadro(cabecalho)])
  if (quadro.aviso) planilha.addRow([quadro.aviso]).font = { bold: true, color: { argb: argb(CORES_DOCUMENTO.atencao) } }
  planilha.addRow([])

  cabecalhoEmNegrito(planilha.addRow(COLUNAS_QUADRO))
  zebrar(quadro.linhas.map((l) => planilha.addRow([l.posicao, l.nomeOsc, ...l.pas, l.d1, l.d2, l.nf, l.situacao, l.observacao])))
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
  escreverMarca(planilha, false) // a 1ª linha é o cabeçalho congelado da tabela: marca só na impressão
  cabecalhoEmNegrito(planilha.addRow(COLUNAS_AUDITORIA))
  const linhas: ExcelJS.Row[] = []
  for (const r of registros) {
    linhas.push(planilha.addRow([
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
    ]))
  }
  zebrar(linhas)
  const larguras = [19, 30, 11, 8, 40, 50, 30, 60, 60]
  planilha.columns.forEach((coluna, i) => {
    coluna.width = larguras[i]
    coluna.alignment = { vertical: 'top', wrapText: i >= 6 }
  })
  escreverRodape(planilha, rodape)
  return paraBytes(livro)
}
