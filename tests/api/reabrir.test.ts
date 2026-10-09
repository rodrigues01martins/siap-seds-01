import { Timestamp } from 'firebase-admin/firestore'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import * as avaliacao from '../../api/avaliacao'
import * as rota from '../../api/reabrir'
import { CAMINHO_PROPOSTA, CH, PROP, SESSAO, auditoriaDe, chamar, criarUsuario, ler, limparAuth, limparFirestore, semearProposta, totalAuditoria, type Usuario } from './apoio'

let presidente: Usuario
let relator: Usuario

beforeAll(async () => {
  await limparAuth()
  ;[presidente, relator] = await Promise.all([criarUsuario('presidente'), criarUsuario('relator')])
})

beforeEach(async () => {
  await limparFirestore()
  await semearProposta({ bloqueada: true })
})

const MOTIVO = 'Erro material no registro do subcritério 3.1 identificado após a homologação.'
const corpo = (dados: Record<string, unknown> = {}) => ({ chamamentoId: CH, propostaId: PROP, motivo: MOTIVO, ...dados })

describe('/api/reabrir — acesso e validação', () => {
  it('405 com Allow POST, 401, 403 (relator)', async () => {
    const r = await chamar(rota, 'GET', undefined, presidente.token)
    expect(r.status).toBe(405)
    expect(r.headers.get('Allow')).toBe('POST')
    expect((await chamar(rota, 'POST', corpo(), null)).status).toBe(401)
    expect((await chamar(rota, 'POST', corpo(), relator.token)).status).toBe(403)
  })

  it('motivo obrigatório → 400', async () => {
    const r = await chamar(rota, 'POST', corpo({ motivo: 'erro' }), presidente.token)
    expect(r).toMatchObject({ status: 400, corpo: { campos: { motivo: 'Informe o motivo da reabertura (ao menos 20 caracteres).' } } })
    expect(await totalAuditoria()).toBe(0)
  })

  it('proposta inexistente → 404; não homologada → 409', async () => {
    expect((await chamar(rota, 'POST', corpo({ propostaId: 'nao-existe' }), presidente.token)).status).toBe(404)
    await semearProposta({ bloqueada: false })
    const r = await chamar(rota, 'POST', corpo(), presidente.token)
    expect(r).toMatchObject({ status: 409, corpo: { erro: 'Proposta não está homologada.' } })
  })
})

describe('/api/reabrir — reabertura (RF-18)', () => {
  it('desbloqueia, registra reabertoPor/Em e motivo, audita; a avaliação volta a aceitar escrita', async () => {
    const r = await chamar(rota, 'POST', corpo(), presidente.token)
    expect(r).toMatchObject({ status: 200, corpo: { bloqueada: false } })
    const proposta = await ler(CAMINHO_PROPOSTA)
    expect(proposta).toMatchObject({
      bloqueada: false,
      reabertoPor: { uid: presidente.uid, email: presidente.email },
      motivoReabertura: MOTIVO,
      homologadaPor: null,
      homologadaEm: null,
    })
    expect(proposta?.reabertoEm).toBeInstanceOf(Timestamp)
    expect((await auditoriaDe(CAMINHO_PROPOSTA)).at(-1)).toMatchObject({
      acao: 'editar',
      antes: { bloqueada: true },
      depois: { bloqueada: false, motivoReabertura: MOTIVO },
      perfil: 'presidente',
    })

    const nivel = await chamar(
      avaliacao,
      'PUT',
      { chamamentoId: CH, propostaId: PROP, codigo: '3.1', nivel: 3, justificativa: 'Correção após a reabertura.', paginas: [], decisao: 'unanimidade', sessaoId: SESSAO },
      relator.token,
    )
    expect(nivel.status).toBe(200)
  })
})
