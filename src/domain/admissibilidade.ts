// Admissibilidade do Caderno de Proposta Técnica — Anexo III, item 28 (textos em matriz_2026.json).
// 28.1: requisitos essenciais (o VII, "6 PAs", é apurado pela tabela de páginas);
// 28.2: ausência de qualquer PA desclassifica; 28.4/28.5: irregularidade formal não desclassifica.
// Página de corte de cada PA = página inicial + limite do PA (Anexo III, 7.1, no JSON) − 1.

import { MATRIZ_2026, type Matriz } from './matriz/index.js'

export type ResultadoAdmissao = 'admitida' | 'nao_admitida'
export type SituacaoAdmissibilidade = 'admitida' | 'nao_admitida' | 'desclassificada'

/** Páginas do PA no Caderno (numeração do documento no SEI). */
export interface PaginasPlano {
  codigo: string
  ausente: boolean
  paginaInicial: number | null
  paginaFinal: number | null
}

export interface EntradaAdmissibilidade {
  /** Código do requisito (28.1.I…X) → atendido? O 28.1.VII é apurado pelos planos. */
  requisitos: Record<string, boolean>
  /** Códigos 28.5.I…V das irregularidades meramente formais encontradas. */
  irregularidadesFormais: string[]
  observacaoIrregularidades?: string
  planos: PaginasPlano[]
  resultado: ResultadoAdmissao
  motivacao?: string
}

export interface PlanoApurado extends PaginasPlano {
  limite: number
  paginas: number | null
  paginaCorte: number | null
  /** Páginas além do limite (0 = dentro do limite). */
  excede: number
}

export interface Admissibilidade extends Omit<EntradaAdmissibilidade, 'planos'> {
  planos: PlanoApurado[]
  situacao: SituacaoAdmissibilidade
  motivos: string[]
}

export const MOTIVACAO_MINIMA = 10

const paginaValida = (valor: number | null) => valor !== null && Number.isInteger(valor) && valor >= 1

/** Páginas, página de corte e excedente de um PA (valores parciais viram null). */
export function apurarPlano(plano: PaginasPlano, limite: number): PlanoApurado {
  const { paginaInicial: inicial, paginaFinal: final } = plano
  if (plano.ausente || !paginaValida(inicial)) {
    return { ...plano, limite, paginas: null, paginaCorte: null, excede: 0 }
  }
  const paginaCorte = inicial! + limite - 1
  const paginas = paginaValida(final) && final! >= inicial! ? final! - inicial! + 1 : null
  return { ...plano, limite, paginas, paginaCorte, excede: paginas === null ? 0 : Math.max(0, paginas - limite) }
}

/** Requisitos com o dos 6 PAs apurado pela tabela de páginas. */
function requisitosEfetivos(entrada: EntradaAdmissibilidade, matriz: Matriz): Record<string, boolean> {
  const { requisitoPlanos } = matriz.admissibilidade
  return { ...entrada.requisitos, [requisitoPlanos]: entrada.planos.every((p) => !p.ausente) }
}

export function problemasDaAdmissibilidade(
  entrada: EntradaAdmissibilidade,
  matriz: Matriz = MATRIZ_2026,
): Record<string, string> {
  const problemas: Record<string, string> = {}
  const regras = matriz.admissibilidade
  const codigos = regras.requisitosEssenciais.map((r) => r.codigo)

  const inexistente = Object.keys(entrada.requisitos).find((c) => !codigos.includes(c))
  if (inexistente) problemas.requisitos = `Requisito inexistente: ${inexistente}.`
  else if (codigos.some((c) => c !== regras.requisitoPlanos && typeof entrada.requisitos[c] !== 'boolean')) {
    problemas.requisitos = 'Marque cada requisito do item 28.1 como atendido ou não.'
  }

  const irregular = entrada.irregularidadesFormais.find(
    (c) => !regras.irregularidadesFormais.tipos.some((t) => t.codigo === c),
  )
  if (irregular) problemas.irregularidadesFormais = `Irregularidade inexistente: ${irregular}.`

  const esperados = matriz.dimensao1.planos.map((p) => p.codigo)
  const informados = entrada.planos.map((p) => p.codigo)
  if (informados.length !== esperados.length || esperados.some((c) => !informados.includes(c))) {
    problemas.planos = 'Informe os 6 Planos de Ação (PA1 a PA6), cada um uma vez.'
  } else {
    entrada.planos.forEach((p, i) => {
      if (p.ausente) return
      if (!paginaValida(p.paginaInicial)) {
        problemas[`planos.${i}.paginaInicial`] = 'Informe a página inicial (inteiro a partir de 1).'
      }
      if (!paginaValida(p.paginaFinal)) {
        problemas[`planos.${i}.paginaFinal`] = 'Informe a página final (inteiro a partir de 1).'
      } else if (paginaValida(p.paginaInicial) && p.paginaFinal! < p.paginaInicial!) {
        problemas[`planos.${i}.paginaFinal`] = 'A página final não pode ser anterior à inicial.'
      }
    })
  }

  if (entrada.resultado === 'admitida' && !problemas.requisitos && !problemas.planos) {
    const efetivos = requisitosEfetivos(entrada, matriz)
    const naoAtendido = codigos.find((c) => efetivos[c] === false)
    if (naoAtendido) {
      problemas.resultado = `Requisito essencial ${naoAtendido} não atendido: a proposta não pode ser admitida.`
    }
  }
  if (entrada.resultado === 'nao_admitida' && (entrada.motivacao?.trim().length ?? 0) < MOTIVACAO_MINIMA) {
    problemas.motivacao = `Informe a motivação da não admissão (ao menos ${MOTIVACAO_MINIMA} caracteres).`
  }
  return problemas
}

/** Apuração gravada na proposta: páginas e corte por PA, requisitos efetivos, situação e motivos. */
export function calcularAdmissibilidade(
  entrada: EntradaAdmissibilidade,
  matriz: Matriz = MATRIZ_2026,
): Admissibilidade {
  const [problema] = Object.values(problemasDaAdmissibilidade(entrada, matriz))
  if (problema) throw new Error(problema)

  const limites = new Map(matriz.dimensao1.planos.map((p) => [p.codigo, p.limitePaginas]))
  const planos = matriz.dimensao1.planos.map((pa) =>
    apurarPlano(entrada.planos.find((p) => p.codigo === pa.codigo)!, limites.get(pa.codigo)!),
  )
  const requisitos = requisitosEfetivos(entrada, matriz)
  const ausentes = planos.filter((p) => p.ausente).map((p) => p.codigo)

  const motivos = [
    ...ausentes.map((c) => `Ausência do ${c} (Anexo III, 28.2).`),
    ...matriz.admissibilidade.requisitosEssenciais
      .filter((r) => requisitos[r.codigo] === false)
      .map((r) => `Requisito ${r.codigo} não atendido: ${r.descricao}.`),
  ]
  const situacao: SituacaoAdmissibilidade =
    ausentes.length > 0 ? 'desclassificada' : entrada.resultado === 'admitida' ? 'admitida' : 'nao_admitida'

  const resultado: Admissibilidade = {
    requisitos,
    irregularidadesFormais: entrada.irregularidadesFormais,
    planos,
    resultado: entrada.resultado,
    situacao,
    motivos,
  }
  if (entrada.observacaoIrregularidades) resultado.observacaoIrregularidades = entrada.observacaoIrregularidades
  if (entrada.motivacao) resultado.motivacao = entrada.motivacao
  return resultado
}
