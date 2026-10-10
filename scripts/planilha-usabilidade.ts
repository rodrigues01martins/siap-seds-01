// Gera docs/teste-usabilidade-resultados.xlsx: planilha-modelo do teste com usuários (docs/TESTE-USABILIDADE.md).
// Abas: Participantes, Tarefas (tempo, sucesso, erros, ajuda, dúvidas), SUS (10 respostas e nota calculada por
// fórmula) e Resumo (médias por tarefa e SUS médio). Uso: npx tsx scripts/planilha-usabilidade.ts
import ExcelJS from 'exceljs'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { corDoToken, variaveisCss } from '../src/styles/lerTokens'
import { PERGUNTAS_SUS, TAREFAS_USABILIDADE } from './lib/usabilidade'

const PARTICIPANTES = 5
// Cores do DS lidas de src/styles/tokens.css (ARGB do exceljs = "FF" + RRGGBB).
const TOKENS = variaveisCss(readFileSync(join('src', 'styles', 'tokens.css'), 'utf8'))
const argb = (token: string) => `FF${corDoToken(token, TOKENS).slice(1)}`
const AZUL = argb('sds-action-primary')
const CINZA = argb('sds-neutral-100')
const BRANCO = argb('sds-text-inverse')

function cabecalho(linha: ExcelJS.Row) {
  linha.font = { bold: true, color: { argb: BRANCO } }
  linha.eachCell((c) => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL } }
    c.alignment = { vertical: 'middle', wrapText: true }
  })
}

function zebra(planilha: ExcelJS.Worksheet, primeira: number) {
  planilha.eachRow((linha, n) => {
    if (n > primeira && (n - primeira) % 2 === 0) {
      linha.eachCell({ includeEmpty: true }, (c) => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CINZA } }
      })
    }
  })
}

