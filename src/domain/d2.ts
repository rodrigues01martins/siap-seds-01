// Dimensão 2 — Experiência Técnica e Operacional da OSC (D2 = C2.1 + C2.2 + C2.3 + C2.4).
// Cada critério devolve os pontos e a memória de cálculo que justifica o resultado.

import { pontuarPorFaixa } from './faixas'
import { formatarNumero, formatarReais } from './formatacao'
import { mesclarIntervalos, mesesCompletos, paraDia, picoSimultaneo, type ItemTemporal } from './intervalos'
import { MATRIZ_2026, type CriterioComFaixas, type Matriz } from './matriz'

export type CategoriaExperiencia = 'A' | 'B' | 'C' | 'D'

/** Experiência cadastrada pela Comissão a partir da documentação comprobatória. */
export interface Experiencia {
  id: string
  descricao?: string
  /**
   * Categorias do Critério 2.1 reconhecidas pela Comissão.
   * A e B não podem coexistir (Anexo IV, item 3.2.1, III); D pode acompanhar A ou B (item 3.2.1, IV).
   */
  categorias: CategoriaExperiencia[]
  /** Programa de privação de liberdade em unidade socioeducativa de internação (Subcritério 2.3.1). */
  internacao?: boolean
  inicio: string
  /** Nulo = em execução; considerada até a data limite das propostas (Anexo IV, item 3.3.1, IV). */
  fim: string | null
  /** Capacidade máxima de atendimento simultâneo. */
  vagas?: number | null
  /** Unidades de internação abrangidas pelo instrumento. */
  unidades?: number | null
  /** Trabalhadores diretamente vinculados à operação. */
  trabalhadores?: number | null
  /** Volume anual de recursos, já atualizado monetariamente, em centavos. */
  valorAnualCentavos?: number | null
  /** Execução satisfatória documentalmente comprovada (Critério 2.4). */
  execucaoSatisfatoria?: boolean
}

export interface EntradaD2 {
  experiencias: Experiencia[]
  /**
   * Data limite para apresentação das propostas (AAAA-MM-DD). Experiências em execução
   * são consideradas até essa data (Anexo IV, item 3.3.1, IV).
   */
  dataLimite: string
}

export interface ResultadoCriterio {
  codigo: string
  titulo: string
  pontos: number
  maximo: number
  /** Quantidade apurada que define a faixa (meses, vagas, centavos, experiências…). */
  valorApurado?: number
  faixa?: string
  memoria: string[]
}

export interface ResultadoC231 extends ResultadoCriterio {
  A: ResultadoCriterio
  B: ResultadoCriterio
}

export interface ResultadoC23 extends ResultadoCriterio {
  subcriterios: {
    '2.3.1': ResultadoC231
    '2.3.2': ResultadoCriterio
    '2.3.3': ResultadoCriterio
  }
}

export interface ResultadoD2 {
  total: number
  maximo: number
  criterios: {
    'C2.1': ResultadoCriterio
    'C2.2': ResultadoCriterio
    'C2.3': ResultadoC23
    'C2.4': ResultadoCriterio
  }
}

type CampoQuantitativo = 'vagas' | 'unidades' | 'trabalhadores' | 'valorAnualCentavos'
const CAMPOS_QUANTITATIVOS: CampoQuantitativo[] = ['vagas', 'unidades', 'trabalhadores', 'valorAnualCentavos']

// ---------------------------------------------------------------------------
// Validação e utilitários
// ---------------------------------------------------------------------------

