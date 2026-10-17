// Fila do salvamento automático (Simplificação 3/4): a tela muda na hora (rascunho otimista) e a gravação na /api
// vem em seguida — debounce para textos, imediato para níveis —, uma por vez, com nova tentativa automática.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErroApi } from './api'
import { FilaSalvamento } from './salvamento'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

const ok = () => vi.fn().mockResolvedValue(undefined)

describe('FilaSalvamento — otimista e debounce', () => {
  it('o rascunho aparece na hora; a gravação imediata sai já, a com atraso só depois do debounce', async () => {
    const fila = new FilaSalvamento()
    const enviarNivel = ok()
    const enviarTexto = ok()
    fila.salvar('nivel', 3, enviarNivel)
    fila.salvar('texto', 'Fun', enviarTexto, 800)
    expect(fila.rascunho('nivel')).toBe(3)
    expect(fila.rascunho('texto')).toBe('Fun')
    expect(fila.estado()).toBe('salvando')

    await vi.advanceTimersByTimeAsync(0)
    expect(enviarNivel).toHaveBeenCalledWith(3)
    expect(enviarTexto).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(799)
    expect(enviarTexto).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(enviarTexto).toHaveBeenCalledWith('Fun')
    await vi.advanceTimersByTimeAsync(0)
    expect(fila.estado()).toBe('salvo')
    expect(fila.pendente()).toBe(false)
  })

  it('digitação contínua: só o último texto é enviado (o debounce recomeça a cada tecla)', async () => {
    const fila = new FilaSalvamento()
    const enviar = ok()
    for (const texto of ['F', 'Fu', 'Fun', 'Fund']) {
      fila.salvar('texto', texto, enviar, 800)
      await vi.advanceTimersByTimeAsync(500)
    }
    await vi.advanceTimersByTimeAsync(800)
    expect(enviar).toHaveBeenCalledTimes(1)
    expect(enviar).toHaveBeenCalledWith('Fund')
  })

  it('uma gravação por vez, na ordem; enquanto uma está em andamento, a próxima do mesmo campo espera', async () => {
    const fila = new FilaSalvamento()
    const ordem: string[] = []
    let liberar!: () => void
    const lenta = vi.fn(() => new Promise<void>((r) => (liberar = () => (ordem.push('lenta'), r()))))
    const rapida = vi.fn(async (v: number) => void ordem.push(`rapida ${v}`))
    fila.salvar('a', 1, lenta)
    await vi.advanceTimersByTimeAsync(0)
    fila.salvar('b', 2, rapida)
    fila.salvar('a', 3, rapida)
    await vi.advanceTimersByTimeAsync(0)
    expect(rapida).not.toHaveBeenCalled()
    liberar()
    await vi.advanceTimersByTimeAsync(0)
    expect(ordem).toEqual(['lenta', 'rapida 2', 'rapida 3'])
  })

  it('descarregar envia na hora o que esperava o debounce (ao sair da tela)', async () => {
    const fila = new FilaSalvamento()
    const enviar = ok()
    fila.salvar('texto', 'Fundamentação', enviar, 800)
    fila.descarregar()
    await vi.advanceTimersByTimeAsync(0)
    expect(enviar).toHaveBeenCalledWith('Fundamentação')
  })
})

