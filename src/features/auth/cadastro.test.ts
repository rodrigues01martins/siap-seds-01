import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { acompanharCadastro, type EstadoCadastro, type FontesCadastro } from './cadastro'

const ADMIN = { email: 'a@goias.gov.br', nome: 'Ana', admin: true, ativo: true, permissoes: [] }

function montar(fontes: Partial<FontesCadastro> = {}) {
  let entregar: (dados: Record<string, unknown> | undefined) => void = () => {}
  let falhar: (erro: unknown) => void = () => {}
  const estados: EstadoCadastro[] = []
  const completas: FontesCadastro = {
    ouvir: (aoReceber, aoFalhar) => {
      entregar = aoReceber
      falhar = aoFalhar
      return () => {}
    },
    pedirPrimeiroAcesso: vi.fn().mockResolvedValue(undefined),
    lerDoServidor: vi.fn().mockResolvedValue(ADMIN),
    ...fontes,
  }
  const parar = acompanharCadastro(completas, (e) => estados.push(e), 20_000)
  return { estados, ultimo: () => estados.at(-1), entregar: (d?: Record<string, unknown>) => entregar(d), falhar: (e: unknown) => falhar(e), fontes: completas, parar }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('acompanharCadastro (usuarios/{uid} ao entrar no app)', () => {
  it('cadastro com acesso: pronto, sem chamar o servidor', () => {
    const t = montar()
    t.entregar(ADMIN)
    expect(t.ultimo()).toEqual({ carregando: false, acesso: { admin: true, ativo: true, permissoes: [] }, nome: 'Ana', erro: null })
    expect(t.fontes.pedirPrimeiroAcesso).not.toHaveBeenCalled()
  })

  it('sem acesso: pede o primeiro acesso e usa o cadastro relido do servidor (não espera nova notificação)', async () => {
    const t = montar()
    t.entregar(undefined)
    await vi.advanceTimersByTimeAsync(0)
    expect(t.fontes.pedirPrimeiroAcesso).toHaveBeenCalledTimes(1)
    expect(t.ultimo()).toMatchObject({ carregando: false, acesso: { admin: true }, erro: null })
  })

  it('servidor recusa (403): sai do carregando e mostra o motivo', async () => {
    const t = montar({ pedirPrimeiroAcesso: vi.fn().mockRejectedValue(new Error('Sua conta ainda não tem acesso.')) })
    t.entregar(undefined)
    await vi.advanceTimersByTimeAsync(0)
    expect(t.ultimo()).toEqual({ carregando: false, acesso: null, nome: null, erro: 'Sua conta ainda não tem acesso.' })
  })

  it('servidor não responde: em 20 s sai do carregando com aviso de tempo esgotado', async () => {
    const t = montar({ pedirPrimeiroAcesso: () => new Promise(() => {}) })
    t.entregar(undefined)
    await vi.advanceTimersByTimeAsync(19_999)
    expect(t.ultimo()?.carregando).not.toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(t.ultimo()).toMatchObject({ carregando: false, acesso: null, erro: expect.stringMatching(/não respondeu/) })
  })

  it('o cadastro nunca chega (Firestore sem conexão): em 20 s sai do carregando com aviso', async () => {
    const t = montar()
    await vi.advanceTimersByTimeAsync(20_000)
    expect(t.ultimo()).toMatchObject({ carregando: false, acesso: null, erro: expect.stringMatching(/Firestore/) })
    t.entregar(ADMIN) // chegou atrasado: entra normalmente
    expect(t.ultimo()).toMatchObject({ carregando: false, acesso: { admin: true }, erro: null })
  })

  it('erro de leitura do cadastro: sai do carregando com o motivo', () => {
    const t = montar()
    t.falhar({ code: 'permission-denied' })
    expect(t.ultimo()).toMatchObject({ carregando: false, acesso: null, erro: expect.stringMatching(/permission-denied/) })
  })

  it('pede o primeiro acesso uma vez só; depois, liberação pelo administrador entra na hora', async () => {
    const t = montar({ pedirPrimeiroAcesso: vi.fn().mockRejectedValue(new Error('sem acesso')) })
    t.entregar({ email: 'x@y.z', permissoes: [] })
    await vi.advanceTimersByTimeAsync(0)
    t.entregar({ email: 'x@y.z', permissoes: [] })
    expect(t.fontes.pedirPrimeiroAcesso).toHaveBeenCalledTimes(1)
    t.entregar({ email: 'x@y.z', permissoes: ['consultar'] })
    expect(t.ultimo()).toMatchObject({ carregando: false, acesso: { permissoes: ['consultar'] }, erro: null })
  })
})