function validarExperiencias(experiencias: Experiencia[], matriz: Matriz): void {
  const { categorias, categoriasMutuamenteExclusivas } = matriz.dimensao2.criterios['C2.1']
  const conhecidas = new Set(categorias.map((c) => c.codigo))
  const ids = new Set<string>()

  for (const e of experiencias) {
    const erro = (msg: string) => new Error(`Experiência "${e.id}": ${msg}`)
    if (ids.has(e.id)) throw erro('id duplicado — a mesma experiência não pode ser contada duas vezes')
    ids.add(e.id)

    for (const c of e.categorias) if (!conhecidas.has(c)) throw erro(`categoria desconhecida ${c}`)
    // Anexo IV, item 3.2.1, III: uma mesma experiência não pode ser enquadrada simultaneamente em A e B.
    for (const grupo of categoriasMutuamenteExclusivas) {
      const presentes = grupo.filter((c) => e.categorias.includes(c as CategoriaExperiencia))
      if (presentes.length > 1) {
        throw erro(`não pode ser enquadrada simultaneamente nas categorias ${presentes.join(' e ')}`)
      }
    }

    try {
      const inicio = paraDia(e.inicio)
      if (e.fim !== null && paraDia(e.fim) < inicio) throw new Error(`início ${e.inicio} posterior ao fim ${e.fim}`)
    } catch (causa) {
      throw erro((causa as Error).message)
    }

    for (const campo of CAMPOS_QUANTITATIVOS) {
      const valor = e[campo]
      if (valor == null) continue
      if (!Number.isInteger(valor) || valor < 0) throw erro(`${campo} deve ser inteiro não negativo (recebido ${valor})`)
    }
  }
}

function temCategoria(e: Experiencia, consideradas: string[]): boolean {
  return e.categorias.some((c) => consideradas.includes(c))
}

/**
 * Período efetivo: em execução vai até a data limite; nada após a data limite é considerado
 * (Anexo IV, item 3.3.1, IV).
 */
function periodoAte(e: Experiencia, dataLimite: string | undefined): { inicio: string; fim: string } | null {
  if (dataLimite === undefined) {
    if (e.fim === null) throw new Error(`Experiência "${e.id}": em execução exige a data limite`)
    return { inicio: e.inicio, fim: e.fim }
  }
  if (paraDia(e.inicio) > paraDia(dataLimite)) return null
  const fim = e.fim === null || paraDia(e.fim) > paraDia(dataLimite) ? dataLimite : e.fim
  return { inicio: e.inicio, fim }
}

function formatarQuantidade(valor: number, unidade: string): string {
  return unidade === 'centavos' ? formatarReais(valor) : `${formatarNumero(valor)} ${unidade}`
}

function pts(valor: number): string {
  return `${formatarNumero(valor)} pt`
}

function aplicarFaixa(
  codigo: string,
  criterio: CriterioComFaixas,
  valorApurado: number,
  memoria: string[],
): ResultadoCriterio {
  const faixa = pontuarPorFaixa(valorApurado, criterio.faixas)
  const pontos = Math.min(faixa.pontos, criterio.maximo)
  memoria.push(
    `Apurado: ${formatarQuantidade(valorApurado, criterio.unidade)} → faixa "${faixa.descricao}" → ${pts(pontos)}`,
  )
  return { codigo, titulo: criterio.titulo, pontos, maximo: criterio.maximo, valorApurado, faixa: faixa.descricao, memoria }
}

/** Maior soma simultânea de um quantitativo entre as experiências elegíveis (itens 3.8.3 e 3.8.4). */
function apurarSimultaneo(
  codigo: string,
  criterio: CriterioComFaixas,
  elegiveis: Experiencia[],
  campo: CampoQuantitativo,
  dataLimite: string | undefined,
): ResultadoCriterio {
  const memoria: string[] = []
  const itens: ItemTemporal[] = []
  for (const e of elegiveis) {
    const valor = e[campo]
    if (valor == null) {
      memoria.push(`${e.id}: desconsiderada — ${criterio.unidade} não comprovado(s) (item 3.8.5)`)
      continue
    }
    const periodo = periodoAte(e, dataLimite)
    if (!periodo) {
      memoria.push(`${e.id}: desconsiderada — início posterior à data limite`)
      continue
    }
    itens.push({ id: e.id, valor, ...periodo })
    memoria.push(`${e.id}: ${formatarQuantidade(valor, criterio.unidade)} de ${periodo.inicio} a ${periodo.fim}`)
  }
  if (itens.length === 0) memoria.push('Nenhuma experiência elegível com quantitativo comprovado')

  const pico = picoSimultaneo(itens)
  if (pico.inicio) {
    memoria.push(
      `Maior total simultâneo: ${formatarQuantidade(pico.valor, criterio.unidade)} de ${pico.inicio} a ${pico.fim} ` +
        `(${pico.ids.join(' + ')}); períodos sucessivos não se somam`,
    )
  }
  return aplicarFaixa(codigo, criterio, pico.valor, memoria)
}

