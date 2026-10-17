import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { obterAdmin } from '../../api/_lib/admin'
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
  autoria,
  chamar,
  criarUsuario,
  ler,
  limparAuth,
  limparFirestore,
  semCarimbos,
  semearNiveis,
  semearProposta,
  semearSessao,
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
  sessaoId: SESSAO,
  ...dados,
})

let presidente: Usuario
let admin: Usuario
let antigo: Usuario

beforeAll(async () => {
  await limparAuth()
  ;[presidente, admin, antigo] = await Promise.all([criarUsuario('presidente'), criarUsuario('admin'), criarUsuario('antigo')])
})

beforeEach(async () => {
  await limparFirestore()
  await semearProposta()
})

describe('/api/avaliacao — acesso', () => {
  it('405, 401 e 403 (cadastro antigo, sem perfil)', async () => {
    const r405 = await chamar(rota, 'POST', undefined, presidente.token)
    expect(r405.status).toBe(405)
    expect(r405.headers.get('Allow')).toBe('GET, PUT, DELETE')
    expect((await chamar(rota, 'PUT', registro(), null)).status).toBe(401)
    expect((await chamar(rota, 'PUT', registro(), antigo.token)).status).toBe(403)
  })

  it.each(['presidente', 'admin'] as const)('%s registra nível', async (perfil) => {
    const usuario = { presidente, admin }[perfil]
    expect((await chamar(rota, 'PUT', registro(), usuario.token)).status).toBe(200)
  })
})

describe('/api/avaliacao — validação (400)', () => {
  it.each([
    ['subcritério inexistente', { codigo: '7.1' }, 'codigo', 'Subcritério inexistente na matriz.'],
    ['nível fora da escala', { nivel: 5 }, 'nivel', 'O nível deve ser um inteiro de 0 a 4.'],
    ['página acima do corte do PA3 (8)', { paginas: [9] }, 'paginas', 'Página 9 acima do limite de 8 páginas do PA3.'],
    ['nível em texto', { nivel: '3' }, 'nivel', 'O nível deve ser um inteiro de 0 a 4.'],
    ['página não inteira', { paginas: [0] }, 'paginas', 'As páginas devem ser números inteiros a partir de 1.'],
    ['decisão (removida)', { decisao: 'maioria' }, 'decisao', 'Campo não permitido.'],
    ['voto divergente (removido)', { votoDivergente: 'Membro X votou 2.' }, 'votoDivergente', 'Campo não permitido.'],
  ])('%s', async (_caso, ajuste, campo, mensagem) => {
    const r = await chamar(rota, 'PUT', registro(ajuste), presidente.token)
    expect(r).toMatchObject({ status: 400, corpo: { campos: { [campo]: mensagem } } })
    expect(await ler(`${CAMINHO_PROPOSTA}/avaliacoes/3.1`)).toBeUndefined()
  })

  it('nível não inteiro → 400', async () => {
    const r = await chamar(rota, 'PUT', registro({ nivel: 2.5 }), presidente.token)
    expect(r.status).toBe(400)
    expect(Object.keys(r.corpo?.campos ?? {})).toEqual(['nivel'])
  })

  it('só o subcritério, sem nível, justificativa nem páginas → 400', async () => {
    const r = await chamar(rota, 'PUT', { chamamentoId: CH, propostaId: PROP, sessaoId: SESSAO, codigo: '3.1' }, presidente.token)
    expect(r).toMatchObject({ status: 400, corpo: { erro: 'Informe o nível, a justificativa ou as páginas.' } })
  })

  it('proposta inexistente → 404', async () => {
    const r = await chamar(rota, 'PUT', registro({ propostaId: 'nao-existe' }), presidente.token)
    expect(r).toMatchObject({ status: 404, corpo: { erro: 'Proposta não encontrada.' } })
  })
})

