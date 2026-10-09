// Operações sobre períodos de datas (AAAA-MM-DD, fim inclusivo).
// Internamente cada data vira um número inteiro de dias (UTC), o que evita fuso horário.

export interface Intervalo {
  inicio: string
  fim: string
}

export interface ItemTemporal extends Intervalo {
  id: string
  valor: number
}

export interface Pico {
  valor: number
  /** Primeiro dia em que o pico ocorre. */
  inicio: string | null
  /** Último dia do primeiro período contínuo em que o pico se mantém. */
  fim: string | null
  /** Itens ativos durante o pico, na ordem de entrada. */
  ids: string[]
}

const MS_POR_DIA = 86_400_000
const FORMATO_ISO = /^(\d{4})-(\d{2})-(\d{2})$/

export function paraDia(data: string): number {
  const partes = FORMATO_ISO.exec(data)
  if (!partes) throw new Error(`Data inválida: "${data}" (use AAAA-MM-DD)`)
  const [ano, mes, dia] = [Number(partes[1]), Number(partes[2]), Number(partes[3])]
  const instante = new Date(Date.UTC(ano, mes - 1, dia))
  if (instante.getUTCFullYear() !== ano || instante.getUTCMonth() !== mes - 1 || instante.getUTCDate() !== dia) {
    throw new Error(`Data inexistente: "${data}"`)
  }
  return instante.getTime() / MS_POR_DIA
}

export function deDia(dia: number): string {
  return new Date(dia * MS_POR_DIA).toISOString().slice(0, 10)
}

function paraDias({ inicio, fim }: Intervalo): [number, number] {
  const a = paraDia(inicio)
  const b = paraDia(fim)
  if (a > b) throw new Error(`Período inválido: início ${inicio} posterior ao fim ${fim}`)
  return [a, b]
}

/**
 * Une períodos sobrepostos ou contíguos (fim + 1 dia = próximo início).
 * Resultado: períodos disjuntos, em ordem cronológica — concomitâncias contam uma única vez.
 */
export function mesclarIntervalos(intervalos: Intervalo[]): Intervalo[] {
  const ordenados = intervalos.map(paraDias).sort((x, y) => x[0] - y[0])
  const mesclados: [number, number][] = []
  for (const [inicio, fim] of ordenados) {
    const ultimo = mesclados.at(-1)
    if (ultimo && inicio <= ultimo[1] + 1) ultimo[1] = Math.max(ultimo[1], fim)
    else mesclados.push([inicio, fim])
  }
  return mesclados.map(([inicio, fim]) => ({ inicio: deDia(inicio), fim: deDia(fim) }))
}

/** Meses completos de um período com fim inclusivo (ex.: 01/01 a 31/12 = 12 meses). */
export function mesesCompletos(intervalo: Intervalo): number {
  const [inicio, fim] = paraDias(intervalo)
  const a = new Date(inicio * MS_POR_DIA)
  const b = new Date((fim + 1) * MS_POR_DIA) // fim exclusivo
  let meses = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth())
  if (b.getUTCDate() < a.getUTCDate()) meses -= 1
  return Math.max(0, meses)
}

/**
 * Maior soma de `valor` entre itens ativos no mesmo dia (sweep line).
 * Cada item gera um evento de entrada no início e de saída no dia seguinte ao fim;
 * percorrendo os eventos em ordem, a soma corrente é o total simultâneo daquele dia.
 * Itens sucessivos nunca somam; concomitantes somam no período de sobreposição.
 */
export function picoSimultaneo(itens: ItemTemporal[]): Pico {
  const eventos: { dia: number; indice: number; entra: boolean }[] = []
  itens.forEach((item, indice) => {
    const [inicio, fim] = paraDias(item)
    eventos.push({ dia: inicio, indice, entra: true }, { dia: fim + 1, indice, entra: false })
  })
  eventos.sort((x, y) => x.dia - y.dia)

  const ativos = new Set<number>()
  let atual = 0
  let pico: Pico = { valor: 0, inicio: null, fim: null, ids: [] }

  let i = 0
  while (i < eventos.length) {
    const dia = eventos[i]!.dia
    // Processa todos os eventos do mesmo dia antes de medir a soma.
    for (; i < eventos.length && eventos[i]!.dia === dia; i++) {
      const { indice, entra } = eventos[i]!
      atual += entra ? itens[indice]!.valor : -itens[indice]!.valor
      if (entra) ativos.add(indice)
      else ativos.delete(indice)
    }
    if (atual > pico.valor) {
      const proximoDia = eventos[i]!.dia // sempre existe: há itens ativos aguardando saída
      pico = {
        valor: atual,
        inicio: deDia(dia),
        fim: deDia(proximoDia - 1),
        ids: [...ativos].sort((x, y) => x - y).map((k) => itens[k]!.id),
      }
    }
  }
  return pico
}
