// Scripts da Etapa 7 contra o emulador do Firestore: backup → restauração e ensaio.

import { Timestamp } from 'firebase-admin/firestore'
import { beforeEach, describe, expect, it } from 'vitest'
import { obterAdmin } from '../../api/_lib/admin'
import { codificar, decodificar, montarBackup, conferirBackup } from '../../scripts/lib/backup'
import { CHAMAMENTO_ENSAIO, montarEnsaio } from '../../scripts/lib/ensaio'
import { exportarChamamentos, gravarDocumentos, removerEnsaio, restaurarDocumentos } from '../../scripts/lib/firestore'
import { limparFirestore } from './apoio'

beforeEach(limparFirestore)

async function semear() {
  const { db } = obterAdmin()
  const em = Timestamp.fromDate(new Date('2026-11-10T13:00:00Z'))
  await db.doc('chamamentos/ch1').set({ numero: '001/2026', lotes: [{ codigo: 'L1', descricao: 'Lote 1' }], criadoEm: em })
  await db.doc('chamamentos/ch1/propostas/p1').set({ loteCodigo: 'L1', oscCnpj: '11222333000181', totais: { nf: 90 } })
  await db.doc('chamamentos/ch1/propostas/p1/avaliacoes/1.1').set({ nivel: 3, sessaoId: 's1' })
  await db.doc('chamamentos/ch1/propostas/p1/resultadoD2/atual').set({ total: 6 })
  await db.doc('chamamentos/ch1/sessoes/s1').set({ data: '2026-11-10', status: 'encerrada' })
  await db.doc('chamamentos/ch1/desempates/L1--p1-p2').set({ nf: 90 })
  await db.doc('chamamentos/ch2').set({ numero: '002/2026' })
  await db.doc('oscs/11222333000181').set({ razaoSocial: 'Instituto Alfa' })
  await db.doc('oscs/99999999000191').set({ razaoSocial: 'OSC de outro chamamento' })
  await db.doc('matrizes/2026').set({ versao: '2026' })
  await db.doc('auditoria/a1').set({ caminho: 'chamamentos/ch1/propostas/p1/avaliacoes/1.1', dataHora: em })
  await db.doc('auditoria/a2').set({ caminho: 'oscs/11222333000181', dataHora: em })
  await db.doc('auditoria/a3').set({ caminho: 'chamamentos/ch2', dataHora: em })
  await db.doc('auditoria/a4').set({ caminho: 'chamamentos/ch10', dataHora: em })
}

describe('backup do chamamento (firebase-admin, sem export gerenciado)', () => {
  it('exporta a árvore do chamamento, as OSCs das propostas, a matriz e a auditoria correspondente', async () => {
    await semear()
    const { chamamentos, documentos } = await exportarChamamentos(obterAdmin().db, ['ch1'])
    expect(chamamentos).toEqual(['ch1'])
    expect(Object.keys(documentos).sort()).toEqual(
      [
        'auditoria/a1',
        'auditoria/a2',
        'chamamentos/ch1',
        'chamamentos/ch1/desempates/L1--p1-p2',
        'chamamentos/ch1/propostas/p1',
        'chamamentos/ch1/propostas/p1/avaliacoes/1.1',
        'chamamentos/ch1/propostas/p1/resultadoD2/atual',
        'chamamentos/ch1/sessoes/s1',
        'matrizes/2026',
        'oscs/11222333000181',
      ].sort(),
    )
  })

  it('sem chamamento informado, exporta todos', async () => {
    await semear()
    const { chamamentos } = await exportarChamamentos(obterAdmin().db)
    expect(chamamentos.sort()).toEqual(['ch1', 'ch2'])
  })

  it('chamamento inexistente: erro', async () => {
    await expect(exportarChamamentos(obterAdmin().db, ['nao-existe'])).rejects.toThrow(/nao-existe/)
  })

  it('backup → apagar → restaurar devolve os mesmos documentos (inclusive Timestamps)', async () => {
    await semear()
    const { db } = obterAdmin()
    const exportado = await exportarChamamentos(db, ['ch1'])
    const arquivo = JSON.parse(
      JSON.stringify(montarBackup({ projeto: 'demo', executor: 'teste', chamamentos: ['ch1'], documentos: codificar(exportado.documentos) as never, geradoEm: new Date() })),
    )
    await limparFirestore()

    const backup = conferirBackup(arquivo)
    const gravados = await restaurarDocumentos(db, decodificar(backup.documentos) as never, backup.chamamentos, { substituir: false })
    expect(gravados).toBe(10)
    const ch = (await db.doc('chamamentos/ch1').get()).data()!
    expect((ch.criadoEm as Timestamp).toDate().toISOString()).toBe('2026-11-10T13:00:00.000Z')
    expect((await db.doc('chamamentos/ch1/propostas/p1/avaliacoes/1.1').get()).data()).toEqual({ nivel: 3, sessaoId: 's1' })
    expect((await exportarChamamentos(db, ['ch1'])).documentos).toEqual(exportado.documentos)
  })

  it('restauração não sobrescreve chamamento existente sem --substituir; com ele, apaga a árvore antes', async () => {
    await semear()
    const { db } = obterAdmin()
    const exportado = await exportarChamamentos(db, ['ch1'])
    await expect(restaurarDocumentos(db, exportado.documentos, ['ch1'], { substituir: false })).rejects.toThrow(/já existe/)

    await db.doc('chamamentos/ch1/propostas/p-extra').set({ loteCodigo: 'L1' })
    await restaurarDocumentos(db, exportado.documentos, ['ch1'], { substituir: true })
    expect((await db.doc('chamamentos/ch1/propostas/p-extra').get()).exists).toBe(false)
    expect((await db.doc('chamamentos/ch1/propostas/p1').get()).exists).toBe(true)
  })
})

describe('ensaio no Firestore', () => {
  it('grava o ensaio e o remove por inteiro (chamamento e OSCs marcadas)', async () => {
    const { db } = obterAdmin()
    await db.doc('oscs/11222333000181').set({ razaoSocial: 'OSC real' })
    const ensaio = montarEnsaio('2026-11-10')
    await gravarDocumentos(db, ensaio.documentos)
    const exportado = await exportarChamamentos(db, [CHAMAMENTO_ENSAIO])
    const doEnsaio = Object.keys(exportado.documentos).filter((c) => !c.startsWith('matrizes/') && !c.startsWith('auditoria/'))
    expect(doEnsaio.sort()).toEqual(Object.keys(ensaio.documentos).sort())

    await removerEnsaio(db)
    expect((await db.doc(`chamamentos/${CHAMAMENTO_ENSAIO}`).get()).exists).toBe(false)
    expect((await db.collection(`chamamentos/${CHAMAMENTO_ENSAIO}/propostas`).get()).size).toBe(0)
    for (const cnpj of ensaio.oscs) expect((await db.doc(`oscs/${cnpj}`).get()).exists).toBe(false)
    expect((await db.doc('oscs/11222333000181').get()).exists).toBe(true)
  })
})