describe('FilaSalvamento — erro e nova tentativa', () => {
  it('falha de rede: tenta de novo sozinha (1 s, 2 s) e grava', async () => {
    const fila = new FilaSalvamento()
    const enviar = vi
      .fn()
      .mockRejectedValueOnce(new ErroApi(0, 'Sem conexão com o servidor.'))
      .mockRejectedValueOnce(new ErroApi(503, 'Indisponível.'))
      .mockResolvedValue(undefined)
    fila.salvar('nivel', 2, enviar)
    await vi.advanceTimersByTimeAsync(0)
    expect(fila.estado()).toBe('salvando')
    await vi.advanceTimersByTimeAsync(1000)
    expect(enviar).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(2000)
    expect(enviar).toHaveBeenCalledTimes(3)
    expect(fila.estado()).toBe('salvo')
  })

  it('esgotadas as tentativas: "erro", o rascunho fica na tela e "tentar de novo" reenvia', async () => {
    const fila = new FilaSalvamento({ tentativas: 2 })
    const enviar = vi.fn().mockRejectedValue(new ErroApi(0, 'Sem conexão com o servidor.'))
    fila.salvar('nivel', 2, enviar)
    await vi.advanceTimersByTimeAsync(5000)
    expect(enviar).toHaveBeenCalledTimes(2)
    expect(fila.estado()).toBe('erro')
    expect(fila.ultimoErro()).toBe('Sem conexão com o servidor.')
    expect(fila.rascunho('nivel')).toBe(2)
    expect(fila.pendente()).toBe(true)

    enviar.mockResolvedValue(undefined)
    fila.tentarDeNovo()
    await vi.advanceTimersByTimeAsync(0)
    expect(enviar).toHaveBeenCalledTimes(3)
    expect(fila.estado()).toBe('salvo')
  })

  it('recusa da /api (400/409) não se repete: vai direto para "erro" com a mensagem', async () => {
    const fila = new FilaSalvamento()
    const enviar = vi.fn().mockRejectedValue(new ErroApi(409, 'Avaliação só pode ser registrada em sessão aberta da Comissão.'))
    fila.salvar('nivel', 2, enviar)
    await vi.advanceTimersByTimeAsync(10_000)
    expect(enviar).toHaveBeenCalledTimes(1)
    expect(fila.estado()).toBe('erro')
    expect(fila.ultimoErro()).toBe('Avaliação só pode ser registrada em sessão aberta da Comissão.')
  })

  it('um valor novo para o campo com erro substitui a falha antiga', async () => {
    const fila = new FilaSalvamento()
    const falha = vi.fn().mockRejectedValue(new ErroApi(400, 'Página 9 acima do limite.'))
    fila.salvar('paginas', [9], falha)
    await vi.advanceTimersByTimeAsync(0)
    expect(fila.estado()).toBe('erro')
    const enviar = ok()
    fila.salvar('paginas', [8], enviar)
    await vi.advanceTimersByTimeAsync(0)
    expect(enviar).toHaveBeenCalledWith([8])
    expect(fila.estado()).toBe('salvo')
  })
})

describe('FilaSalvamento — rascunho some quando o servidor confirma', () => {
  it('confirmar limpa o rascunho só se o valor do servidor é o mesmo e nada está pendente', async () => {
    const fila = new FilaSalvamento()
    fila.salvar('texto', 'Fundamentação', ok(), 800)
    fila.confirmar('texto', 'Fundamentação')
    expect(fila.rascunho('texto')).toBe('Fundamentação')
    await vi.advanceTimersByTimeAsync(800)
    fila.confirmar('texto', 'Outro valor')
    expect(fila.rascunho('texto')).toBe('Fundamentação')
    fila.confirmar('texto', 'Fundamentação')
    expect(fila.rascunho('texto')).toBeUndefined()
  })

  it('avisa quem assina a cada mudança (para a tela redesenhar)', async () => {
    const fila = new FilaSalvamento()
    const ouvinte = vi.fn()
    const parar = fila.assinar(ouvinte)
    fila.salvar('nivel', 1, ok())
    expect(ouvinte).toHaveBeenCalled()
    const chamadas = ouvinte.mock.calls.length
    await vi.advanceTimersByTimeAsync(0)
    expect(ouvinte.mock.calls.length).toBeGreaterThan(chamadas)
    parar()
  })
})

describe('FilaSalvamento — rascunho incompleto (não enviado)', () => {
  it('guardar: a tela mostra o valor, nada é enviado e o estado é "incompleto" (aviso ao sair)', async () => {
    const fila = new FilaSalvamento()
    fila.guardar('exp:nova', { descricao: 'Sem início' }, 'Informe o início.')
    expect(fila.rascunho('exp:nova')).toEqual({ descricao: 'Sem início' })
    expect(fila.estado()).toBe('incompleto')
    expect(fila.pendente()).toBe(true)
    expect(fila.ultimoErro()).toBe('Informe o início.')

    const enviar = ok()
    fila.salvar('exp:nova', { descricao: 'Com início', inicio: '2020-01-01' }, enviar)
    await vi.advanceTimersByTimeAsync(0)
    expect(enviar).toHaveBeenCalled()
    expect(fila.estado()).toBe('salvo')
  })

  it('guardar cancela a gravação que esperava o debounce do mesmo campo', async () => {
    const fila = new FilaSalvamento()
    const enviar = ok()
    fila.salvar('exp:1', { descricao: 'A' }, enviar, 800)
    fila.guardar('exp:1', { descricao: '' }, 'Informe a descrição.')
    await vi.advanceTimersByTimeAsync(1000)
    expect(enviar).not.toHaveBeenCalled()
  })

  it('descartar: some o rascunho e o pendente do campo (ex.: linha nova apagada)', () => {
    const fila = new FilaSalvamento()
    fila.guardar('exp:nova', { descricao: '' }, 'Informe a descrição.')
    fila.descartar('exp:nova')
    expect(fila.rascunho('exp:nova')).toBeUndefined()
    expect(fila.estado()).toBe('salvo')
  })
})

