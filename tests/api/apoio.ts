// Apoio aos testes da /api contra os emuladores (npm run test:api).

import type { Timestamp } from 'firebase-admin/firestore'
import { obterAdmin } from '../../api/_lib/admin'
import type { Perfil } from '../../src/domain/perfis'

const PROJETO = process.env.GCLOUD_PROJECT ?? 'demo-siap-seds'
const SENHA = 'senha-teste-123'

export type Metodo = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
export type Rota = Record<Metodo, (requisicao: Request) => Promise<Response>>

export interface Usuario {
  uid: string
  email: string
  token: string
}

export interface RegistroAuditoria {
  caminho: string
  acao: 'criar' | 'editar' | 'excluir'
  antes: Record<string, unknown> | null
  depois: Record<string, unknown> | null
  uid: string
  perfil: Perfil
  dataHora: Timestamp
}

export async function limparFirestore(): Promise<void> {
  const host = process.env.FIRESTORE_EMULATOR_HOST
  await fetch(`http://${host}/emulator/v1/projects/${PROJETO}/databases/(default)/documents`, { method: 'DELETE' })
}

export async function limparAuth(): Promise<void> {
  const host = process.env.FIREBASE_AUTH_EMULATOR_HOST
  await fetch(`http://${host}/emulator/v1/projects/${PROJETO}/accounts`, { method: 'DELETE' })
}

/** Faz login no emulador de Auth e devolve o ID token (com os claims atuais). */
export async function entrar(email: string): Promise<string> {
  const host = process.env.FIREBASE_AUTH_EMULATOR_HOST
  const resposta = await fetch(
    `http://${host}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=chave-falsa`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: SENHA, returnSecureToken: true }),
    },
  )
  const corpo = (await resposta.json()) as { idToken?: string }
  if (!corpo.idToken) throw new Error(`Falha no login de ${email} no emulador`)
  return corpo.idToken
}

let sequencia = 0

/** Cria um usuário no emulador, com ou sem perfil, já logado. */
export async function criarUsuario(perfil: Perfil | null, claimsExtras: Record<string, unknown> = {}): Promise<Usuario> {
  const { auth } = obterAdmin()
  sequencia += 1
  const email = `${perfil ?? 'sem-perfil'}-${sequencia}@teste.go.gov.br`
  const usuario = await auth.createUser({ email, password: SENHA })
  const claims = { ...claimsExtras, ...(perfil ? { perfil } : {}) }
  if (Object.keys(claims).length > 0) await auth.setCustomUserClaims(usuario.uid, claims)
  return { uid: usuario.uid, email, token: await entrar(email) }
}

export interface RespostaTeste {
  status: number
  corpo: { erro?: string; campos?: Record<string, string>; [chave: string]: unknown } | null
  headers: Headers
}

/** Chama o handler da rota como a Vercel faria (Request → Response). */
export async function chamar(
  rota: Rota,
  metodo: Metodo,
  corpo?: unknown,
  token?: string | null,
  corpoBruto?: string,
): Promise<RespostaTeste> {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const body = corpoBruto ?? (corpo === undefined ? undefined : JSON.stringify(corpo))
  const resposta = await rota[metodo](new Request('http://localhost/api/teste', { method: metodo, headers, body }))
  const texto = await resposta.text()
  return { status: resposta.status, corpo: texto ? JSON.parse(texto) : null, headers: resposta.headers }
}

export async function ler(caminho: string): Promise<Record<string, unknown> | undefined> {
  return (await obterAdmin().db.doc(caminho).get()).data()
}

export async function auditoriaDe(caminho: string): Promise<RegistroAuditoria[]> {
  const consulta = await obterAdmin().db.collection('auditoria').where('caminho', '==', caminho).get()
  return consulta.docs
    .map((d) => d.data() as RegistroAuditoria)
    .sort((a, b) => a.dataHora.toMillis() - b.dataHora.toMillis())
}

export async function totalAuditoria(): Promise<number> {
  return (await obterAdmin().db.collection('auditoria').count().get()).data().count
}

