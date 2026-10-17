// Fila do salvamento automático (Simplificação 3/4), sem React: a tela muda na hora (rascunho otimista por campo)
// e a gravação na /api vem em seguida — com atraso (debounce, para textos) ou imediata (níveis) —, uma por vez,
// na ordem. Falha de rede ou do servidor (status 0 ou 5xx) tenta de novo sozinha (1 s, 2 s, 4 s…); recusa da /api
// (4xx) não se repete. Esgotadas as tentativas, o campo fica com "erro" e o rascunho continua na tela até
// "tentar de novo" ou um valor novo. O rascunho some quando o servidor confirma o mesmo valor (confirmar).
// Rascunho que ainda não pode ser enviado (ex.: experiência sem início) fica guardado (guardar), "incompleto".

import { ErroApi } from './api'

export type EstadoSalvamento = 'salvo' | 'salvando' | 'erro' | 'incompleto'

type Enviar = (valor: never) => Promise<unknown>

interface Tarefa {
  chave: string
  valor: unknown
  enviar: Enviar
  /** Número da gravação do campo: só a mais nova vale (uma falha antiga não sobrepõe um valor novo). */
  numero: number
  tentativa: number
}

export interface OpcoesFila {
  /** Tentativas por gravação antes de mostrar "erro" (padrão 3). */
  tentativas?: number
  /** Espera antes da tentativa seguinte (padrão 1 s, 2 s, 4 s…). */
  espera?: (tentativa: number) => number
}

const repetivel = (erro: unknown) => !(erro instanceof ErroApi) || erro.status === 0 || erro.status >= 500
const mensagem = (erro: unknown) => (erro instanceof Error ? erro.message : 'Erro inesperado ao salvar.')
const iguais = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

export class FilaSalvamento {
  private readonly tentativas: number
  private readonly espera: (tentativa: number) => number
  private readonly rascunhos = new Map<string, unknown>()
  private readonly numeros = new Map<string, number>()
  /** Esperando o debounce. */
  private readonly agendadas = new Map<string, { tarefa: Tarefa; relogio: ReturnType<typeof setTimeout> }>()
  /** Esperando nova tentativa automática. */
  private readonly repeticoes = new Map<string, ReturnType<typeof setTimeout>>()
  private readonly falhas = new Map<string, Tarefa>()
  /** Rascunhos guardados sem enviar (incompletos), com o motivo. */
  private readonly incompletos = new Map<string, string>()
  private fila: Tarefa[] = []
  private executando: Tarefa | null = null
  private erro: string | null = null
  private readonly ouvintes = new Set<() => void>()
  private versao = 0

  constructor(opcoes: OpcoesFila = {}) {
    this.tentativas = opcoes.tentativas ?? 3
    this.espera = opcoes.espera ?? ((tentativa) => 1000 * 2 ** (tentativa - 1))
  }

  /** Mostra `valor` na hora e grava com `enviar` depois de `atraso` ms (0 = já). */
  salvar<T>(chave: string, valor: T, enviar: (valor: T) => Promise<unknown>, atraso = 0): void {
    const numero = this.novoValor(chave, valor)

    const tarefa: Tarefa = { chave, valor, enviar: enviar as Enviar, numero, tentativa: 1 }
    if (atraso > 0) {
      const relogio = setTimeout(() => {
        this.agendadas.delete(chave)
        this.enfileirar(tarefa)
      }, atraso)
      this.agendadas.set(chave, { tarefa, relogio })
      this.avisar()
    } else {
      this.enfileirar(tarefa)
    }
  }

  /** Mostra `valor` na hora, sem enviar: ainda incompleto (`motivo` aparece no indicador). */
  guardar<T>(chave: string, valor: T, motivo: string): void {
    this.novoValor(chave, valor)
    this.incompletos.set(chave, motivo)
    this.avisar()
  }

  /** Esquece o campo: rascunho, espera e erro (ex.: linha nova apagada antes de gravar). */
  descartar(chave: string): void {
    this.novoValor(chave, undefined)
    this.rascunhos.delete(chave)
    this.avisar()
  }

  /** Novo valor do campo: cancela o que estava esperando e as falhas antigas; devolve o número da gravação. */
  private novoValor(chave: string, valor: unknown): number {
    const numero = (this.numeros.get(chave) ?? 0) + 1
    this.numeros.set(chave, numero)
    this.rascunhos.set(chave, valor)
    this.falhas.delete(chave)
    this.incompletos.delete(chave)
    this.cancelarRepeticao(chave)
    const agendada = this.agendadas.get(chave)
    if (agendada) clearTimeout(agendada.relogio)
    this.agendadas.delete(chave)
    this.fila = this.fila.filter((t) => t.chave !== chave)
    return numero
  }

