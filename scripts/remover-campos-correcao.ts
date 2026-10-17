// Manutenção 1: apaga dos chamamentos já gravados os campos de correção monetária que saíram do sistema
// (indiceCorrecao e dataBaseCorrecao). Os valores antigos são listados no terminal; o chamamento guarda
// atualizadoPor (o script) e atualizadoEm. Use --simular primeiro: só lista o que seria alterado, sem gravar nada.
//
// Uso: FIREBASE_SERVICE_ACCOUNT='{...}' npm run remover-campos-correcao -- --projeto dev --simular
//      FIREBASE_SERVICE_ACCOUNT='{...}' npm run remover-campos-correcao -- --projeto dev
//      (prod exige --confirmar também na gravação)

import { parseArgs } from 'node:util'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { executar, iniciarAdmin } from './lib/admin'
import { autoriaDeScript } from './lib/autoria'
import { planejarRemocao } from './lib/correcao'

executar(async () => {
  const { values } = parseArgs({
    options: {
      projeto: { type: 'string' },
      simular: { type: 'boolean', default: false },
      confirmar: { type: 'boolean', default: false },
    },
  })
  // Simular não grava: dispensa o --confirmar da produção.
  const { app, executor } = iniciarAdmin(values.projeto, values.confirmar || values.simular)
  const db = getFirestore(app)

  const documentos = await db.collection('chamamentos').get()
  const plano = planejarRemocao(documentos.docs.map((d) => ({ id: d.id, dados: d.data() })))
  console.log(`Chamamentos lidos: ${documentos.size}. Com campos de correção: ${plano.length}.`)
  for (const p of plano) console.log(`- chamamentos/${p.id}: ${p.campos.map((c) => `${c}=${JSON.stringify(p.antes[c])}`).join(', ')}`)

  if (values.simular) {
    console.log('Simulação: nada foi gravado. Rode sem --simular para apagar esses campos.')
    return
  }
  if (plano.length === 0) {
    console.log('Nada a fazer.')
    return
  }
  // Lotes de até 400 chamamentos (limite do Firestore: 500 gravações por lote).
  for (let i = 0; i < plano.length; i += 400) {
    const lote = db.batch()
    for (const p of plano.slice(i, i + 400)) {
      lote.update(db.doc(`chamamentos/${p.id}`), {
        ...Object.fromEntries(p.campos.map((c) => [c, FieldValue.delete()])),
        ...autoriaDeScript('scripts/remover-campos-correcao.ts', executor),
      })
    }
    await lote.commit()
  }
  console.log(`Campos removidos de ${plano.length} chamamento(s).`)
})
