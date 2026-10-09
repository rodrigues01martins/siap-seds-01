import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import * as rota from '../../api/avaliacao'
import { calcularD1 } from '../../src/domain/d1'
import { calcularD2 } from '../../src/domain/d2'
import { MATRIZ_2026 } from '../../src/domain/matriz'
import {
  CAMINHO_PROPOSTA,
  CH,
  DATA_LIMITE,
  PROP,
  SESSAO,
  auditoriaDe,
  chamar,
  criarUsuario,
  ler,
  limparAuth,
  limparFirestore,
  semCarimbos,
  semearNiveis,
  semearProposta,
  semearSessao,
  totalAuditoria,
  type Usuario,
} from './apoio'

const CODIGOS = MATRIZ_2026.dimensao1.planos.flatMap((p) => p.subcriterios.map((s) => s.codigo))

const registro = (dados: Record<string, unknown> = {}) => ({
  chamamentoId: CH,
  propostaId: PROP,
  codigo: '3.1',
  nivel: 3,
  justificativa: 'Metodologia descrita com fluxos e responsáveis definidos.',
  paginas: [2, 5],
  decisao: 'unanimidade',
  sessaoId: SESSAO,
  ...dados,
})

let relator: Usuario
let presidente: Usuario
let membro: Usuario
let admin: Usuario
let controle: Usuario

beforeAll(async () => {
  await limparAuth()
  ;[relator, presidente, membro, admin, controle] = await Promise.all([
    criarUsuario('relator'),
    criarUsuario('presidente'),
    criarUsuario('membro'),
    criarUsuario('admin'),
    criarUsuario('controle'),
  ])
})

beforeEach(async () => {
  await limparFirestore()
  await semearProposta()
})

describe('/api/avaliacao — acesso', () => {
  it('405, 401 e 403 (admin e controle não registram nível)', async () => {
    const r405 = await chamar(rota, 'GET', undefined, relator.token)
    expect(r405.status).toBe(405)
    expect(r405.headers.get('Allow')).toBe('PUT')
    expect((await chamar(rota, 'PUT', registro(), null)).status).toBe(401)
    expect((await chamar(rota, 'PUT', registro(), admin.token)).status).toBe(403)
    expect((await chamar(rota, 'PUT', registro(), controle.token)).status).toBe(403)
  })

  it.each(['presidente', 'relator', 'membro'] as const)('%s registra nível', async (perfil) => {
    const usuario = { presidente, relator, membro }[perfil]
    expect((await chamar(rota, 'PUT', registro(), usuario.token)).status).toBe(200)
  })
})

describe('/api/avaliacao — validação (400)', () => {
  it.each([
    ['subcritério inexistente', { codigo: '7.1' }, 'codigo', 'Subcritério inexistente na matriz.'],
    ['nível fora da escala', { nivel: 5 }, 'nivel', 'O nível deve ser um inteiro de 0 a 4.'],
    ['página acima do corte do PA3 (8)', { paginas: [9] }, 'paginas', 'Página 9 acima do limite de 8 páginas do PA3.'],
    ['justificativa curta', { justificativa: 'curta' }, 'justificativa', 'A justificativa deve ter ao menos 20 caracteres.'],
    ['voto divergente com unanimidade', { votoDivergente: 'Membro X votou 2.' }, 'votoDivergente', 'Voto divergente só se aplica a decisão por maioria.'],
  ])('%s', async (_caso, ajuste, campo, mensagem) => {
    const r = await chamar(rota, 'PUT', registro(ajuste), relator.token)
    expect(r).toMatchObject({ status: 400, corpo: { campos: { [campo]: mensagem } } })
    expect(await totalAuditoria()).toBe(0)
  })

  it('decisão fora de unanimidade|maioria e nível não inteiro → 400', async () => {
    const r = await chamar(rota, 'PUT', registro({ decisao: 'consenso', nivel: 2.5 }), relator.token)
    expect(r.status).toBe(400)
    expect(Object.keys(r.corpo?.campos ?? {}).sort()).toEqual(['decisao', 'nivel'])
  })

  it('mínimo da justificativa vem do chamamento (configurável)', async () => {
    await semearProposta({ justificativaMinima: 80 })
    const r = await chamar(rota, 'PUT', registro(), relator.token)
    expect(r).toMatchObject({ status: 400, corpo: { campos: { justificativa: 'A justificativa deve ter ao menos 80 caracteres.' } } })
  })

  it('proposta inexistente → 404', async () => {
    const r = await chamar(rota, 'PUT', registro({ propostaId: 'nao-existe' }), relator.token)
    expect(r).toMatchObject({ status: 404, corpo: { erro: 'Proposta não encontrada.' } })
  })
})

