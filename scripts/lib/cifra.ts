// Cifra dos arquivos de backup: AES-256-GCM com chave derivada da senha por scrypt.
// O repositório é público: o backup de produção só sai do runner cifrado (artifact do GitHub Actions).
// GCM autentica o conteúdo: senha errada ou arquivo alterado falham na decifragem, sem saída parcial.

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'

export const FORMATO_CIFRADO = 'siap-backup-cifrado/1'
export const SENHA_MINIMA = 16

const SCRYPT = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }

interface Envelope {
  formato: typeof FORMATO_CIFRADO
  algoritmo: 'aes-256-gcm'
  kdf: { nome: 'scrypt'; N: number; r: number; p: number; sal: string }
  iv: string
  tag: string
  dados: string
}

const chave = (senha: string, sal: Buffer) => scryptSync(senha, sal, 32, SCRYPT)

export function cifrar(texto: string, senha: string): string {
  const sal = randomBytes(16)
  const iv = randomBytes(12)
  const cifra = createCipheriv('aes-256-gcm', chave(senha, sal), iv)
  const dados = Buffer.concat([cifra.update(texto, 'utf8'), cifra.final()])
  const envelope: Envelope = {
    formato: FORMATO_CIFRADO,
    algoritmo: 'aes-256-gcm',
    kdf: { nome: 'scrypt', N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p, sal: sal.toString('base64') },
    iv: iv.toString('base64'),
    tag: cifra.getAuthTag().toString('base64'),
    dados: dados.toString('base64'),
  }
  return JSON.stringify(envelope)
}

export function estaCifrado(texto: string): boolean {
  try {
    return (JSON.parse(texto) as { formato?: unknown }).formato === FORMATO_CIFRADO
  } catch {
    return false
  }
}

export function decifrar(texto: string, senha: string): string {
  try {
    const e = JSON.parse(texto) as Envelope
    const sal = Buffer.from(e.kdf.sal, 'base64')
    const decifra = createDecipheriv('aes-256-gcm', scryptSync(senha, sal, 32, { N: e.kdf.N, r: e.kdf.r, p: e.kdf.p, maxmem: SCRYPT.maxmem }), Buffer.from(e.iv, 'base64'))
    decifra.setAuthTag(Buffer.from(e.tag, 'base64'))
    return Buffer.concat([decifra.update(Buffer.from(e.dados, 'base64')), decifra.final()]).toString('utf8')
  } catch {
    throw new Error('Senha incorreta ou arquivo corrompido.')
  }
}

/** Senha da variável BACKUP_SENHA (nunca por argumento de linha de comando, que fica no histórico). */
export function exigirSenha(valor: string | undefined): string {
  if (!valor) throw new Error('Defina a variável de ambiente BACKUP_SENHA com a senha do backup.')
  if (valor.length < SENHA_MINIMA) throw new Error(`BACKUP_SENHA deve ter ao menos ${SENHA_MINIMA} caracteres.`)
  return valor
}