// ---------------------------------------------------------------------------
// Critérios
// ---------------------------------------------------------------------------

/** C2.1 — cumulativo entre categorias; cada categoria pontua uma única vez. */
export function calcularC21(experiencias: Experiencia[], matriz: Matriz = MATRIZ_2026): ResultadoCriterio {
  validarExperiencias(experiencias, matriz)
  const criterio = matriz.dimensao2.criterios['C2.1']
  const memoria: string[] = []
  let soma = 0
  for (const categoria of criterio.categorias) {
    const ids = experiencias.filter((e) => e.categorias.includes(categoria.codigo as CategoriaExperiencia)).map((e) => e.id)
    if (ids.length > 0) {
      soma += categoria.pontos
      memoria.push(`Categoria ${categoria.codigo}: comprovada por ${ids.join(', ')} → ${pts(categoria.pontos)}`)
    } else {
      memoria.push(`Categoria ${categoria.codigo}: não comprovada → 0 pt`)
    }
  }
  const pontos = Math.min(soma, criterio.maximo)
  memoria.push(`Total C2.1: ${pts(pontos)}`)
  return { codigo: 'C2.1', titulo: criterio.titulo, pontos, maximo: criterio.maximo, memoria }
}

/**
 * C2.2 — tempo em meses completos (Anexo IV, item 3.3.1, I), somando períodos sucessivos de
 * experiências distintas (item 3.3.1, II) e contando uma única vez os concomitantes (item 3.3.1, III).
 * Apenas categorias A e B (item 3.3); o tempo de existência da OSC não conta (item 3.3.1, V).
 */
export function calcularC22(
  experiencias: Experiencia[],
  dataLimite: string,
  matriz: Matriz = MATRIZ_2026,
): ResultadoCriterio {
  validarExperiencias(experiencias, matriz)
  const criterio = matriz.dimensao2.criterios['C2.2']
  const memoria: string[] = []
  const periodos: { inicio: string; fim: string }[] = []

  for (const e of experiencias) {
    if (!temCategoria(e, criterio.categoriasConsideradas)) continue
    const periodo = periodoAte(e, dataLimite)
    if (!periodo) {
      memoria.push(`${e.id}: desconsiderada — início posterior à data limite`)
      continue
    }
    periodos.push(periodo)
    memoria.push(`${e.id}: ${periodo.inicio} a ${periodo.fim}${e.fim === null ? ' (em execução)' : ''}`)
  }
  if (periodos.length === 0) {
    memoria.push(`Nenhuma experiência nas categorias ${criterio.categoriasConsideradas.join(' e ')}`)
  }

  let meses = 0
  for (const bloco of mesclarIntervalos(periodos)) {
    const m = mesesCompletos(bloco)
    meses += m
    memoria.push(`Período contínuo ${bloco.inicio} a ${bloco.fim}: ${m} meses completos`)
  }
  return aplicarFaixa('C2.2', criterio, meses, memoria)
}

