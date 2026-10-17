// Ensaio da sessão no projeto DEV: grava 1 chamamento, 2 lotes, 3 OSCs e 6 propostas fictícias
// (apta, inapta, desclassificada, não admitida, pendente e empate) — ver scripts/lib/ensaio.ts.
// Nunca roda em prod. --recriar apaga o ensaio anterior; --remover só apaga.
//
// Uso: FIREBASE_SERVICE_ACCOUNT='{...}' npm run ensaio -- --projeto dev [--recriar | --remover]

import { parseArgs } from 'node:util'
import { getFirestore } from 'firebase-admin/firestore'
import { hojeEmGoias } from '../src/esquemas/base'
import { executar, iniciarAdmin } from './lib/admin'
import { autoriaDeScript } from './lib/autoria'
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

  const existe = (await db.doc(caminho).get()).exists
  if (values.remover || values.recriar) {
    const { oscs } = await removerEnsaio(db)
    console.log(`Ensaio removido (${caminho} e ${oscs} OSCs de ensaio).`)
    if (values.remover) return
  } else if (existe) {
    throw new Error(`${caminho} já existe. Use --recriar para apagar e gravar de novo, ou --remover para só apagar.`)
  }

  const ensaio = montarEnsaio(hojeEmGoias())
  const autoria = autoriaDeScript('scripts/ensaio.ts', executor)
  const comAutoria = Object.fromEntries(Object.entries(ensaio.documentos).map(([c, d]) => [c, { ...d, ...autoria }]))
  const gravados = await gravarDocumentos(db, comAutoria)

  console.log(`Ensaio gravado no dev: ${gravados} documentos em ${caminho}.`)
  console.table(ensaio.propostas.map((p) => ({ proposta: p.id, lote: p.lote, osc: p.osc, esperado: p.esperado })))
  console.log('Empate: ensaio-l1-beta e ensaio-l1-gama (mesma NF no lote L1).')
})
