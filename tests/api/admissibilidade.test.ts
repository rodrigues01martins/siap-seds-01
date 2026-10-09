import { Timestamp } from 'firebase-admin/firestore'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import * as rota from '../../api/admissibilidade'
import * as avaliacao from '../../api/avaliacao'
import * as experiencia from '../../api/experiencia'
import {
  CAMINHO_PROPOSTA,
  CH,
  PROP,
  SESSAO,
  auditoriaDe,
  chamar,
  criarUsuario,
  ler,
  limparAuth,
  limparFirestore,
  semearProposta,
  totalAuditoria,
  type Usuario,
} from './apoio'

const REQUISITOS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VIII', 'IX', 'X'].map((n) => `28.1.${n}`)
const LIMITES = [12, 12, 8, 12, 10, 8]

function corpo(dados: Record<string, unknown> = {}) {
  let pagina = 3
  return {
    chamamentoId: CH,
    propostaId: PROP,
    requisitos: Object.fromEntries(REQUISITOS.map((c) => [c, true])),
    irregularidadesFormais: [],
    planos: LIMITES.map((limite, i) => {
      const plano = { codigo: `PA${i + 1}`, ausente: false, paginaInicial: pagina, paginaFinal: pagina + limite - 1 }
      pagina += limite
      return plano
    }),
    resultado: 'admitida',
    ...dados,
  }
}

let presidente: Usuario
let relator: Usuario
let membro: Usuario
let admin: Usuario

beforeAll(async () => {
  await limparAuth()
  ;[presidente, relator, membro, admin] = await Promise.all([
    criarUsuario('presidente'),
    criarUsuario('relator'),
    criarUsuario('membro'),
    criarUsuario('admin'),
  ])
})

beforeEach(async () => {
  await limparFirestore()
  await semearProposta()
})

describe('/api/admissibilidade — acesso', () => {
  it('405 com Allow PUT, 401, 403 (membro e admin)', async () => {
    const r = await chamar(rota, 'GET', undefined, relator.token)
    expect(r.status).toBe(405)
    expect(r.headers.get('Allow')).toBe('PUT')
    expect((await chamar(rota, 'PUT', corpo(), null)).status).toBe(401)
    expect((await chamar(rota, 'PUT', corpo(), membro.token)).status).toBe(403)
    expect((await chamar(rota, 'PUT', corpo(), admin.token)).status).toBe(403)
  })

  it.each(['presidente', 'relator'] as const)('%s registra', async (perfil) => {
    expect((await chamar(rota, 'PUT', corpo(), { presidente, relator }[perfil].token)).status).toBe(200)
  })
})

describe('/api/admissibilidade — validação (400) e 404', () => {
  it.each([
    ['admitida com requisito não atendido', { requisitos: { ...corpo().requisitos, '28.1.II': false } }, 'resultado', 'Requisito essencial 28.1.II não atendido: a proposta não pode ser admitida.'],
    ['não admitida sem motivação', { resultado: 'nao_admitida' }, 'motivacao', 'Informe a motivação da não admissão (ao menos 10 caracteres).'],
    ['faltando PA', { planos: corpo().planos.slice(1) }, 'planos', 'Informe os 6 Planos de Ação (PA1 a PA6), cada um uma vez.'],
    ['resultado fora da lista', { resultado: 'talvez' }, 'resultado', undefined],
  ])('%s', async (_caso, ajuste, campo, mensagem) => {
    const r = await chamar(rota, 'PUT', corpo(ajuste), relator.token)
    expect(r.status).toBe(400)
    expect(r.corpo?.campos).toHaveProperty(campo)
    if (mensagem) expect(r.corpo?.campos?.[campo]).toBe(mensagem)
    expect(await totalAuditoria()).toBe(0)
  })

  it('página final antes da inicial → campo do PA', async () => {
    const planos = corpo().planos
    planos[2] = { codigo: 'PA3', ausente: false, paginaInicial: 30, paginaFinal: 29 }
    const r = await chamar(rota, 'PUT', corpo({ planos }), relator.token)
    expect(r).toMatchObject({ status: 400, corpo: { campos: { 'planos.2.paginaFinal': 'A página final não pode ser anterior à inicial.' } } })
  })

  it('proposta inexistente → 404', async () => {
    const r = await chamar(rota, 'PUT', corpo({ propostaId: 'nao-existe' }), relator.token)
    expect(r).toMatchObject({ status: 404, corpo: { erro: 'Proposta não encontrada.' } })
  })
})

