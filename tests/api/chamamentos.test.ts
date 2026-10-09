import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { obterAdmin } from '../../api/_lib/admin'
import * as rota from '../../api/chamamentos'
import { auditoriaDe, chamar, criarUsuario, ler, limparAuth, limparFirestore, type Usuario } from './apoio'

const VALIDO = {
  numero: '001/2026',
  titulo: 'Chamamento Público SEDS/GO 2026',
  processoSei: '202610319003258',
  dataLimitePropostas: '2026-10-31',
  lotes: [
    { codigo: 'L1', descricao: 'Centro de Atendimento Socioeducativo de Goiânia' },
    { codigo: 'L2', descricao: 'Centro de Atendimento Socioeducativo de Anápolis' },
  ],
}

let admin: Usuario
let relator: Usuario

beforeAll(async () => {
  await limparAuth()
  admin = await criarUsuario('admin')
  relator = await criarUsuario('relator')
})
beforeEach(limparFirestore)

describe('/api/chamamentos — acesso', () => {
  it('método não suportado → 405 com Allow', async () => {
    const r = await chamar(rota, 'GET', undefined, admin.token)
    expect(r.status).toBe(405)
    expect(r.corpo?.erro).toBe('Método GET não permitido.')
    expect(r.headers.get('Allow')).toBe('POST, PATCH')
  })

  it('sem token → 401', async () => {
    expect((await chamar(rota, 'POST', VALIDO, null)).status).toBe(401)
  })

  it('perfil sem permissão (relator) → 403', async () => {
    expect((await chamar(rota, 'POST', VALIDO, relator.token)).status).toBe(403)
  })
})

describe('/api/chamamentos — validação', () => {
  it('corpo que não é JSON → 400', async () => {
    const r = await chamar(rota, 'POST', undefined, admin.token, '{quebrado')
    expect(r).toMatchObject({ status: 400, corpo: { erro: 'O corpo da requisição deve ser um JSON válido.' } })
  })

  it('campos inválidos → 400 com mensagens por campo', async () => {
    const r = await chamar(rota, 'POST', { numero: '', titulo: 'ab', lotes: [] }, admin.token)
    expect(r.status).toBe(400)
    expect(r.corpo?.erro).toBe('Dados inválidos.')
    expect(Object.keys(r.corpo?.campos ?? {}).sort()).toEqual(['dataLimitePropostas', 'lotes', 'numero', 'processoSei', 'titulo'])
  })

  it('lotes com código repetido → 400', async () => {
    const r = await chamar(rota, 'POST', { ...VALIDO, lotes: [VALIDO.lotes[0], VALIDO.lotes[0]] }, admin.token)
    expect(r).toMatchObject({ status: 400, corpo: { campos: { lotes: 'Há códigos de lote repetidos.' } } })
  })

  it('data limite das propostas inexistente ou fora do formato → 400', async () => {
    for (const data of ['2026-02-30', '31/10/2026']) {
      const r = await chamar(rota, 'POST', { ...VALIDO, dataLimitePropostas: data }, admin.token)
      expect(r).toMatchObject({ status: 400, corpo: { campos: { dataLimitePropostas: 'Data inválida (use AAAA-MM-DD).' } } })
    }
  })

  it('mínimo da justificativa: opcional, inteiro de 0 a 2000', async () => {
    const r = await chamar(rota, 'POST', { ...VALIDO, justificativaMinima: -1 }, admin.token)
    expect(r.status).toBe(400)
    expect(r.corpo?.campos).toHaveProperty('justificativaMinima')
    const ok = await chamar(rota, 'POST', { ...VALIDO, justificativaMinima: 50 }, admin.token)
    expect(await ler(`chamamentos/${ok.corpo?.id as string}`)).toMatchObject({ justificativaMinima: 50 })
  })

  it('processo SEI, índice e data-base de correção (Etapa 4a)', async () => {
    const r = await chamar(rota, 'POST', { ...VALIDO, processoSei: ' ', dataBaseCorrecao: '2026-13-01' }, admin.token)
    expect(r.status).toBe(400)
    expect(r.corpo?.campos).toMatchObject({
      processoSei: 'Informe o número do processo SEI.',
      dataBaseCorrecao: 'Data inválida (use AAAA-MM-DD).',
    })
    const ok = await chamar(rota, 'POST', { ...VALIDO, indiceCorrecao: 'IPCA', dataBaseCorrecao: '2026-01-01' }, admin.token)
    expect(ok.status).toBe(201)
    expect(await ler(`chamamentos/${ok.corpo?.id as string}`)).toMatchObject({
      processoSei: '202610319003258',
      indiceCorrecao: 'IPCA',
      dataBaseCorrecao: '2026-01-01',
    })
  })

  it('índice sem data-base (ou o contrário) → 400', async () => {
    const r = await chamar(rota, 'POST', { ...VALIDO, indiceCorrecao: 'IPCA' }, admin.token)
    expect(r).toMatchObject({ status: 400, corpo: { campos: { dataBaseCorrecao: 'Informe o índice e a data-base juntos.' } } })
  })

  it('campo não previsto → 400', async () => {
    const r = await chamar(rota, 'POST', { ...VALIDO, extra: 1 }, admin.token)
    expect(r).toMatchObject({ status: 400, corpo: { campos: { extra: 'Campo não permitido.' } } })
  })
})

