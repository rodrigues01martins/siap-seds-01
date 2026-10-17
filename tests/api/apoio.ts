// Apoio aos testes da /api contra os emuladores (npm run test:api).

import { obterAdmin } from '../../api/_lib/admin'

const PROJETO = process.env.GCLOUD_PROJECT ?? 'demo-siap-seds'
const SENHA = 'senha-teste-123'

export type Metodo = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
export type Rota = Record<Metodo, (requisicao: Request) => Promise<Response>>

export interface Usuario {
  uid: string
  email: string
  token: string
  /** Nome no cadastro usuarios/{uid} (vai para atualizadoPor). */
  nome?: string
}

/**
 * Perfis de teste: os dois perfis do app (admin e presidente) e um cadastro do modelo anterior (relator,
 * membro ou controle: permissões por área e papel na Comissão, sem perfil), que não tem mais acesso.
 */
export type PerfilTeste = 'admin' | 'presidente' | 'antigo'

export const ACESSO_TESTE: Record<PerfilTeste, Record<string, unknown>> = {
  admin: { perfil: 'admin' },
  presidente: { perfil: 'presidente' },
  antigo: { admin: false, permissoes: ['consultar', 'nivelD1'], comissao: 'relator' },
}

/** Cadastros (usuarios/{uid}) dos usuários de teste: limparFirestore os regrava. */
const cadastros = new Map<string, Record<string, unknown>>()

/** Apaga o Firestore e regrava o cadastro dos usuários de teste ainda existentes no Auth. */
export async function limparFirestore(): Promise<void> {
  const host = process.env.FIRESTORE_EMULATOR_HOST
  await fetch(`http://${host}/emulator/v1/projects/${PROJETO}/databases/(default)/documents`, { method: 'DELETE' })
  const { db } = obterAdmin()
  await Promise.all([...cadastros].map(([uid, dados]) => db.doc(`usuarios/${uid}`).set(dados)))
}

export async function limparAuth(): Promise<void> {
  const host = process.env.FIREBASE_AUTH_EMULATOR_HOST
  await fetch(`http://${host}/emulator/v1/projects/${PROJETO}/accounts`, { method: 'DELETE' })
  cadastros.clear()
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

/**
 * Cria um usuário no emulador, já logado, com o cadastro em usuarios/{uid} do cenário `perfil`
 * (null = conta sem cadastro). `extras` sobrescreve campos do cadastro (ex.: { ativo: false }).
 */
export async function criarUsuario(perfil: PerfilTeste | null, extras: Record<string, unknown> = {}): Promise<Usuario> {
  const { auth } = obterAdmin()
  sequencia += 1
  const email = `${perfil ?? 'sem-cadastro'}-${sequencia}@teste.go.gov.br`
  const usuario = await auth.createUser({ email, password: SENHA })
  const nome = `Pessoa ${sequencia}`
  if (perfil) await cadastrar(usuario.uid, { email, nome, ativo: true, ...ACESSO_TESTE[perfil], ...extras })
  return { uid: usuario.uid, email, token: await entrar(email), ...(perfil ? { nome: (extras.nome as string | undefined) ?? nome } : {}) }
}

/** Cria só a conta no Authentication (sem cadastro em usuarios/{uid}), já logada. */
export async function criarConta(email: string): Promise<Usuario> {
  const usuario = await obterAdmin().auth.createUser({ email, password: SENHA })
  return { uid: usuario.uid, email: usuario.email!, token: await entrar(email) }
}

async function cadastrar(uid: string, dados: Record<string, unknown>): Promise<void> {
  cadastros.set(uid, dados)
  await obterAdmin().db.doc(`usuarios/${uid}`).set(dados)
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

/** GET com parâmetros na URL (ex.: prévia de exclusão ?simular=true). */
export async function consultar(rota: Rota, parametros: Record<string, string>, token?: string | null): Promise<RespostaTeste> {
  const headers = new Headers()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const url = `http://localhost/api/teste?${new URLSearchParams(parametros).toString()}`
  const resposta = await rota.GET(new Request(url, { method: 'GET', headers }))
  const texto = await resposta.text()
  return { status: resposta.status, corpo: texto ? JSON.parse(texto) : null, headers: resposta.headers }
}

export async function ler(caminho: string): Promise<Record<string, unknown> | undefined> {
  return (await obterAdmin().db.doc(caminho).get()).data()
}

/** Quem gravou, como fica em cada documento: nome do cadastro (ou null) e e-mail. */
export function autoria(usuario: Usuario): { nome: string | null; email: string } {
  return { nome: usuario.nome ?? null, email: usuario.email }
}

export const DATA_LIMITE = '2026-10-31'
export const CH = 'ch1'
export const PROP = 'p1'
export const CAMINHO_PROPOSTA = `chamamentos/${CH}/propostas/${PROP}`
/** Sessão da Comissão semeada aberta por semearProposta (a avaliação exige sessão aberta). */
export const SESSAO = 'sessao-1'
/** Presentes da sessão: só nomes e papéis (sem login), com exatamente um presidente. */
export const PRESENTES = [
  { nome: 'Ana Presidente', papel: 'presidente' },
  { nome: 'Bruno Membro', papel: 'membro' },
  { nome: 'Carla Membro', papel: 'membro' },
]

/** Chamamento (com data limite), OSC, proposta e sessão aberta prontos para avaliação. */
export async function semearProposta(
  opcoes: { justificativaMinima?: number; sessao?: 'aberta' | 'encerrada' | null } = {},
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
  await db.doc(CAMINHO_PROPOSTA).set({ loteCodigo: 'L1', oscCnpj: '11222333000181' })
  const sessao = opcoes.sessao === undefined ? 'aberta' : opcoes.sessao
  if (sessao) await semearSessao(SESSAO, { status: sessao })
}

/** Grava uma sessão diretamente (sem a /api). */
export async function semearSessao(id: string, dados: Record<string, unknown> = {}): Promise<void> {
  await obterAdmin()
    .db.doc(`chamamentos/${CH}/sessoes/${id}`)
    .set({ data: '2026-11-10', lotes: ['L1'], status: 'aberta', presentes: PRESENTES, foco: null, ...dados })
}

/** Regrava o cadastro (usuarios/{uid}) do usuário com o cenário `perfil`. */
export async function registrarUsuario(usuario: Usuario, perfil: PerfilTeste): Promise<void> {
  await cadastrar(usuario.uid, { email: usuario.email, ativo: true, ...ACESSO_TESTE[perfil] })
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
      sessaoId: 's0',
    })
  }
  await lote.commit()
}

/** Remove os campos de autoria que o servidor acrescenta (atualizadoPor e atualizadoEm), para comparar com o domínio. */
export function semCarimbos<T extends Record<string, unknown> | undefined>(dados: T): Record<string, unknown> {
  const { atualizadoPor: _p, atualizadoEm: _a, ...resto } = (dados ?? {}) as Record<string, unknown>
  return resto
}

/** Proposta do lote L1 com totais já calculados (apta e completa por padrão), para a classificação. */
export async function semearPropostaComTotais(
  id: string,
  nf: number,
  dados: { status?: string; d1?: number } = {},
): Promise<void> {
  const d1 = dados.d1 ?? nf - 5
  await obterAdmin()
    .db.doc(`chamamentos/${CH}/propostas/${id}`)
    .set({
      loteCodigo: 'L1',
      oscCnpj: '11222333000181',
      totais: { d1, d2: nf - d1, nf, status: dados.status ?? 'apta', completa: true, pendentes: [], totaisPorPA: [], motivos: [] },
    })
}
