// Simplificação 4/4 — limpeza da base (começar do zero), só o admin: GET ?simular=true conta o que será apagado
// por coleção; POST { acao: 'limpar', confirmacao: 'APAGAR TUDO', projectId } apaga recursivamente chamamentos (com
// sessões, propostas e subcoleções), oscs e as coleções obsoletas (auditoria, diligencias, permissoes…), PRESERVA
// matrizes/ e o cadastro do admin que executa e deixa a matriz atual em matrizes/2026; removerUsuarios tira do
// Auth e de usuarios/ todos os outros. POST { acao: 'recarregar-matriz' } regrava a matriz.
import { beforeEach, describe, expect, it } from 'vitest'
import { obterAdmin } from '../../api/_lib/admin'
import * as rota from '../../api/admin/limpar-base'
import { MATRIZ_2026 } from '../../src/domain/matriz'
import {
  CAMINHO_PROPOSTA,
  CH,
  chamar,
  consultar,
  criarUsuario,
  ler,
  limparAuth,
  limparFirestore,
  semearNiveis,
  semearProposta,
  type Usuario,
} from './apoio'

const PROJETO = process.env.GCLOUD_PROJECT ?? 'demo-siap-seds'
const LIMPAR = { acao: 'limpar', confirmacao: 'APAGAR TUDO', projectId: PROJETO }

let admin: Usuario
let presidente: Usuario
let outroAdmin: Usuario

async function semearBase(): Promise<void> {
  const { db } = obterAdmin()
  await semearProposta()
  await semearNiveis({ '1.1': 3, '1.2': 2 })
  await db.doc(`${CAMINHO_PROPOSTA}/experiencias/e1`).set({ descricao: 'X', categorias: ['C'], inicio: '2020-01-01', fim: null })
  await db.doc(`${CAMINHO_PROPOSTA}/resultadoD2/atual`).set({ total: 0 })
  await db.doc(`chamamentos/${CH}/desempates/L1`).set({ ordem: [] })
  await db.doc('oscs/22333444000181').set({ cnpj: '22333444000181', razaoSocial: 'Outra OSC' })
  await db.doc('auditoria/a1').set({ acao: 'criar' })
  await db.doc('auditoria/a2').set({ acao: 'editar' })
  await db.doc('diligencias/d1').set({ objeto: 'antiga' })
  await db.doc('permissoes/comissao').set({ membros: [] })
  await db.doc('matrizes/2026').set({ ...MATRIZ_2026, origem: { arquivo: 'teste', sha256: 'antigo' } })
}

beforeEach(async () => {
  await limparAuth()
  ;[admin, presidente, outroAdmin] = await Promise.all([criarUsuario('admin'), criarUsuario('presidente'), criarUsuario('admin')])
  await limparFirestore()
  await semearBase()
})

describe('/api/admin/limpar-base — acesso', () => {
  it('só o admin: 401 sem login, 403 para o presidente; métodos GET e POST', async () => {
    expect((await consultar(rota, { simular: 'true' }, null)).status).toBe(401)
    expect(await consultar(rota, { simular: 'true' }, presidente.token)).toMatchObject({ status: 403 })
    expect(await chamar(rota, 'POST', LIMPAR, presidente.token)).toMatchObject({ status: 403 })
    expect(await ler('oscs/22333444000181')).toBeDefined()
    const r = await chamar(rota, 'DELETE', undefined, admin.token)
    expect(r.status).toBe(405)
    expect(r.headers.get('Allow')).toBe('GET, POST')
  })
})

describe('/api/admin/limpar-base — prévia (GET ?simular=true)', () => {
  it('conta por coleção o que será apagado, com o ambiente; não apaga nada', async () => {
    const r = await consultar(rota, { simular: 'true' }, admin.token)
    expect(r.status).toBe(200)
    expect(r.corpo).toMatchObject({
      projectId: PROJETO,
      ambiente: 'DEV',
      itens: {
        chamamentos: 1,
        propostas: 1,
        sessoes: 1,
        avaliacoes: 2,
        experiencias: 1,
        resultadoD2: 1,
        desempates: 1,
        oscs: 2,
        auditoria: 2,
        diligencias: 1,
        permissoes: 1,
      },
      total: 14,
      usuarios: { cadastros: 2, contas: 2 },
      matriz: { versao: MATRIZ_2026.versao, atual: false },
    })
    expect(r.corpo?.itens).not.toHaveProperty('matrizes')
    expect(r.corpo?.itens).not.toHaveProperty('usuarios')
    expect(await ler(CAMINHO_PROPOSTA)).toBeDefined()
    expect(await ler('auditoria/a1')).toBeDefined()
  })

  it('sem ?simular=true → 400', async () => {
    expect((await consultar(rota, {}, admin.token)).status).toBe(400)
  })
})