describe('/api/chamamentos — criar e editar', () => {
  it('admin cria → 201, documento gravado e auditado', async () => {
    const r = await chamar(rota, 'POST', VALIDO, admin.token)
    expect(r.status).toBe(201)
    const id = r.corpo?.id as string
    expect(await ler(`chamamentos/${id}`)).toMatchObject(VALIDO)

    const [registro] = await auditoriaDe(`chamamentos/${id}`)
    expect(registro).toMatchObject({ acao: 'criar', antes: null, depois: VALIDO, uid: admin.uid, perfil: 'admin' })
  })

  it('admin edita → 200, auditoria com antes e depois', async () => {
    const id = (await chamar(rota, 'POST', VALIDO, admin.token)).corpo?.id as string
    const r = await chamar(rota, 'PATCH', { id, titulo: 'Título corrigido' }, admin.token)
    expect(r).toMatchObject({ status: 200, corpo: { id } })

    const registros = await auditoriaDe(`chamamentos/${id}`)
    expect(registros).toHaveLength(2)
    expect(registros[1]).toMatchObject({
      acao: 'editar',
      antes: { titulo: VALIDO.titulo },
      depois: { titulo: 'Título corrigido', numero: VALIDO.numero },
    })
  })

  it('editar sem nenhum campo além do id → 400', async () => {
    const id = (await chamar(rota, 'POST', VALIDO, admin.token)).corpo?.id as string
    expect((await chamar(rota, 'PATCH', { id }, admin.token)).status).toBe(400)
  })

  it('data limite não muda depois que a avaliação começou (totais já calculados) → 409', async () => {
    const id = (await chamar(rota, 'POST', VALIDO, admin.token)).corpo?.id as string
    const { db } = obterAdmin()
    await db.doc(`chamamentos/${id}/propostas/p1`).set({ loteCodigo: 'L1', bloqueada: false })
    expect((await chamar(rota, 'PATCH', { id, dataLimitePropostas: '2026-11-30' }, admin.token)).status).toBe(200)

    await db.doc(`chamamentos/${id}/propostas/p1`).update({ totais: { d1: 3 } })
    const r = await chamar(rota, 'PATCH', { id, dataLimitePropostas: '2026-12-15' }, admin.token)
    expect(r).toMatchObject({
      status: 409,
      corpo: { erro: 'Não é possível alterar a data limite: a avaliação de propostas deste chamamento já começou.' },
    })
    expect((await chamar(rota, 'PATCH', { id, titulo: 'Outro título' }, admin.token)).status).toBe(200)
  })

  it('editar chamamento inexistente → 404', async () => {
    expect((await chamar(rota, 'PATCH', { id: 'nao-existe', titulo: 'Novo título' }, admin.token)).status).toBe(404)
  })
})