describe('/api/avaliacao — gravação, auditoria e recálculo (C4)', () => {
  it('registra o nível e audita com antes = null', async () => {
    const r = await chamar(rota, 'PUT', registro({ decisao: 'maioria', votoDivergente: 'Membro X: nível 2.' }), relator.token)
    expect(r.status).toBe(200)
    expect(await ler(`${CAMINHO_PROPOSTA}/avaliacoes/3.1`)).toMatchObject({
      nivel: 3,
      paginas: [2, 5],
      decisao: 'maioria',
      votoDivergente: 'Membro X: nível 2.',
      sessaoId: SESSAO,
    })
    const [registroAuditoria] = await auditoriaDe(`${CAMINHO_PROPOSTA}/avaliacoes/3.1`)
    expect(registroAuditoria).toMatchObject({ acao: 'criar', antes: null, depois: { nivel: 3 }, uid: relator.uid, perfil: 'relator' })
  })

  it('registrar de novo o mesmo subcritério → editar, com antes e depois', async () => {
    await chamar(rota, 'PUT', registro(), relator.token)
    await chamar(rota, 'PUT', registro({ nivel: 1 }), presidente.token)
    const registros = await auditoriaDe(`${CAMINHO_PROPOSTA}/avaliacoes/3.1`)
    expect(registros[1]).toMatchObject({ acao: 'editar', antes: { nivel: 3 }, depois: { nivel: 1 }, perfil: 'presidente' })
  })

  it('recalcula totais da proposta na mesma gravação (avaliação incompleta → pendente)', async () => {
    const r = await chamar(rota, 'PUT', registro(), relator.token)
    expect(r.corpo?.totais).toMatchObject({ d1: 3, d2: 0, nf: 3, status: 'pendente', completa: false })
    const proposta = await ler(CAMINHO_PROPOSTA)
    expect(proposta?.totais).toMatchObject({ d1: 3, status: 'pendente' })
    expect((await auditoriaDe(CAMINHO_PROPOSTA)).at(-1)).toMatchObject({ acao: 'editar', depois: { totais: { d1: 3 } } })
  })

  it('o resultado gravado é idêntico ao de src/domain para os mesmos dados', async () => {
    const niveis = Object.fromEntries(CODIGOS.map((c, i) => [c, i % 5]))
    const { ['6.4']: ultimo, ...demais } = niveis
    await semearNiveis(demais)
    await chamar(rota, 'PUT', registro({ codigo: '6.4', nivel: ultimo, paginas: [] }), relator.token)

    const d1 = calcularD1(niveis)
    const d2 = calcularD2({ experiencias: [], dataLimite: DATA_LIMITE })
    const proposta = await ler(CAMINHO_PROPOSTA)
    expect(proposta?.totais).toEqual(
      JSON.parse(
        JSON.stringify({
          totaisPorPA: d1.totaisPorPA,
          d1: d1.d1,
          d2: d2.total,
          nf: d1.d1 + d2.total,
          status: d1.status,
          completa: d1.completa,
          pendentes: d1.pendentes,
          motivos: d1.motivos,
        }),
      ),
    )
    expect(semCarimbos(await ler(`${CAMINHO_PROPOSTA}/resultadoD2/atual`))).toEqual(JSON.parse(JSON.stringify(d2)))
  })

  it('completa e com nível 0 em 1.1 → desclassificada', async () => {
    const { ['1.1']: _, ...demais } = Object.fromEntries(CODIGOS.map((c) => [c, 4]))
    await semearNiveis(demais)
    const r = await chamar(rota, 'PUT', registro({ codigo: '1.1', nivel: 0, paginas: [] }), relator.token)
    expect(r.corpo?.totais).toMatchObject({ status: 'desclassificada', completa: true, d1: 108 })
  })
})

describe('/api/avaliacao — exige sessão aberta (Etapa 4a)', () => {
  const mensagem = 'Avaliação só pode ser registrada em sessão aberta da Comissão.'

  it('sessão inexistente → 409, sem gravar nem auditar', async () => {
    const r = await chamar(rota, 'PUT', registro({ sessaoId: 'nao-existe' }), relator.token)
    expect(r).toMatchObject({ status: 409, corpo: { erro: mensagem } })
    expect(await ler(`${CAMINHO_PROPOSTA}/avaliacoes/3.1`)).toBeUndefined()
    expect(await totalAuditoria()).toBe(0)
  })

  it('sessão encerrada → 409', async () => {
    await semearProposta({ sessao: 'encerrada' })
    const r = await chamar(rota, 'PUT', registro(), relator.token)
    expect(r).toMatchObject({ status: 409, corpo: { erro: mensagem } })
    expect(await totalAuditoria()).toBe(0)
  })
})

describe('/api/avaliacao — foco da sessão (Etapa 4b)', () => {
  it('ao salvar, o subcritério vira o foco da sessão, na mesma gravação e auditado', async () => {
    const r = await chamar(rota, 'PUT', registro({ codigo: '2.1' }), membro.token)
    expect(r.status).toBe(200)
    const caminhoSessao = `chamamentos/${CH}/sessoes/${SESSAO}`
    expect((await ler(caminhoSessao))?.foco).toEqual({ tipo: 'subcriterio', propostaId: PROP, subcriterio: '2.1' })
    expect((await auditoriaDe(caminhoSessao)).at(-1)).toMatchObject({
      acao: 'editar',
      depois: { foco: { tipo: 'subcriterio', propostaId: PROP, subcriterio: '2.1' } },
      uid: membro.uid,
    })
  })

  it('proposta fora da pauta da sessão → 409, sem gravar', async () => {
    await semearSessao(SESSAO, { pauta: ['outra-proposta'] })
    const r = await chamar(rota, 'PUT', registro(), relator.token)
    expect(r).toMatchObject({ status: 409, corpo: { erro: 'Proposta fora da pauta da sessão.' } })
    expect(await totalAuditoria()).toBe(0)
  })
})

describe('/api/avaliacao — proposta homologada', () => {
  it('→ 409, sem gravar nem auditar', async () => {
    await semearProposta({ bloqueada: true })
    const r = await chamar(rota, 'PUT', registro(), relator.token)
    expect(r).toMatchObject({ status: 409, corpo: { erro: 'Proposta homologada: alteração não permitida.' } })
    expect(await ler(`${CAMINHO_PROPOSTA}/avaliacoes/3.1`)).toBeUndefined()
    expect(await totalAuditoria()).toBe(0)
  })
})