describe('/api/admin/limpar-base — limpar (POST)', () => {
  it('exige digitar APAGAR TUDO e o projectId do ambiente mostrado', async () => {
    expect(await chamar(rota, 'POST', { ...LIMPAR, confirmacao: 'apagar' }, admin.token)).toMatchObject({
      status: 400,
      corpo: { campos: { confirmacao: 'Digite APAGAR TUDO para confirmar.' } },
    })
    expect(await chamar(rota, 'POST', { ...LIMPAR, projectId: 'siap-seds-01' }, admin.token)).toMatchObject({
      status: 409,
      corpo: { erro: `A prévia era de "siap-seds-01", mas este servidor grava em "${PROJETO}". Recarregue a tela.` },
    })
    expect(await ler('oscs/22333444000181')).toBeDefined()
  })

  it('apaga tudo (com subcoleções), preserva matrizes e os cadastros; a matriz fica atual', async () => {
    const r = await chamar(rota, 'POST', LIMPAR, admin.token)
    expect(r).toMatchObject({ status: 200, corpo: { total: 14, usuariosRemovidos: 0, matriz: { versao: MATRIZ_2026.versao, situacao: 'atualizada' } } })

    const { db } = obterAdmin()
    const raiz = (await db.listCollections()).map((c) => c.id).sort()
    expect(raiz).toEqual(['matrizes', 'usuarios'])
    expect((await db.collection(`${CAMINHO_PROPOSTA}/avaliacoes`).get()).size).toBe(0)
    expect((await db.collectionGroup('propostas').get()).size).toBe(0)

    const matriz = await ler(`matrizes/${MATRIZ_2026.versao}`)
    expect(matriz).toMatchObject({ versao: MATRIZ_2026.versao, dimensao1: MATRIZ_2026.dimensao1, atualizadoPor: { email: admin.email } })
    expect((matriz?.origem as { sha256: string }).sha256).toMatch(/^[0-9a-f]{64}$/)

    // Sem removerUsuarios: todos os cadastros e contas continuam.
    expect(await ler(`usuarios/${admin.uid}`)).toMatchObject({ perfil: 'admin' })
    expect(await ler(`usuarios/${presidente.uid}`)).toMatchObject({ perfil: 'presidente' })

    // Depois de limpo, a prévia está vazia e a matriz, atual.
    expect(await consultar(rota, { simular: 'true' }, admin.token)).toMatchObject({ corpo: { total: 0, matriz: { atual: true } } })
  })

  it('removerUsuarios: tira do Auth e de usuarios/ todos, menos o admin que executa', async () => {
    const r = await chamar(rota, 'POST', { ...LIMPAR, removerUsuarios: true }, admin.token)
    expect(r).toMatchObject({ status: 200, corpo: { usuariosRemovidos: 2 } })

    const { auth, db } = obterAdmin()
    const cadastros = (await db.collection('usuarios').get()).docs.map((d) => d.id)
    expect(cadastros).toEqual([admin.uid])
    const contas = (await auth.listUsers()).users.map((u) => u.uid)
    expect(contas).toEqual([admin.uid])
    expect(contas).not.toContain(outroAdmin.uid)
    expect(await ler('matrizes/2026')).toBeDefined()
  })
})

describe('/api/admin/limpar-base — recarregar a matriz', () => {
  it('regrava matrizes/{versão} a partir de src/domain/matriz/matriz_2026.json (cria se não existir)', async () => {
    await obterAdmin().db.doc(`matrizes/${MATRIZ_2026.versao}`).delete()
    const r = await chamar(rota, 'POST', { acao: 'recarregar-matriz' }, admin.token)
    expect(r).toMatchObject({ status: 200, corpo: { matriz: { versao: MATRIZ_2026.versao, situacao: 'criada' } } })
    expect(await ler(`matrizes/${MATRIZ_2026.versao}`)).toMatchObject({ versao: MATRIZ_2026.versao, dimensao2: MATRIZ_2026.dimensao2 })
    const de_novo = await chamar(rota, 'POST', { acao: 'recarregar-matriz' }, admin.token)
    expect(de_novo.corpo).toMatchObject({ matriz: { situacao: 'atual' } })
    expect(await ler('oscs/22333444000181')).toBeDefined()
  })
})
