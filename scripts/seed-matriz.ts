// Grava src/domain/matriz/matriz_2026.json em matrizes/{versao}, com atualizadoPor (o script) e atualizadoEm.
//
// Uso: FIREBASE_SERVICE_ACCOUNT='{...}' npm run seed:matriz -- --projeto dev [--forcar] [--confirmar]

import { readFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { validarMatriz } from '../src/domain/matriz'
import type { Matriz } from '../src/domain/matriz/tipos'
import { assinaturaMatriz } from '../api/_lib/matriz'
import { executar, iniciarAdmin } from './lib/admin'
import { autoriaDeScript } from './lib/autoria'

const ARQUIVO = 'src/domain/matriz/matriz_2026.json'

executar(async () => {
  const { values } = parseArgs({
    options: {
      projeto: { type: 'string' },
      forcar: { type: 'boolean', default: false },
      confirmar: { type: 'boolean', default: false },
    },
  })
  const { app, executor } = iniciarAdmin(values.projeto, values.confirmar)

  const conteudo = readFileSync(new URL(`../${ARQUIVO}`, import.meta.url), 'utf8')
  const matriz = validarMatriz(JSON.parse(conteudo) as Matriz)
  // Mesma assinatura da /api (Administração → Limpar base → Recarregar matriz).
  const sha256 = assinaturaMatriz(matriz)

  const db = getFirestore(app)
  const ref = db.doc(`matrizes/${matriz.versao}`)

  // Em transação: confere se já existe e grava. O callback não lança erro: em caso de erro o SDK
  // dispara o rollback sem aguardar, e encerrar o processo logo depois deixaria o documento travado.
  const resultado = await db.runTransaction(async (transacao) => {
    const atual = await transacao.get(ref)
    if (atual.exists && !values.forcar) return 'ja-existe' as const
    transacao.set(ref, {
      ...matriz,
      origem: { arquivo: ARQUIVO, sha256 },
      publicadaEm: FieldValue.serverTimestamp(),
      ...autoriaDeScript('scripts/seed-matriz.ts', executor),
    })
    return atual.exists ? ('sobrescrita' as const) : ('criada' as const)
  })

  if (resultado === 'ja-existe') throw new Error(`${ref.path} já existe. Use --forcar para sobrescrever.`)
  console.log(`${ref.path} ${resultado} (sha256 ${sha256.slice(0, 12)}…).`)
})
