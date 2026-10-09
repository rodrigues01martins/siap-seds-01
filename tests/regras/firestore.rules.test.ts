// Testes das regras do Firestore no emulador (npm run test:regras).
// Matriz de acesso: cada caminho × cada ator, para leitura e escrita.

import { readFileSync } from 'node:fs'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc, type Firestore } from 'firebase/firestore'
import { afterAll, beforeAll, describe, it } from 'vitest'
import { PERFIS, type Perfil } from '../../src/domain/perfis'

let ambiente: RulesTestEnvironment

type Ator = Perfil | 'anonimo' | 'sem-perfil' | 'perfil-invalido'
const ATORES: Ator[] = ['anonimo', 'sem-perfil', 'perfil-invalido', ...PERFIS]

const uidDe = (ator: Ator) => `uid-${ator}`

function bancoDe(ator: Ator): Firestore {
  if (ator === 'anonimo') return ambiente.unauthenticatedContext().firestore() as unknown as Firestore
  const claims = ator === 'sem-perfil' ? {} : { perfil: ator === 'perfil-invalido' ? 'superusuario' : ator }
  return ambiente.authenticatedContext(uidDe(ator), claims).firestore() as unknown as Firestore
}

const DOCUMENTOS = [
  'matrizes/2026',
  'chamamentos/ch1',
  'chamamentos/ch1/propostas/p1',
  'chamamentos/ch1/propostas/p1/avaliacoes/a1',
  'oscs/osc1',
  'auditoria/ev1',
  'usuarios/uid-admin',
  'usuarios/uid-membro',
  'usuarios/uid-sem-perfil',
  'colecao-nao-prevista/x',
]

beforeAll(async () => {
  ambiente = await initializeTestEnvironment({
    projectId: 'demo-siap-seds',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  })
  await ambiente.clearFirestore()
  await ambiente.withSecurityRulesDisabled(async (contexto) => {
    const db = contexto.firestore()
    for (const caminho of DOCUMENTOS) await setDoc(doc(db as unknown as Firestore, caminho), { semente: true })
  })
})

afterAll(async () => {
  await ambiente?.cleanup()
})

/** Quem pode ler cada caminho, conforme a especificação da Etapa 2. */
const LEITURA: Record<string, Ator[]> = {
  'matrizes/2026': ['sem-perfil', 'perfil-invalido', ...PERFIS],
  'chamamentos/ch1': ['admin', 'presidente', 'relator', 'membro'],
  'chamamentos/ch1/propostas/p1': ['admin', 'presidente', 'relator', 'membro'],
  'chamamentos/ch1/propostas/p1/avaliacoes/a1': ['admin', 'presidente', 'relator', 'membro'],
  'oscs/osc1': ['admin', 'presidente', 'relator', 'membro'],
  'auditoria/ev1': ['admin', 'presidente', 'controle'],
  'usuarios/uid-admin': ['admin'],
  'usuarios/uid-membro': ['membro', 'admin'],
  'usuarios/uid-sem-perfil': ['sem-perfil', 'admin'],
  'colecao-nao-prevista/x': [],
}

describe('leitura de documento (get)', () => {
  const casos = Object.entries(LEITURA).flatMap(([caminho, permitidos]) =>
    ATORES.map((ator) => ({ caminho, ator, pode: permitidos.includes(ator) })),
  )
  it.each(casos)('$caminho por $ator → pode=$pode', async ({ caminho, ator, pode }) => {
    const leitura = getDoc(doc(bancoDe(ator), caminho))
    await (pode ? assertSucceeds(leitura) : assertFails(leitura))
  })
})

describe('leitura de coleção (list)', () => {
  it.each(['admin', 'presidente', 'relator', 'membro'] as const)('%s lista chamamentos', async (ator) => {
    await assertSucceeds(getDocs(collection(bancoDe(ator), 'chamamentos')))
  })

  it.each(['controle', 'sem-perfil', 'anonimo'] as const)('%s não lista chamamentos', async (ator) => {
    await assertFails(getDocs(collection(bancoDe(ator), 'chamamentos')))
  })

  it('admin lista usuarios; membro não', async () => {
    await assertSucceeds(getDocs(collection(bancoDe('admin'), 'usuarios')))
    await assertFails(getDocs(collection(bancoDe('membro'), 'usuarios')))
  })

  it('controle lista auditoria; relator não', async () => {
    await assertSucceeds(getDocs(collection(bancoDe('controle'), 'auditoria')))
    await assertFails(getDocs(collection(bancoDe('relator'), 'auditoria')))
  })
})

describe('escrita bloqueada para TODOS os clientes (toda escrita passa pela /api)', () => {
  const casos = DOCUMENTOS.flatMap((caminho) => ATORES.map((ator) => ({ caminho, ator })))

  it.each(casos)('$ator não cria/atualiza/apaga $caminho', async ({ caminho, ator }) => {
    const db = bancoDe(ator)
    await assertFails(setDoc(doc(db, caminho), { alterado: true }))
    await assertFails(updateDoc(doc(db, caminho), { alterado: true }))
    await assertFails(deleteDoc(doc(db, caminho)))
  })

  it('nem o próprio usuário cria o seu documento em usuarios', async () => {
    await assertFails(setDoc(doc(bancoDe('membro'), 'usuarios/uid-membro-novo'), { perfil: 'admin' }))
  })
})