  /** Valor otimista do campo (o que a tela mostra no lugar do valor do servidor), se houver. */
  rascunho<T = unknown>(chave: string): T | undefined {
    return this.rascunhos.get(chave) as T | undefined
  }

  /** O servidor confirmou `valorServidor`: some o rascunho igual, se nada mais está pendente no campo. */
  confirmar(chave: string, valorServidor: unknown): void {
    if (!this.rascunhos.has(chave) || this.pendente(chave)) return
    if (!iguais(this.rascunhos.get(chave), valorServidor)) return
    this.rascunhos.delete(chave)
    this.avisar()
  }

  /** Há gravação esperando, em andamento ou com erro (de um campo ou de qualquer um). */
  pendente(chave?: string): boolean {
    if (chave === undefined) {
      return (
        this.agendadas.size > 0 ||
        this.repeticoes.size > 0 ||
        this.falhas.size > 0 ||
        this.incompletos.size > 0 ||
        this.fila.length > 0 ||
        this.executando !== null
      )
    }
    return (
      this.agendadas.has(chave) ||
      this.incompletos.has(chave) ||
      this.repeticoes.has(chave) ||
      this.falhas.has(chave) ||
      this.fila.some((t) => t.chave === chave) ||
      this.executando?.chave === chave
    )
  }

  estado(): EstadoSalvamento {
    if (this.falhas.size > 0) return 'erro'
    if (this.incompletos.size > 0 && !this.ocupada()) return 'incompleto'
    return this.pendente() ? 'salvando' : 'salvo'
  }

  /** Mensagem do erro (ou do primeiro rascunho incompleto). */
  ultimoErro(): string | null {
    if (this.falhas.size > 0) return this.erro
    return this.incompletos.values().next().value ?? null
  }

  private ocupada(): boolean {
    return this.agendadas.size > 0 || this.repeticoes.size > 0 || this.fila.length > 0 || this.executando !== null
  }

  /** Reenvia as gravações com erro. */
  tentarDeNovo(): void {
    const falhas = [...this.falhas.values()]
    this.falhas.clear()
    for (const tarefa of falhas) this.enfileirar({ ...tarefa, tentativa: 1 })
    this.avisar()
  }

  /** Envia já o que esperava o debounce (ex.: ao sair da tela). */
  descarregar(): void {
    for (const { tarefa, relogio } of this.agendadas.values()) {
      clearTimeout(relogio)
      this.fila.push(tarefa)
    }
    this.agendadas.clear()
    void this.processar()
  }

  assinar(ouvinte: () => void): () => void {
    this.ouvintes.add(ouvinte)
    return () => this.ouvintes.delete(ouvinte)
  }

  /** Muda a cada alteração (para useSyncExternalStore). */
  instantaneo(): number {
    return this.versao
  }

  private enfileirar(tarefa: Tarefa): void {
    const i = this.fila.findIndex((t) => t.chave === tarefa.chave)
    if (i >= 0) this.fila[i] = tarefa
    else this.fila.push(tarefa)
    this.avisar()
    void this.processar()
  }

  private cancelarRepeticao(chave: string): void {
    const relogio = this.repeticoes.get(chave)
    if (relogio !== undefined) clearTimeout(relogio)
    this.repeticoes.delete(chave)
  }

  private async processar(): Promise<void> {
    if (this.executando) return
    const tarefa = this.fila.shift()
    if (!tarefa) return
    this.executando = tarefa
    this.avisar()
    try {
      await tarefa.enviar(tarefa.valor as never)
    } catch (e) {
      const atual = this.numeros.get(tarefa.chave) === tarefa.numero
      if (atual) {
        this.erro = mensagem(e)
        if (repetivel(e) && tarefa.tentativa < this.tentativas) {
          const relogio = setTimeout(() => {
            this.repeticoes.delete(tarefa.chave)
            this.enfileirar({ ...tarefa, tentativa: tarefa.tentativa + 1 })
          }, this.espera(tarefa.tentativa))
          this.repeticoes.set(tarefa.chave, relogio)
        } else {
          this.falhas.set(tarefa.chave, tarefa)
        }
      }
    } finally {
      this.executando = null
      this.avisar()
    }
    void this.processar()
  }

  private avisar(): void {
    this.versao += 1
    for (const ouvinte of this.ouvintes) ouvinte()
  }
}
