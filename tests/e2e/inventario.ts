// Inventário estático do código para a auditoria de design: cores HEX soltas, classes de cor da paleta
// padrão do Tailwind (não semânticas) e declarações de fonte. Sem dependências além do Node.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const RAIZ = process.cwd()
const PASTAS = ['src', 'index.html']
const EXTENSOES = /\.(ts|tsx|css|html)$/
const IGNORAR = /(\.test\.(ts|tsx)$|\/testes\/)/

function arquivos(caminho: string): string[] {
  const absoluto = join(RAIZ, caminho)
  if (statSync(absoluto).isFile()) return [caminho]
  return readdirSync(absoluto).flatMap((nome) => arquivos(join(caminho, nome)))
}

const fontes = () => PASTAS.flatMap(arquivos).filter((a) => EXTENSOES.test(a) && !IGNORAR.test(a))

export interface Ocorrencia {
  arquivo: string
  linha: number
  valor: string
  trecho: string
}

function procurar(regex: RegExp): Ocorrencia[] {
  return fontes().flatMap((arquivo) =>
    readFileSync(join(RAIZ, arquivo), 'utf8')
      .split('\n')
      .flatMap((texto, i) =>
        [...texto.matchAll(regex)].map((m) => ({ arquivo: relative(RAIZ, join(RAIZ, arquivo)), linha: i + 1, valor: m[0], trecho: texto.trim().slice(0, 140) })),
      ),
  )
}

/** "#RGB", "#RRGGBB", "#RRGGBBAA" e cores ARGB do exceljs (argb: 'FFRRGGBB'). */
export const hexSoltos = () => procurar(/#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|argb:\s*'[0-9a-fA-F]{8}'/g)

/** Classes de cor da paleta padrão do Tailwind (bg-slate-900, text-red-700…), que não são tokens semânticos. */
export const classesDePaleta = () =>
  procurar(
    /\b(?:bg|text|border|ring|outline|fill|stroke|from|to|via|divide|placeholder|accent|decoration)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white)(?:-\d{2,3})?(?:\/\d+)?\b/g,
  )

export const declaracoesDeFonte = () => procurar(/font-family\s*:[^;]+|fontFamily\s*:\s*[^,}]+|font:\s*[^;]+|\bfont-(?:sans|serif|mono)\b|['"]Roboto['"]/g)
