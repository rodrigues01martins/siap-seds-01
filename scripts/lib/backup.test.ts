import { GeoPoint, Timestamp } from 'firebase-admin/firestore'
import { describe, expect, it } from 'vitest'
import {
  FORMATO_BACKUP,
  caminhoRestauravel,
  codificar,
  conferirBackup,
  contarPorColecao,
  decodificar,
  montarBackup,
  nomeArquivoBackup,
} from './backup'

const instante = new Timestamp(1_791_000_000, 123_456_789)

describe('codificação dos valores do Firestore em JSON', () => {
  it('Timestamp, GeoPoint e bytes viram objetos marcados e voltam iguais', () => {
    const original = {
      criadoEm: instante,
      local: new GeoPoint(-16.68, -49.25),
      arquivo: Buffer.from('abc'),
      lista: [1, 'dois', null, { em: instante }],
      aninhado: { nivel: 3, decisao: 'maioria' },
    }
    const json = JSON.parse(JSON.stringify(codificar(original)))
    expect(json.criadoEm).toEqual({ __tipo: 'timestamp', segundos: 1_791_000_000, nanos: 123_456_789 })
    const volta = decodificar(json) as typeof original
    expect(volta.criadoEm).toBeInstanceOf(Timestamp)
    expect(volta.criadoEm.isEqual(instante)).toBe(true)
    expect(volta.local).toBeInstanceOf(GeoPoint)
    expect(volta.local.isEqual(new GeoPoint(-16.68, -49.25))).toBe(true)
    expect(Buffer.from(volta.arquivo).toString()).toBe('abc')
    expect((volta.lista[3] as { em: Timestamp }).em.isEqual(instante)).toBe(true)
    expect(volta.aninhado).toEqual({ nivel: 3, decisao: 'maioria' })
  })
})

describe('arquivo de backup', () => {
  const documentos = {
    'chamamentos/ch1': { numero: '001/2026' },
    'chamamentos/ch1/propostas/p1': { loteCodigo: 'L1' },
    'chamamentos/ch1/propostas/p1/avaliacoes/1.1': { nivel: 3 },
    'chamamentos/ch1/propostas/p1/avaliacoes/1.2': { nivel: 4 },
    'oscs/11222333000181': { razaoSocial: 'Instituto Alfa' },
    'auditoria/a1': { caminho: 'chamamentos/ch1' },
  }
  const backup = () =>
    montarBackup({ projeto: 'siap-seds-01', executor: 'github:rodrigues01martins', chamamentos: ['ch1'], documentos, geradoEm: new Date('2026-11-10T21:00:00Z') })

  it('cabeçalho com formato, origem, contagem por coleção e SHA-256 do conteúdo', () => {
    const b = backup()
    expect(b).toMatchObject({ formato: FORMATO_BACKUP, projeto: 'siap-seds-01', geradoEm: '2026-11-10T21:00:00.000Z', chamamentos: ['ch1'] })
    expect(b.contagem).toEqual({ chamamentos: 1, propostas: 1, avaliacoes: 2, oscs: 1, auditoria: 1 })
    expect(b.sha256).toMatch(/^[0-9a-f]{64}$/)
    expect(contarPorColecao(Object.keys(documentos))).toEqual(b.contagem)
  })

  it('conferirBackup aceita o arquivo íntegro e recusa formato estranho ou conteúdo alterado', () => {
    const b = JSON.parse(JSON.stringify(backup()))
    expect(conferirBackup(b).sha256).toBe(b.sha256)
    expect(() => conferirBackup({ ...b, formato: 'outro' })).toThrow(/formato/)
    b.documentos['chamamentos/ch1/propostas/p1/avaliacoes/1.1'].nivel = 4
    expect(() => conferirBackup(b)).toThrow(/SHA-256/)
  })

  it('só restaura caminhos de documento nas coleções do sistema', () => {
    expect(caminhoRestauravel('chamamentos/ch1/propostas/p1/avaliacoes/1.1')).toBe(true)
    expect(caminhoRestauravel('oscs/11222333000181')).toBe(true)
    expect(caminhoRestauravel('auditoria/a1')).toBe(true)
    expect(caminhoRestauravel('matrizes/2026')).toBe(true)
    expect(caminhoRestauravel('usuarios/u1')).toBe(false)
    expect(caminhoRestauravel('chamamentos/ch1/propostas')).toBe(false)
    expect(caminhoRestauravel('chamamentos/../x')).toBe(false)
  })

  it('nome datado do arquivo', () => {
    const data = new Date('2026-11-10T21:05:09Z')
    expect(nomeArquivoBackup('siap-seds-01', ['ch1'], data)).toBe('backup-siap-seds-01-ch1-2026-11-10T21-05-09Z.json')
    expect(nomeArquivoBackup('siap-seds-01', [], data)).toBe('backup-siap-seds-01-todos-2026-11-10T21-05-09Z.json')
  })
})
