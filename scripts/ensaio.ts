// Ensaio da sessão no projeto DEV: grava 1 chamamento, 2 lotes, 3 OSCs e 6 propostas fictícias
// (apta, inapta, desclassificada, não admitida, pendente e empate) — ver scripts/lib/ensaio.ts.
// Nunca roda em prod. --recriar apaga o ensaio anterior; --remover só apaga.
//
// Uso: FIREBASE_SERVICE_ACCOUNT='{...}' npm run ensaio -- --projeto dev [--recriar | --remover]

import { parseArgs } from 'node:util'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { hojeEmGoias } from '../src/esquemas/base'
import { executar, iniciarAdmin } from './lib/admin'
import { registroDeScript } from './lib/auditoria'
import { CHAMAMENTO_ENSAIO, montarEnsaio } from './lib/ensaio'
import { gravarDocumentos, removerEnsaio } from './lib/firestore'

executar(async () => {
  const { values } = parseArgs({
    options: {
      projeto: { type: 'string' },
      recriar: { type: 'boolean', default: false },
      remover: { type: 'boolean', default: false },
    },
  })
  if (values.projeto !== 'dev') throw new Error('O ensaio só roda no projeto dev (--projeto dev).')
  const { app, executor } = iniciarAdmin('dev', false)
  const db = getFirestore(app)
  const caminho = `chamamentos/${CHAMAMENTO_ENSAIO}`
  const auditar = (acao: string, detalhes: Record<string, unknown>) =>
    db.collection('auditoria').doc().create(registroDeScript({ acao, caminho, detalhes, origem: 'scripts/ensaio.ts', executor }))

  const existe = (await db.doc(caminho).get()).exists
  if (values.remover || values.recriar) {
    const { oscs } = await removerEnsaio(db)
    await auditar('ensaio.removido', { oscs })
    console.log(`Ensaio removido (${caminho} e ${oscs} OSCs de ensaio).`)
    if (values.remover) return
  } else if (existe) {
    throw new Error(`${caminho} já existe. Use --recriar para apagar e gravar de novo, ou --remover para só apagar.`)
  }

  const ensaio = montarEnsaio(hojeEmGoias())
  const agora = FieldValue.serverTimestamp()
  const comDatas = Object.fromEntries(
    Object.entries(ensaio.documentos).map(([c, d]) => [c, c.includes('/resultadoD2/') ? d : { ...d, criadoEm: agora, atualizadoEm: agora }]),
  )
  const gravados = await gravarDocumentos(db, comDatas)
  await auditar('ensaio.populado', { documentos: gravados, propostas: ensaio.propostas.map((p) => p.id) })

  console.log(`Ensaio gravado no dev: ${gravados} documentos em ${caminho}.`)
  console.table(ensaio.propostas.map((p) => ({ proposta: p.id, lote: p.lote, osc: p.osc, esperado: p.esperado })))
  console.log('Empate: ensaio-l1-beta e ensaio-l1-gama (mesma NF no lote L1).')
})