/** C2.3 — porte e escala: 2.3.1 (A + B) + 2.3.2 + 2.3.3, sempre pelo maior total simultâneo. */
export function calcularC23(
  experiencias: Experiencia[],
  dataLimite?: string,
  matriz: Matriz = MATRIZ_2026,
): ResultadoC23 {
  validarExperiencias(experiencias, matriz)
  const criterio = matriz.dimensao2.criterios['C2.3']
  const { '2.3.1': c231, '2.3.2': c232, '2.3.3': c233 } = criterio.subcriterios

  const internacoes = experiencias.filter(
    (e) => temCategoria(e, c231.categoriasConsideradas) && (!c231.exigeInternacao || e.internacao === true),
  )
  const a = apurarSimultaneo('2.3.1 A', c231.A, internacoes, 'vagas', dataLimite)
  const b = apurarSimultaneo('2.3.1 B', c231.B, internacoes, 'unidades', dataLimite)
  const pontos231 = Math.min(a.pontos + b.pontos, c231.maximo)
  const r231: ResultadoC231 = {
    codigo: '2.3.1',
    titulo: c231.titulo,
    pontos: pontos231,
    maximo: c231.maximo,
    memoria: [`2.3.1 = A (${pts(a.pontos)}) + B (${pts(b.pontos)}), limitado a ${pts(c231.maximo)} → ${pts(pontos231)}`],
    A: a,
    B: b,
  }

  const elegiveis = (consideradas: string[]) => experiencias.filter((e) => temCategoria(e, consideradas))
  const r232 = apurarSimultaneo('2.3.2', c232, elegiveis(c232.categoriasConsideradas), 'trabalhadores', dataLimite)
  const r233 = apurarSimultaneo('2.3.3', c233, elegiveis(c233.categoriasConsideradas), 'valorAnualCentavos', dataLimite)

  const pontos = Math.min(r231.pontos + r232.pontos + r233.pontos, criterio.maximo)
  return {
    codigo: 'C2.3',
    titulo: criterio.titulo,
    pontos,
    maximo: criterio.maximo,
    memoria: [
      `C2.3 = 2.3.1 (${pts(r231.pontos)}) + 2.3.2 (${pts(r232.pontos)}) + 2.3.3 (${pts(r233.pontos)}), ` +
        `limitado a ${pts(criterio.maximo)} → ${pts(pontos)}`,
    ],
    subcriterios: { '2.3.1': r231, '2.3.2': r232, '2.3.3': r233 },
  }
}

/** C2.4 — quantidade de experiências distintas (A, B ou C) com execução satisfatória comprovada. */
export function calcularC24(experiencias: Experiencia[], matriz: Matriz = MATRIZ_2026): ResultadoCriterio {
  validarExperiencias(experiencias, matriz)
  const criterio = matriz.dimensao2.criterios['C2.4']
  const memoria: string[] = []
  let quantidade = 0
  for (const e of experiencias) {
    if (!temCategoria(e, criterio.categoriasConsideradas)) continue
    if (e.execucaoSatisfatoria === true) {
      quantidade += 1
      memoria.push(`${e.id}: execução satisfatória comprovada`)
    } else {
      memoria.push(`${e.id}: desconsiderada — sem comprovação de execução satisfatória`)
    }
  }
  return aplicarFaixa('C2.4', criterio, quantidade, memoria)
}

export function calcularD2(entrada: EntradaD2, matriz: Matriz = MATRIZ_2026): ResultadoD2 {
  const { experiencias, dataLimite } = entrada
  paraDia(dataLimite)
  validarExperiencias(experiencias, matriz)

  const criterios = {
    'C2.1': calcularC21(experiencias, matriz),
    'C2.2': calcularC22(experiencias, dataLimite, matriz),
    'C2.3': calcularC23(experiencias, dataLimite, matriz),
    'C2.4': calcularC24(experiencias, matriz),
  }
  const total = Math.min(
    criterios['C2.1'].pontos + criterios['C2.2'].pontos + criterios['C2.3'].pontos + criterios['C2.4'].pontos,
    matriz.dimensao2.maximo,
  )
  return { total, maximo: matriz.dimensao2.maximo, criterios }
}
