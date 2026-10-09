import { Timestamp } from 'firebase-admin/firestore'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import * as rota from '../../api/desempate'
import { CH, auditoriaDe, chamar, criarUsuario, ler, limparAuth, limparFirestore, semearProposta, semearPropostaComTotais, totalAuditoria, type Usuario } from './apoio'

let presidente: Usuario
let relator: Usuario

beforeAll(async () => {
  await limparAuth()
  ;[presidente, relator] = await Promise.all([criarUsuario('presidente'), criarUsuario('relator')])
})

beforeEach(async () => {
  await limparFirestore()
  await semearProposta({ sessao: null })
  await semearPropostaComTotais('a', 90)
  await semearPropostaComTotais('b', 84)
  await semearPropostaComTotais('c', 84)
})

const JUSTIFICATIVA = 'Critério do Edital aplicado pela Comissão em sessão de 10/11/2026: maior pontuação no PA1.'
const corpo = (dados: Record<string, unknown> = {}) => ({
  chamamentoId: CH,
  loteCodigo: 'L1',
  ordem: ['c', 'b'],
  justificativa: JUSTIFICATIVA,
  ...dados,
})

describe('/api/desempate — acesso e validação', () => {
  it('405 com Allow PUT, 401, 403 (relator)', async () => {
    const r = await chamar(rota, 'GET', undefined, presidente.token)
    expect(r.status).toBe(405)
    expect(r.headers.get('Allow')).toBe('PUT')
    expect((await chamar(rota, 'PUT', corpo(), null)).status).toBe(401)
    expect((await chamar(rota, 'PUT', corpo(), relator.token)).status).toBe(403)
  })

  it.each([
    ['justificativa curta', { justificativa: 'Decidido.' }, 'justificativa', 'Informe a justificativa do desempate (ao menos 20 caracteres).'],
    ['uma só proposta', { ordem: ['b'] }, 'ordem', 'Informe ao menos duas propostas empatadas.'],
    ['proposta repetida', { ordem: ['b', 'b'] }, 'ordem', 'Há propostas repetidas.'],
    ['lote inexistente', { loteCodigo: 'L9' }, 'loteCodigo', 'Lote não encontrado neste chamamento.'],
  ])('%s → 400', async (_caso, ajuste, campo, mensagem) => {
    const r = await chamar(rota, 'PUT', corpo(ajuste), presidente.token)
    expect(r).toMatchObject({ status: 400, corpo: { campos: { [campo]: mensagem } } })
    expect(await totalAuditoria()).toBe(0)
  })

  it('chamamento inexistente → 404', async () => {
    expect((await chamar(rota, 'PUT', corpo({ chamamentoId: 'nao-existe' }), presidente.token)).status).toBe(404)
  })

  it('propostas que não formam um empate atual → 409', async () => {
    for (const ordem of [['a', 'b'], ['b'], ['b', 'x']].filter((o) => o.length > 1)) {
      const r = await chamar(rota, 'PUT', corpo({ ordem }), presidente.token)
      expect(r).toMatchObject({ status: 409, corpo: { erro: 'As propostas informadas não formam um empate atual neste lote.' } })
    }
    await semearPropostaComTotais('d', 84)
    const incompleto = await chamar(rota, 'PUT', corpo(), presidente.token)
    expect(incompleto.status).toBe(409)
  })
})

describe('/api/desempate — gravação e auditoria', () => {
  it('registra a decisão (ordem, NF, justificativa, autoria) e audita; registrar de novo edita', async () => {
    const r = await chamar(rota, 'PUT', corpo(), presidente.token)
    expect(r.status).toBe(200)
    const caminho = `chamamentos/${CH}/desempates/${r.corpo?.id as string}`
    const doc = await ler(caminho)
    expect(doc).toMatchObject({
      loteCodigo: 'L1',
      nf: 84,
      propostas: ['b', 'c'],
      ordem: ['c', 'b'],
      justificativa: JUSTIFICATIVA,
      decididoPor: { uid: presidente.uid, email: presidente.email },
    })
    expect(doc?.decididoEm).toBeInstanceOf(Timestamp)
    expect((await auditoriaDe(caminho))[0]).toMatchObject({ acao: 'criar', uid: presidente.uid, perfil: 'presidente' })

    const r2 = await chamar(rota, 'PUT', corpo({ ordem: ['b', 'c'] }), presidente.token)
    expect(r2.corpo?.id).toBe(r.corpo?.id)
    expect((await auditoriaDe(caminho)).at(-1)).toMatchObject({
      acao: 'editar',
      antes: { ordem: ['c', 'b'] },
      depois: { ordem: ['b', 'c'] },
    })
  })
})