describe('/api/avaliacao — gravação e recálculo (C4)', () => {
  it('registra nível, justificativa, páginas e sessaoId, com atualizadoPor (sem decisão nem voto divergente)', async () => {
    const r = await chamar(rota, 'PUT', registro(), presidente.token)
    expect(r.status).toBe(200)
    const avaliacao = await ler(`${CAMINHO_PROPOSTA}/avaliacoes/3.1`)
    expect(avaliacao).toMatchObject({ nivel: 3, paginas: [2, 5], sessaoId: SESSAO, atualizadoPor: autoria(presidente) })
    expect(avaliacao).not.toHaveProperty('decisao')
    expect(avaliacao).not.toHaveProperty('votoDivergente')
  })

  it('registrar de novo o mesmo subcritério substitui o nível e a autoria', async () => {
    await chamar(rota, 'PUT', registro(), presidente.token)
    await chamar(rota, 'PUT', registro({ nivel: 1 }), admin.token)
    expect(await ler(`${CAMINHO_PROPOSTA}/avaliacoes/3.1`)).toMatchObject({ nivel: 1, atualizadoPor: autoria(admin) })
  })

  it('recalcula totais da proposta na mesma gravação (avaliação incompleta → pendente)', async () => {
    const r = await chamar(rota, 'PUT', registro(), presidente.token)
    expect(r.corpo?.totais).toMatchObject({ d1: 3, d2: 0, nf: 3, status: 'pendente', completa: false })
    const proposta = await ler(CAMINHO_PROPOSTA)
    expect(proposta?.totais).toMatchObject({ d1: 3, status: 'pendente' })
  })

  it('o resultado gravado é idêntico ao de src/domain para os mesmos dados', async () => {
    const niveis = Object.fromEntries(CODIGOS.map((c, i) => [c, i % 5]))
    const { ['6.4']: ultimo, ...demais } = niveis
    await semearNiveis(demais)
    await chamar(rota, 'PUT', registro({ codigo: '6.4', nivel: ultimo, paginas: [] }), presidente.token)

    const d1 = calcularD1(niveis)
    const d2 = calcularD2({ experiencias: [], dataLimite: DATA_LIMITE })
    const proposta = await ler(CAMINHO_PROPOSTA)
    expect(proposta?.totais).toEqual(
      JSON.parse(
        JSON.stringify({
          totaisPorPA: d1.totaisPorPA,
          d1: d1.d1,
          d2: d2.total,
          d2PorCriterio: { 'C2.1': 0, 'C2.2': 0, 'C2.3': 0, 'C2.4': 0 },
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
    const r = await chamar(rota, 'PUT', registro({ codigo: '1.1', nivel: 0, paginas: [] }), presidente.token)
    expect(r.corpo?.totais).toMatchObject({ status: 'desclassificada', completa: true, d1: 108 })
  })
})

describe('/api/avaliacao — salvamento automático: campos parciais mesclados (Simplificação 3/4)', () => {
  const caminho = `${CAMINHO_PROPOSTA}/avaliacoes/3.1`
  const parcial = (campos: Record<string, unknown>) => ({ chamamentoId: CH, propostaId: PROP, sessaoId: SESSAO, codigo: '3.1', ...campos })

  it('só o nível (clique no botão 0–4): grava na hora, com justificativa vazia e sem páginas', async () => {
    const r = await chamar(rota, 'PUT', parcial({ nivel: 3 }), presidente.token)
    expect(r).toMatchObject({ status: 200, corpo: { codigo: '3.1', totais: { d1: 3, status: 'pendente' } } })
    expect(await ler(caminho)).toMatchObject({ nivel: 3, justificativa: '', paginas: [], sessaoId: SESSAO })
  })

  it('só a justificativa, ainda curta (pendência, conferida ao concluir): grava sem nível; D1 não conta o subcritério', async () => {
    const r = await chamar(rota, 'PUT', parcial({ justificativa: 'Fluxos descritos' }), presidente.token)
    expect(r).toMatchObject({ status: 200, corpo: { totais: { d1: 0, pendentes: expect.arrayContaining(['3.1']) } } })
    expect(await ler(caminho)).toMatchObject({ nivel: null, justificativa: 'Fluxos descritos', paginas: [] })
  })

  it('mescla com o que já está gravado: nível, depois justificativa, depois páginas', async () => {
    await chamar(rota, 'PUT', parcial({ nivel: 2 }), presidente.token)
    await chamar(rota, 'PUT', parcial({ justificativa: 'Metodologia descrita com fluxos e responsáveis.' }), admin.token)
    await chamar(rota, 'PUT', parcial({ paginas: [5, 2, 5] }), presidente.token)
    expect(await ler(caminho)).toMatchObject({
      nivel: 2,
      justificativa: 'Metodologia descrita com fluxos e responsáveis.',
      paginas: [2, 5],
      atualizadoPor: autoria(presidente),
    })
  })

  it('nível null desmarca o nível (volta a pendente) e mantém a justificativa', async () => {
    await chamar(rota, 'PUT', registro(), presidente.token)
    const r = await chamar(rota, 'PUT', parcial({ nivel: null }), presidente.token)
    expect(r.corpo?.totais).toMatchObject({ d1: 0 })
    expect(await ler(caminho)).toMatchObject({ nivel: null, justificativa: registro().justificativa })
  })

  it('mínimo da justificativa (do chamamento) não bloqueia a gravação', async () => {
    await semearProposta({ justificativaMinima: 80 })
    expect((await chamar(rota, 'PUT', registro(), presidente.token)).status).toBe(200)
  })
})

describe('/api/avaliacao — exige sessão aberta (Etapa 4a)', () => {
  const mensagem = 'Avaliação só pode ser registrada em sessão aberta da Comissão.'

  it('sessão inexistente → 409, sem gravar', async () => {
    const r = await chamar(rota, 'PUT', registro({ sessaoId: 'nao-existe' }), presidente.token)
    expect(r).toMatchObject({ status: 409, corpo: { erro: mensagem } })
    expect(await ler(`${CAMINHO_PROPOSTA}/avaliacoes/3.1`)).toBeUndefined()
  })

  it('sessão encerrada → 409', async () => {
    await semearProposta({ sessao: 'encerrada' })
    const r = await chamar(rota, 'PUT', registro(), presidente.token)
    expect(r).toMatchObject({ status: 409, corpo: { erro: mensagem } })
    expect(await ler(`${CAMINHO_PROPOSTA}/avaliacoes/3.1`)).toBeUndefined()
  })
})

describe('/api/avaliacao — pauta e foco da sessão', () => {
  it('salvar não mexe no foco do telão (quem projeta é o interruptor "Projetar" da tela)', async () => {
    const caminhoSessao = `chamamentos/${CH}/sessoes/${SESSAO}`
    await obterAdmin().db.doc(caminhoSessao).update({ foco: { tipo: 'd2', propostaId: PROP } })
    expect((await chamar(rota, 'PUT', registro({ codigo: '2.1' }), admin.token)).status).toBe(200)
    expect((await ler(caminhoSessao))?.foco).toEqual({ tipo: 'd2', propostaId: PROP })
  })

  it('proposta fora da pauta da sessão → 409, sem gravar', async () => {
    await semearSessao(SESSAO, { lotes: ['L2'] })
    const r = await chamar(rota, 'PUT', registro(), presidente.token)
    expect(r).toMatchObject({ status: 409, corpo: { erro: 'Proposta fora da pauta da sessão.' } })
    expect(await ler(`${CAMINHO_PROPOSTA}/avaliacoes/3.1`)).toBeUndefined()
  })
})

describe('/api/avaliacao — sem trava de homologação', () => {
  it('proposta com bloqueada=true (homologação antiga) aceita o registro', async () => {
    await obterAdmin().db.doc(CAMINHO_PROPOSTA).set({ bloqueada: true }, { merge: true })
    expect((await chamar(rota, 'PUT', registro(), presidente.token)).status).toBe(200)
  })
})