async function main() {
  const livro = new ExcelJS.Workbook()
  livro.creator = 'SIAP SEDS/GO'

  const p = livro.addWorksheet('Participantes', { views: [{ state: 'frozen', ySplit: 1 }] })
  p.columns = [
    { header: 'Código', width: 10 },
    { header: 'Papel na Comissão', width: 22 },
    { header: 'Experiência com sistemas (1 a 5)', width: 18 },
    { header: 'Já participou de comissão de seleção? (sim/não)', width: 22 },
    { header: 'Data do teste', width: 14 },
    { header: 'Moderador(a)', width: 20 },
    { header: 'Observações', width: 40 },
  ]
  cabecalho(p.getRow(1))
  for (let i = 1; i <= PARTICIPANTES; i++) p.addRow([`P${i}`])
  zebra(p, 1)

  const t = livro.addWorksheet('Tarefas', { views: [{ state: 'frozen', ySplit: 1 }] })
  t.columns = [
    { header: 'Participante', width: 12 },
    { header: 'Tarefa', width: 46 },
    { header: 'Tempo-alvo (min)', width: 10 },
    { header: 'Tempo (mm:ss)', width: 12 },
    { header: 'Tempo (min)', width: 10 },
    { header: 'Sucesso (sim/parcial/não)', width: 14 },
    { header: 'Erros (quantidade)', width: 10 },
    { header: 'Pedidos de ajuda', width: 10 },
    { header: 'Erros observados', width: 40 },
    { header: 'Dúvidas e comentários', width: 40 },
    { header: 'Severidade do problema (alta/média/baixa)', width: 16 },
  ]
  cabecalho(t.getRow(1))
  for (let i = 1; i <= PARTICIPANTES; i++) {
    for (const tarefa of TAREFAS_USABILIDADE) {
      const linha = t.addRow([`P${i}`, `${tarefa.codigo} — ${tarefa.titulo}`, tarefa.tempoAlvoMin])
      // Tempo em minutos a partir de mm:ss (vazio enquanto não preenchido).
      linha.getCell(5).value = { formula: `IF(D${linha.number}="","",(VALUE(LEFT(D${linha.number},FIND(":",D${linha.number})-1))*60+VALUE(MID(D${linha.number},FIND(":",D${linha.number})+1,2)))/60)` }
      linha.getCell(5).numFmt = '0.0'
    }
  }
  zebra(t, 1)

  const s = livro.addWorksheet('SUS', { views: [{ state: 'frozen', ySplit: 1 }] })
  s.columns = [
    { header: 'Participante', width: 12 },
    ...PERGUNTAS_SUS.map((_, i) => ({ header: `Q${i + 1}`, width: 6 })),
    { header: 'Nota SUS (0–100)', width: 12 },
  ]
  cabecalho(s.getRow(1))
  for (let i = 1; i <= PARTICIPANTES; i++) {
    const linha = s.addRow([`P${i}`])
    const n = linha.number
    // Ímpares (positivas): resposta − 1; pares (negativas): 5 − resposta; soma × 2,5.
    const impares = [2, 4, 6, 8, 10].map((c) => `(${s.getColumn(c).letter}${n}-1)`).join('+')
    const pares = [3, 5, 7, 9, 11].map((c) => `(5-${s.getColumn(c).letter}${n})`).join('+')
    linha.getCell(12).value = { formula: `IF(COUNT(B${n}:K${n})<10,"",(${impares}+${pares})*2.5)` }
    linha.getCell(12).numFmt = '0.0'
  }
  s.addRow([])
  s.addRow(['Escala: 1 = discordo totalmente … 5 = concordo totalmente.'])
  PERGUNTAS_SUS.forEach((q, i) => s.addRow([`Q${i + 1}`, q]))
  zebra(s, 1)

  const r = livro.addWorksheet('Resumo')
  r.columns = [
    { header: 'Tarefa', width: 46 },
    { header: 'Tempo-alvo (min)', width: 12 },
    { header: 'Tempo médio (min)', width: 12 },
    { header: 'Taxa de sucesso (sim)', width: 12 },
    { header: 'Erros (média)', width: 10 },
    { header: 'Pedidos de ajuda (total)', width: 12 },
  ]
  cabecalho(r.getRow(1))
  const fim = 1 + PARTICIPANTES * TAREFAS_USABILIDADE.length
  for (const tarefa of TAREFAS_USABILIDADE) {
    const nome = `${tarefa.codigo} — ${tarefa.titulo}`
    const linha = r.addRow([nome, tarefa.tempoAlvoMin])
    const n = linha.number
    const faixa = (col: string) => `Tarefas!${col}2:${col}${fim}`
    linha.getCell(3).value = { formula: `IFERROR(AVERAGEIF(${faixa('B')},A${n},${faixa('E')}),"")` }
    linha.getCell(4).value = { formula: `IFERROR(COUNTIFS(${faixa('B')},A${n},${faixa('F')},"sim")/COUNTIFS(${faixa('B')},A${n},${faixa('F')},"<>"),"")` }
    linha.getCell(5).value = { formula: `IFERROR(AVERAGEIF(${faixa('B')},A${n},${faixa('G')}),"")` }
    linha.getCell(6).value = { formula: `SUMIF(${faixa('B')},A${n},${faixa('H')})` }
    linha.getCell(3).numFmt = '0.0'
    linha.getCell(4).numFmt = '0%'
    linha.getCell(5).numFmt = '0.0'
  }
  r.addRow([])
  const sus = r.addRow(['SUS médio (meta ≥ 68; ≥ 80 = muito bom)', '', { formula: `IFERROR(AVERAGE(SUS!L2:L${1 + PARTICIPANTES}),"")` }])
  sus.font = { bold: true }
  sus.getCell(3).numFmt = '0.0'
  zebra(r, 1)

  const destino = join('docs', 'teste-usabilidade-resultados.xlsx')
  await livro.xlsx.writeFile(destino)
  console.log(`Planilha gerada: ${destino}`)
}

void main()
