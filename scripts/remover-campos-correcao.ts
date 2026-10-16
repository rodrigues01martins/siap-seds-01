// Manutenção 1: apaga dos chamamentos já gravados os campos de correção monetária que saíram do sistema
// (indiceCorrecao e dataBaseCorrecao). Cada chamamento alterado ganha um registro em /auditoria com os
// valores antigos. Use --simular primeiro: só lista o que seria alterado, sem gravar nada.
//
// Uso: FIREBASE_SERVICE_ACCOUNT='{...}' npm run remover-campos-correcao -- --projeto dev --simular
//      FIREBASE_SERVICE_ACCOUNT='{...}' npm run remover-campos-correcao -- --projeto dev
//      (prod exige --confirmar também na gravação)

import { parseArgs } from 'node:util'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { executar, iniciarAdmin } from './lib/admin'
import { registroDeScript } from './lib/auditoria'
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
  // Lotes de até 200 chamamentos (2 gravações cada: o documento e a auditoria; limite do Firestore: 500).
  for (let i = 0; i < plano.length; i += 200) {
    const lote = db.batch()
    for (const p of plano.slice(i, i + 200)) {
      const caminho = `chamamentos/${p.id}`
      lote.update(db.doc(caminho), {
        ...Object.fromEntries(p.campos.map((c) => [c, FieldValue.delete()])),
        atualizadoEm: FieldValue.serverTimestamp(),
      })
      lote.create(
        db.collection('auditoria').doc(),
        registroDeScript({
          acao: 'editar',
          caminho,
          antes: p.antes,
          detalhes: { camposRemovidos: p.campos, motivo: 'Manutenção 1: índice de correção e data-base removidos do chamamento' },
          origem: 'scripts/remover-campos-correcao.ts',
          executor,
        }),
      )
    }
    await lote.commit()
  }
  console.log(`Campos removidos de ${plano.length} chamamento(s) e registrados na auditoria.`)
})
