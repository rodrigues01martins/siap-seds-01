import { describe, expect, it } from 'vitest'
import { cifrar, decifrar, estaCifrado, exigirSenha } from './cifra'

const SENHA = 'senha-longa-de-teste-123'

describe('cifra do backup (AES-256-GCM, chave derivada por scrypt)', () => {
  it('decifra o que cifrou, com a mesma senha', () => {
    const envelope = cifrar('{"dados":"Instituto Alfa"}', SENHA)
    expect(estaCifrado(envelope)).toBe(true)
    expect(envelope).not.toContain('Instituto Alfa')
    expect(decifrar(envelope, SENHA)).toBe('{"dados":"Instituto Alfa"}')
  })

  it('cada cifragem usa sal e vetor novos (mesmo texto → envelopes diferentes)', () => {
    expect(cifrar('x', SENHA)).not.toBe(cifrar('x', SENHA))
  })

  it('senha errada ou arquivo alterado: erro claro, sem devolver nada', () => {
    const envelope = cifrar('conteúdo', SENHA)
    expect(() => decifrar(envelope, 'outra-senha-de-teste-456')).toThrow('Senha incorreta ou arquivo corrompido.')
    const adulterado = JSON.parse(envelope) as { dados: string }
    adulterado.dados = Buffer.from('outro conteúdo').toString('base64')
    expect(() => decifrar(JSON.stringify(adulterado), SENHA)).toThrow('Senha incorreta ou arquivo corrompido.')
  })

  it('JSON comum não é tratado como cifrado', () => {
    expect(estaCifrado('{"formato":"siap-backup/1"}')).toBe(false)
    expect(estaCifrado('não é json')).toBe(false)
  })

  it('exige senha de ao menos 16 caracteres, sem ecoá-la no erro', () => {
    expect(exigirSenha(SENHA)).toBe(SENHA)
    expect(() => exigirSenha(undefined)).toThrow(/BACKUP_SENHA/)
    expect(() => exigirSenha('curta-123')).toThrow(expect.objectContaining({ message: expect.not.stringContaining('curta-123') }))
    expect(() => exigirSenha('curta-123')).toThrow(/16 caracteres/)
  })
})