describe('/api/admissibilidade — gravação, cálculo e auditoria', () => {
  it('grava em propostas/{p}.admissibilidade com página de corte, situação e autoria, auditado', async () => {
    const planos = corpo().planos
    planos[2] = { codigo: 'PA3', ausente: false, paginaInicial: 30, paginaFinal: 39 }
    const r = await chamar(
      rota,
      'PUT',
      corpo({ planos, irregularidadesFormais: ['28.5.II'], observacaoIrregularidades: 'Numeração repetida na p. 31.' }),
      relator.token,
    )
    expect(r).toMatchObject({ status: 200, corpo: { admissibilidade: { situacao: 'admitida' } } })
    const adm = (await ler(CAMINHO_PROPOSTA))?.admissibilidade as Record<string, unknown>
    expect(adm).toMatchObject({
      situacao: 'admitida',
      resultado: 'admitida',
      irregularidadesFormais: ['28.5.II'],
      observacaoIrregularidades: 'Numeração repetida na p. 31.',
      registradaPor: { uid: relator.uid, email: relator.email },
    })
    expect((adm.planos as unknown[])[2]).toMatchObject({ codigo: 'PA3', paginas: 10, limite: 8, paginaCorte: 37, excede: 2 })
    expect(adm.registradaEm).toBeInstanceOf(Timestamp)
    expect((await auditoriaDe(CAMINHO_PROPOSTA)).at(-1)).toMatchObject({
      acao: 'editar',
      depois: { admissibilidade: { situacao: 'admitida' } },
      uid: relator.uid,
    })
  })

  it('PA ausente → desclassificada automaticamente (28.2)', async () => {
    const planos = corpo().planos
    planos[5] = { codigo: 'PA6', ausente: true, paginaInicial: null, paginaFinal: null }
    const r = await chamar(rota, 'PUT', corpo({ planos, resultado: 'nao_admitida', motivacao: 'Caderno sem o PA6.' }), presidente.token)
    expect(r.status).toBe(200)
    expect((await ler(CAMINHO_PROPOSTA))?.admissibilidade).toMatchObject({
      situacao: 'desclassificada',
      motivos: expect.arrayContaining(['Ausência do PA6 (Anexo III, 28.2).']),
    })
  })

  it('proposta homologada → 409, sem gravar', async () => {
    await semearProposta({ bloqueada: true })
    const r = await chamar(rota, 'PUT', corpo(), relator.token)
    expect(r).toMatchObject({ status: 409, corpo: { erro: 'Proposta homologada: alteração não permitida.' } })
    expect(await totalAuditoria()).toBe(0)
  })
})

describe('proposta não admitida não segue para avaliação', () => {
  it('C2 e C3 → 409 depois de não admitida', async () => {
    await chamar(rota, 'PUT', corpo({ resultado: 'nao_admitida', motivacao: 'Arquivo ilegível em várias páginas.' }), relator.token)
    const mensagem = 'Proposta não admitida (Anexo III, item 28): não segue para avaliação.'
    const nivel = await chamar(
      avaliacao,
      'PUT',
      { chamamentoId: CH, propostaId: PROP, codigo: '1.1', nivel: 3, justificativa: 'Justificativa suficiente para o teste.', paginas: [], decisao: 'unanimidade', sessaoId: SESSAO },
      relator.token,
    )
    expect(nivel).toMatchObject({ status: 409, corpo: { erro: mensagem } })
    const exp = await chamar(
      experiencia,
      'POST',
      { chamamentoId: CH, propostaId: PROP, descricao: 'X', categorias: ['C'], modalidade: 'outra', inicio: '2020-01-01' },
      relator.token,
    )
    expect(exp).toMatchObject({ status: 409, corpo: { erro: mensagem } })
  })
})