export const DATA_LIMITE = '2026-10-31'
export const CH = 'ch1'
export const PROP = 'p1'
export const CAMINHO_PROPOSTA = `chamamentos/${CH}/propostas/${PROP}`
/** Sessão da Comissão semeada aberta por semearProposta (a avaliação exige sessão aberta). */
export const SESSAO = 'sessao-1'

/** Chamamento (com data limite), OSC, proposta e sessão aberta prontos para avaliação. */
export async function semearProposta(
  opcoes: { justificativaMinima?: number; bloqueada?: boolean; sessao?: 'aberta' | 'encerrada' | null } = {},
): Promise<void> {
  const { db } = obterAdmin()
  await db.doc(`chamamentos/${CH}`).set({
    numero: '001/2026',
    titulo: 'Chamamento',
    processoSei: '202610319003258',
    dataLimitePropostas: DATA_LIMITE,
    lotes: [{ codigo: 'L1', descricao: 'Lote 1' }],
    ...(opcoes.justificativaMinima !== undefined ? { justificativaMinima: opcoes.justificativaMinima } : {}),
  })
  await db.doc('oscs/11222333000181').set({ cnpj: '11222333000181', razaoSocial: 'Instituto Esperança' })
  await db.doc(CAMINHO_PROPOSTA).set({ loteCodigo: 'L1', oscCnpj: '11222333000181', bloqueada: opcoes.bloqueada ?? false })
  const sessao = opcoes.sessao === undefined ? 'aberta' : opcoes.sessao
  if (sessao) await semearSessao(SESSAO, { status: sessao })
}

/** Grava uma sessão diretamente (sem a /api). */
export async function semearSessao(id: string, dados: Record<string, unknown> = {}): Promise<void> {
  await obterAdmin()
    .db.doc(`chamamentos/${CH}/sessoes/${id}`)
    .set({ data: '2026-11-10', pauta: [PROP], status: 'aberta', presentes: [], declaracoes: [], foco: null, ...dados })
}

/** Espelha o usuário em usuarios/{uid}, como /api/perfis e set-role fazem. */
export async function registrarUsuario(usuario: Usuario, perfil: Perfil | null): Promise<void> {
  await obterAdmin().db.doc(`usuarios/${usuario.uid}`).set({ email: usuario.email, perfil })
}

/** Grava níveis diretamente (sem a /api), para montar cenários grandes rapidamente. */
export async function semearNiveis(niveis: Record<string, number>): Promise<void> {
  const { db } = obterAdmin()
  const lote = db.batch()
  for (const [codigo, nivel] of Object.entries(niveis)) {
    lote.set(db.doc(`${CAMINHO_PROPOSTA}/avaliacoes/${codigo}`), {
      nivel,
      justificativa: 'Semente de teste com justificativa suficiente.',
      paginas: [],
      decisao: 'unanimidade',
      sessaoId: 's0',
    })
  }
  await lote.commit()
}

/** Remove os campos de data que o servidor acrescenta, para comparar com o domínio. */
export function semCarimbos<T extends Record<string, unknown> | undefined>(dados: T): Record<string, unknown> {
  const { criadoEm: _c, atualizadoEm: _a, ...resto } = (dados ?? {}) as Record<string, unknown>
  return resto
}

/** Proposta do lote L1 com totais já calculados (apta e completa por padrão), para a classificação. */
export async function semearPropostaComTotais(
  id: string,
  nf: number,
  dados: { status?: string; bloqueada?: boolean; d1?: number } = {},
): Promise<void> {
  const d1 = dados.d1 ?? nf - 5
  await obterAdmin()
    .db.doc(`chamamentos/${CH}/propostas/${id}`)
    .set({
      loteCodigo: 'L1',
      oscCnpj: '11222333000181',
      bloqueada: dados.bloqueada ?? false,
      totais: { d1, d2: nf - d1, nf, status: dados.status ?? 'apta', completa: true, pendentes: [], totaisPorPA: [], motivos: [] },
    })
}
