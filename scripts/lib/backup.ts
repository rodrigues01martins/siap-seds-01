// Formato do arquivo de backup (JSON datado) e conversão dos tipos do Firestore.
// O backup é lido pelo firebase-admin, documento a documento (não usa o export gerenciado,
// que exige o plano Blaze). Cada documento fica no mapa `documentos`, pelo caminho completo.

import { createHash } from 'node:crypto'
import { DocumentReference, GeoPoint, Timestamp, type Firestore } from 'firebase-admin/firestore'
import { serializarCanonico } from '../../src/relatorios/verificacao'

export const FORMATO_BACKUP = 'siap-backup/1'

export type DadosDocumento = Record<string, unknown>

export interface Backup {
  formato: typeof FORMATO_BACKUP
  projeto: string
  geradoEm: string
  executor: string
  /** Chamamentos exportados (árvores completas). */
  chamamentos: string[]
  /** Documentos por coleção (último segmento de coleção do caminho). */
  contagem: Record<string, number>
  /** SHA-256 da serialização canônica de `documentos` (confere a integridade na restauração). */
  sha256: string
  documentos: Record<string, DadosDocumento>
}

/** Coleções de primeiro nível que entram no backup e podem ser restauradas. */
export const RAIZES = ['chamamentos', 'oscs', 'matrizes', 'auditoria'] as const

/** Valor do Firestore → JSON (Timestamp, GeoPoint, referência e bytes viram objetos marcados com __tipo). */
export function codificar(valor: unknown): unknown {
  if (valor === null || valor === undefined) return null
  if (valor instanceof Timestamp) return { __tipo: 'timestamp', segundos: valor.seconds, nanos: valor.nanoseconds }
  if (valor instanceof GeoPoint) return { __tipo: 'geoponto', latitude: valor.latitude, longitude: valor.longitude }
  if (valor instanceof DocumentReference) return { __tipo: 'referencia', caminho: valor.path }
  if (valor instanceof Uint8Array) return { __tipo: 'bytes', base64: Buffer.from(valor).toString('base64') }
  if (Array.isArray(valor)) return valor.map(codificar)
  if (typeof valor === 'object') {
    return Object.fromEntries(Object.entries(valor).map(([chave, v]) => [chave, codificar(v)]))
  }
  return valor
}

/** JSON do backup → valores do Firestore (inverso de codificar). Referências exigem o `db`. */
export function decodificar(valor: unknown, db?: Firestore): unknown {
  if (valor === null || typeof valor !== 'object') return valor
  if (Array.isArray(valor)) return valor.map((v) => decodificar(v, db))
  const objeto = valor as Record<string, unknown>
  switch (objeto.__tipo) {
    case 'timestamp':
      return new Timestamp(objeto.segundos as number, objeto.nanos as number)
    case 'geoponto':
      return new GeoPoint(objeto.latitude as number, objeto.longitude as number)
    case 'bytes':
      return Buffer.from(objeto.base64 as string, 'base64')
    case 'referencia':
      if (!db) throw new Error('Referência a documento no backup: informe o Firestore para decodificar.')
      return db.doc(objeto.caminho as string)
    default:
      return Object.fromEntries(Object.entries(objeto).map(([chave, v]) => [chave, decodificar(v, db)]))
  }
}

/** Quantos documentos há de cada coleção (pelo nome da coleção do documento). */
export function contarPorColecao(caminhos: string[]): Record<string, number> {
  const contagem: Record<string, number> = {}
  for (const caminho of caminhos) {
    const segmentos = caminho.split('/')
    const colecao = segmentos[segmentos.length - 2]!
    contagem[colecao] = (contagem[colecao] ?? 0) + 1
  }
  return contagem
}

const resumo = (documentos: Record<string, DadosDocumento>) => createHash('sha256').update(serializarCanonico(documentos)).digest('hex')

export function montarBackup({
  projeto,
  executor,
  chamamentos,
  documentos,
  geradoEm,
}: {
  projeto: string
  executor: string
  chamamentos: string[]
  /** Já codificados (codificar). */
  documentos: Record<string, DadosDocumento>
  geradoEm: Date
}): Backup {
  return {
    formato: FORMATO_BACKUP,
    projeto,
    geradoEm: geradoEm.toISOString(),
    executor,
    chamamentos,
    contagem: contarPorColecao(Object.keys(documentos)),
    sha256: resumo(documentos),
    documentos,
  }
}

/** Confere formato, caminhos e integridade (SHA-256) do backup lido do arquivo. */
export function conferirBackup(conteudo: unknown): Backup {
  const b = conteudo as Partial<Backup> | null
  if (!b || b.formato !== FORMATO_BACKUP) throw new Error(`Arquivo não é um backup do SIAP (formato esperado: ${FORMATO_BACKUP}).`)
  if (!b.documentos || typeof b.documentos !== 'object' || !Array.isArray(b.chamamentos)) throw new Error('Backup incompleto.')
  const invalido = Object.keys(b.documentos).find((c) => !caminhoRestauravel(c))
  if (invalido) throw new Error(`Caminho fora das coleções do sistema no backup: ${invalido}`)
  if (resumo(b.documentos) !== b.sha256) throw new Error('O SHA-256 do conteúdo não confere: arquivo alterado ou corrompido.')
  return b as Backup
}

const SEGMENTO = /^[A-Za-z0-9_.-]{1,128}$/

/** Caminho de documento (nº par de segmentos) numa das coleções do sistema. */
export function caminhoRestauravel(caminho: string): boolean {
  const segmentos = caminho.split('/')
  return (
    segmentos.length % 2 === 0 &&
    (RAIZES as readonly string[]).includes(segmentos[0]!) &&
    segmentos.every((s) => SEGMENTO.test(s) && s !== '.' && s !== '..')
  )
}

/** backup-<projeto>-<chamamentos|todos>-<AAAA-MM-DDTHH-MM-SSZ>.json */
export function nomeArquivoBackup(projeto: string, chamamentos: string[], data: Date): string {
  const quando = data.toISOString().replace(/\.\d{3}Z$/, 'Z').replace(/:/g, '-')
  return `backup-${projeto}-${chamamentos.length > 0 ? chamamentos.join('+') : 'todos'}-${quando}.json`
}
