// Testes das regras do Firestore no emulador (npm run test:regras).
// Matriz de acesso: cada caminho × cada ator, para leitura e escrita. O acesso vem de usuarios/{uid}
// (admin, permissoes, ativo), gravado só pela /api.

import { readFileSync } from 'node:fs'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc, type Firestore } from 'firebase/firestore'
import { afterAll, beforeAll, describe, it } from 'vitest'

let ambiente: RulesTestEnvironment

/** Cadastro de cada ator em usuarios/{uid}; 'anonimo' não tem login e 'sem-cadastro' não tem documento. */
const CADASTROS = {
  admin: { email: 'admin@go.gov.br', admin: true, ativo: true, permissoes: [] },
  consulta: { email: 'consulta@go.gov.br', admin: false, ativo: true, permissoes: ['consultar'] },
  avaliador: { email: 'avaliador@go.gov.br', admin: false, ativo: true, permissoes: ['nivelD1'] },
  'sem-permissao': { email: 'sem-permissao@go.gov.br', admin: false, ativo: true, permissoes: [] },
  desativado: { email: 'desativado@go.gov.br', admin: false, ativo: false, permissoes: ['consultar'] },
  'admin-desativado': { email: 'ex-admin@go.gov.br', admin: true, ativo: false, permissoes: [] },
} as const

type Ator = keyof typeof CADASTROS | 'anonimo' | 'sem-cadastro'
const ATORES: Ator[] = ['anonimo', 'sem-cadastro', ...(Object.keys(CADASTROS) as (keyof typeof CADASTROS)[])]
const LOGADOS = ATORES.filter((a) => a !== 'anonimo')
/** Quem lê os dados do app: ativo e administrador ou com ao menos uma permissão. */
const LEITORES: Ator[] = ['admin', 'consulta', 'avaliador']

const uidDe = (ator: Ator) => `uid-${ator}`

function bancoDe(ator: Ator): Firestore {
  if (ator === 'anonimo') return ambiente.unauthenticatedContext().firestore() as unknown as Firestore
  // Um claim antigo de perfil não dá acesso nenhum: só o cadastro conta.
  return ambiente.authenticatedContext(uidDe(ator), { perfil: 'admin' }).firestore() as unknown as Firestore
}

const DOCUMENTOS = [
  'matrizes/2026',
  'chamamentos/ch1',
  'chamamentos/ch1/propostas/p1',
  'chamamentos/ch1/propostas/p1/avaliacoes/a1',
  'chamamentos/ch1/sessoes/s1',
  'oscs/osc1',
  'auditoria/ev1',
  'colecao-nao-prevista/x',
]

beforeAll(async () => {
  ambiente = await initializeTestEnvironment({
    projectId: 'demo-siap-seds',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  })
  await ambiente.clearFirestore()
  await ambiente.withSecurityRulesDisabled(async (contexto) => {
    const db = contexto.firestore() as unknown as Firestore
    for (const caminho of DOCUMENTOS) await setDoc(doc(db, caminho), { semente: true })
    for (const [ator, dados] of Object.entries(CADASTROS)) await setDoc(doc(db, `usuarios/${uidDe(ator as Ator)}`), dados)
  })
})

afterAll(async () => {
  await ambiente?.cleanup()
})

/** Quem pode ler cada caminho. */
const LEITURA: Record<string, Ator[]> = {
  'matrizes/2026': LOGADOS,
  'chamamentos/ch1': LEITORES,
  'chamamentos/ch1/propostas/p1': LEITORES,
  'chamamentos/ch1/propostas/p1/avaliacoes/a1': LEITORES,
  'chamamentos/ch1/sessoes/s1': LEITORES,
  'oscs/osc1': LEITORES,
  'auditoria/ev1': ['admin'],
  // O próprio cadastro (o app lê para saber o acesso) e os leitores (listam a Comissão na sessão).
  'usuarios/uid-admin': LEITORES,
  'usuarios/uid-sem-permissao': ['sem-permissao', ...LEITORES],
  'usuarios/uid-desativado': ['desativado', ...LEITORES],
  'usuarios/uid-sem-cadastro': ['sem-cadastro', ...LEITORES],
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
  it.each(LEITORES)('%s lista chamamentos e usuarios', async (ator) => {
    await assertSucceeds(getDocs(collection(bancoDe(ator), 'chamamentos')))
    await assertSucceeds(getDocs(collection(bancoDe(ator), 'usuarios')))
  })

  it.each(ATORES.filter((a) => !LEITORES.includes(a)))('%s não lista chamamentos nem usuarios', async (ator) => {
    await assertFails(getDocs(collection(bancoDe(ator), 'chamamentos')))
    await assertFails(getDocs(collection(bancoDe(ator), 'usuarios')))
  })

  it('só o administrador ativo lista a auditoria', async () => {
    await assertSucceeds(getDocs(collection(bancoDe('admin'), 'auditoria')))
    for (const ator of ['consulta', 'avaliador', 'admin-desativado'] as const) {
      await assertFails(getDocs(collection(bancoDe(ator), 'auditoria')))
    }
  })
})

describe('escrita bloqueada para TODOS os clientes (toda escrita passa pela /api)', () => {
  const caminhos = [...DOCUMENTOS, 'usuarios/uid-admin', 'usuarios/uid-consulta']
  const casos = caminhos.flatMap((caminho) => ATORES.map((ator) => ({ caminho, ator })))

  it.each(casos)('$ator não cria/atualiza/apaga $caminho', async ({ caminho, ator }) => {
    const db = bancoDe(ator)
    await assertFails(setDoc(doc(db, caminho), { alterado: true }))
    await assertFails(updateDoc(doc(db, caminho), { alterado: true }))
    await assertFails(deleteDoc(doc(db, caminho)))
  })

  it('ninguém cria ou altera o próprio cadastro (ex.: para virar administrador)', async () => {
    await assertFails(setDoc(doc(bancoDe('sem-cadastro'), 'usuarios/uid-sem-cadastro'), { admin: true }))
    await assertFails(updateDoc(doc(bancoDe('consulta'), 'usuarios/uid-consulta'), { admin: true }))
  })
})
