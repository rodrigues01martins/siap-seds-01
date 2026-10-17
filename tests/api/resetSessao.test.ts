// Reset da sessão (PATCH /api/sessao, ação "resetar"; prévia GET ?simular=true): descarta tudo o que a
// Comissão gravou com o sessaoId da sessão (admissibilidade, níveis da D1, experiências e desempate), voltando
// cada documento ao "antes" do primeiro registro de auditoria daquela sessão. Diligências não são afetadas.
import { Timestamp } from 'firebase-admin/firestore'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { obterAdmin } from '../../api/_lib/admin'
import { ErroApi } from '../../api/_lib/erros'
import { executarReset } from '../../api/_lib/resetSessao'
import * as admissibilidade from '../../api/admissibilidade'
import * as avaliacao from '../../api/avaliacao'
import * as desempate from '../../api/desempate'
import * as experiencia from '../../api/experiencia'
import * as rota from '../../api/sessao'
import { MATRIZ_2026 } from '../../src/domain/matriz'
import {
  CAMINHO_PROPOSTA,
  CH,
  PROP,
  SESSAO,
  auditoriaDe,
  chamar,
  consultar,
  criarUsuario,
  ler,
  limparAuth,
  limparFirestore,
  semearNiveis,
  semearProposta,
  semearPropostaComTotais,
  semearSessao,
  totalAuditoria,
  type Usuario,
} from './apoio'

const MOTIVO = 'Conflito de interesse declarado após a sessão: a Comissão decidiu refazer as decisões.'
const CAMINHO_SESSAO = `chamamentos/${CH}/sessoes/${SESSAO}`
const CODIGOS = MATRIZ_2026.dimensao1.planos.flatMap((p) => p.subcriterios.map((s) => s.codigo))

let presidente: Usuario
let relator: Usuario
let membro: Usuario
let admin: Usuario
let semPapel: Usuario

beforeAll(async () => {
  await limparAuth()
  ;[presidente, relator, membro, admin, semPapel] = await Promise.all([
    criarUsuario('presidente'),
    criarUsuario('relator'),
    criarUsuario('membro'),
    criarUsuario('admin'),
    // Tem a permissão, mas não é o presidente da Comissão: não reseta.
    criarUsuario('relator', { permissoes: ['consultar', 'resetarSessao'] }),
  ])
})

beforeEach(async () => {
  await limparFirestore()
  await semearProposta()
  await semearSessao(SESSAO, {
    presentes: [{ uid: 'u-presidente', email: 'p@go.gov.br', perfil: 'presidente' }],
    declaracoes: [{ uid: 'u-presidente', semImpedimento: true }],
    foco: { tipo: 'resumo', propostaId: PROP },
  })
})

const resetar = (dados: Record<string, unknown> = {}, token = presidente.token) =>
  chamar(rota, 'PATCH', { acao: 'resetar', chamamentoId: CH, sessaoId: SESSAO, justificativa: MOTIVO, ...dados }, token)
const previa = (token = presidente.token, sessaoId = SESSAO) => consultar(rota, { chamamentoId: CH, sessaoId, simular: 'true' }, token)

async function nivel(codigo: string, valor: number, sessaoId = SESSAO) {
  const r = await chamar(
    avaliacao,
    'PUT',
    { chamamentoId: CH, propostaId: PROP, sessaoId, codigo, nivel: valor, justificativa: `Fundamentação da Comissão para ${codigo}.`, paginas: [1], decisao: 'unanimidade' },
    relator.token,
  )
  expect(r.status).toBe(200)
}

async function novaExperiencia(sessaoId = SESSAO): Promise<string> {
  const r = await chamar(
    experiencia,
    'POST',
    {
      chamamentoId: CH,
      propostaId: PROP,
      sessaoId,
      descricao: 'Gestão do CASE Goiânia',
      categorias: ['A'],
      modalidade: 'internacao',
      mrosc: true,
      inicio: '2019-01-01',
      vagas: 90,
      documentos: [{ tipo: 'Atestado', numeroSEI: '1', comprovaExecucaoSatisfatoria: true, aceito: true }],
    },
    relator.token,
  )
  expect(r.status).toBe(201)
  return r.corpo?.id as string
}

const assinatura = () => ({ uid: presidente.uid, email: presidente.email, perfil: 'usuario' as const })

describe('reset da sessão — acesso e validação', () => {
  it('401 sem login; 403 para relator, membro, admin sem papel de presidente e quem tem a permissão sem ser presidente', async () => {
    await nivel('1.1', 3)
    const antes = await totalAuditoria()
    expect((await resetar({}, null as unknown as string)).status).toBe(401)
    for (const u of [relator, membro, admin, semPapel]) {
      expect((await resetar({}, u.token)).status).toBe(403)
      expect((await previa(u.token)).status).toBe(403)
    }
    expect((await previa(null as unknown as string)).status).toBe(401)
    expect(await totalAuditoria()).toBe(antes)
    expect(await ler(`${CAMINHO_PROPOSTA}/avaliacoes/1.1`)).toBeDefined()
  })

  it('400 sem justificativa ou com menos de 20 caracteres', async () => {
    const { justificativa: _j, ...semJustificativa } = { acao: 'resetar', chamamentoId: CH, sessaoId: SESSAO, justificativa: '' }
    const sem = await chamar(rota, 'PATCH', semJustificativa, presidente.token)
    expect(sem.status).toBe(400)
    expect(sem.corpo?.campos).toHaveProperty('justificativa')
    const curta = await resetar({ justificativa: '  Erro na sessão.  ' })
    expect(curta).toMatchObject({ status: 400, corpo: { campos: { justificativa: 'Justifique com ao menos 20 caracteres.' } } })
  })

  it('sessão inexistente → 404', async () => {
    expect((await resetar({ sessaoId: 'nao-existe' })).status).toBe(404)
  })
})

describe('reset da sessão — reversões', () => {
  it('nível criado na sessão some; nível que existia antes volta ao valor anterior; totais recalculados (volta a "pendente")', async () => {
    // 27 subcritérios já avaliados antes (sem a sessão); na sessão: o 28º (cria) e o 1.1 alterado de 2 para 4.
    const antes = Object.fromEntries(CODIGOS.slice(0, -1).map((c) => [c, c === '1.1' ? 2 : 3]))
    await semearNiveis(antes)
    const ultimo = CODIGOS.at(-1)!
    await nivel(ultimo, 3)
    await nivel('1.1', 4)
    expect(await ler(CAMINHO_PROPOSTA)).toMatchObject({ totais: { completa: true } })

    const r = await resetar()
    expect(r).toMatchObject({ status: 200, corpo: { revertidos: 1, apagados: 1, resets: 1 } })

    expect(await ler(`${CAMINHO_PROPOSTA}/avaliacoes/${ultimo}`)).toBeUndefined()
    expect(await ler(`${CAMINHO_PROPOSTA}/avaliacoes/1.1`)).toMatchObject({ nivel: 2, sessaoId: 's0', justificativa: 'Semente de teste com justificativa suficiente.' })
    const proposta = await ler(CAMINHO_PROPOSTA)
    expect(proposta).toMatchObject({ totais: { status: 'pendente', completa: false, pendentes: [ultimo] } })
  })

  it('experiência criada na sessão some; D2 e totais recalculados', async () => {
    const id = await novaExperiencia()
    expect((await ler(CAMINHO_PROPOSTA))?.totais).toMatchObject({ d2: expect.any(Number) })
    expect(((await ler(CAMINHO_PROPOSTA))?.totais as { d2: number }).d2).toBeGreaterThan(0)

    expect((await resetar()).status).toBe(200)
    expect(await ler(`${CAMINHO_PROPOSTA}/experiencias/${id}`)).toBeUndefined()
    expect(await ler(CAMINHO_PROPOSTA)).toMatchObject({ totais: { d2: 0, status: 'pendente' } })
    expect(await ler(`${CAMINHO_PROPOSTA}/resultadoD2/atual`)).toMatchObject({ total: 0 })
  })

  it('admissibilidade registrada na sessão é desfeita; desempate decidido na sessão é apagado; diligências não mudam', async () => {
    const requisitos = Object.fromEntries(['I', 'II', 'III', 'IV', 'V', 'VI', 'VIII', 'IX', 'X'].map((n) => [`28.1.${n}`, true]))
    const planos = [12, 12, 8, 12, 10, 8].map((limite, i, todos) => {
      const inicio = 3 + todos.slice(0, i).reduce((a, b) => a + b, 0)
      return { codigo: `PA${i + 1}`, ausente: false, paginaInicial: inicio, paginaFinal: inicio + limite - 1 }
    })
    const adm = await chamar(
      admissibilidade,
      'PUT',
      { chamamentoId: CH, propostaId: PROP, sessaoId: SESSAO, requisitos, irregularidadesFormais: [], planos, resultado: 'admitida' },
      relator.token,
    )
    expect(adm.status).toBe(200)

    await semearPropostaComTotais('a', 90)
    await semearPropostaComTotais('b', 84)
    await semearPropostaComTotais('c', 84)
    const d = await chamar(
      desempate,
      'PUT',
      { chamamentoId: CH, sessaoId: SESSAO, loteCodigo: 'L1', ordem: ['c', 'b'], justificativa: 'Critério aplicado pela Comissão: maior pontuação no PA1.' },
      presidente.token,
    )
    expect(d.status).toBe(200)
    const caminhoDesempate = `chamamentos/${CH}/desempates/${d.corpo?.id as string}`
    await obterAdmin().db.doc(`${CAMINHO_PROPOSTA}/diligencias/dl1`).set({ objeto: 'Esclarecer assinatura.', status: 'aberta' })

    expect((await resetar()).status).toBe(200)
    expect(await ler(CAMINHO_PROPOSTA)).not.toHaveProperty('admissibilidade')
    expect(await ler(caminhoDesempate)).toBeUndefined()
    expect(await ler(`${CAMINHO_PROPOSTA}/diligencias/dl1`)).toMatchObject({ objeto: 'Esclarecer assinatura.', status: 'aberta' })
  })

  it('cada reversão vai para a auditoria como "resetar_sessao", com antes, depois, motivo, uid e perfil', async () => {
    await semearNiveis({ '1.1': 2 })
    await nivel('1.1', 4)
    await nivel('1.2', 3)
    expect((await resetar()).status).toBe(200)

    const de11 = (await auditoriaDe(`${CAMINHO_PROPOSTA}/avaliacoes/1.1`)).filter((r) => r.acao === ('resetar_sessao' as string))
    expect(de11).toHaveLength(1)
    expect(de11[0]).toMatchObject({ antes: { nivel: 4 }, depois: { nivel: 2 }, resetDaSessao: SESSAO, justificativa: MOTIVO, uid: presidente.uid, perfil: 'usuario' })
    const de12 = (await auditoriaDe(`${CAMINHO_PROPOSTA}/avaliacoes/1.2`)).filter((r) => r.acao === ('resetar_sessao' as string))
    expect(de12).toEqual([expect.objectContaining({ antes: expect.objectContaining({ nivel: 3 }), depois: null })])
    // O reset não é gravação "da sessão": nada dele leva o sessaoId.
    expect(de12[0]).not.toHaveProperty('sessaoId')
  })

  it('a sessão não é apagada: "reiniciada", com autoria, data, motivo e contador; presentes e declarações preservados; foco limpo', async () => {
    await nivel('1.1', 3)
    expect((await resetar({ justificativa: `  ${MOTIVO}  ` })).status).toBe(200)
    const sessao = await ler(CAMINHO_SESSAO)
    expect(sessao).toMatchObject({
      status: 'reiniciada',
      reiniciadaPor: { uid: presidente.uid, email: presidente.email },
      motivo: MOTIVO,
      resets: 1,
      foco: null,
      presentes: [{ uid: 'u-presidente', perfil: 'presidente' }],
      declaracoes: [{ uid: 'u-presidente', semImpedimento: true }],
    })
    expect(sessao?.reiniciadaEm).toBeInstanceOf(Timestamp)
    expect(sessao?.historicoResets).toEqual([expect.objectContaining({ motivo: MOTIVO, por: { uid: presidente.uid, email: presidente.email } })])
    // Sessão reiniciada não recebe registros.
    const r = await chamar(
      avaliacao,
      'PUT',
      { chamamentoId: CH, propostaId: PROP, sessaoId: SESSAO, codigo: '1.2', nivel: 3, justificativa: 'Tentativa depois do reset.', paginas: [1], decisao: 'unanimidade' },
      relator.token,
    )
    expect(r.status).toBe(409)
  })
})

describe('reset da sessão — prévia e bloqueios', () => {
  it('prévia (GET ?simular=true) lista por proposta o que será revertido e apagado, sem gravar nada', async () => {
    await semearNiveis({ '1.1': 2 })
    await nivel('1.1', 4)
    await nivel('1.2', 3)
    await novaExperiencia()
    const total = await totalAuditoria()

    const r = await previa()
    expect(r.status).toBe(200)
    expect(r.corpo).toMatchObject({ sessaoId: SESSAO, status: 'aberta', bloqueios: [], total: 3 })
    const [p] = r.corpo?.propostas as { propostaId: string; reverter: string[]; apagar: string[] }[]
    expect(p).toMatchObject({ propostaId: PROP, reverter: ['Nível 1.1 da D1'], apagar: ['Nível 1.2 da D1', 'Experiência “Gestão do CASE Goiânia”'] })
    expect(await totalAuditoria()).toBe(total)
    expect(await ler(CAMINHO_SESSAO)).toMatchObject({ status: 'aberta' })
  })

  it('proposta afetada homologada → 409 "Reabra antes de resetar"; prévia mostra o bloqueio; nada muda', async () => {
    await nivel('1.1', 3)
    await obterAdmin().db.doc(CAMINHO_PROPOSTA).update({ bloqueada: true })
    const total = await totalAuditoria()
    const r = await resetar()
    expect(r.status).toBe(409)
    expect(r.corpo?.erro).toContain('Reabra antes de resetar')
    expect((await previa()).corpo?.bloqueios).toEqual([expect.objectContaining({ mensagem: expect.stringContaining('Reabra antes de resetar') })])
    expect(await totalAuditoria()).toBe(total)
    expect(await ler(`${CAMINHO_PROPOSTA}/avaliacoes/1.1`)).toMatchObject({ nivel: 3 })
    expect(await ler(CAMINHO_SESSAO)).toMatchObject({ status: 'aberta' })
  })

  it('registro alterado depois em outra sessão → 409 "Resete primeiro a sessão posterior"; resetada a posterior, libera', async () => {
    await nivel('1.1', 3)
    await obterAdmin().db.doc(CAMINHO_SESSAO).update({ status: 'encerrada' })
    await semearSessao('sessao-2', { status: 'aberta', data: '2026-11-12' })
    await nivel('1.1', 1, 'sessao-2')

    const r = await resetar()
    expect(r.status).toBe(409)
    expect(r.corpo?.erro).toContain('Resete primeiro a sessão posterior')
    expect(r.corpo?.erro).toContain('12/11/2026')
    expect(await ler(`${CAMINHO_PROPOSTA}/avaliacoes/1.1`)).toMatchObject({ nivel: 1 })

    // Resetar a posterior devolve o nível da primeira sessão; aí a primeira pode ser resetada.
    expect((await resetar({ sessaoId: 'sessao-2' })).status).toBe(200)
    expect(await ler(`${CAMINHO_PROPOSTA}/avaliacoes/1.1`)).toMatchObject({ nivel: 3, sessaoId: SESSAO })
    expect((await resetar()).status).toBe(200)
    expect(await ler(`${CAMINHO_PROPOSTA}/avaliacoes/1.1`)).toBeUndefined()
  })
})

describe('reset da sessão — interrupção e repetição (idempotente)', () => {
  it('queda no meio: sessão fica "reiniciando" (sem novos registros); repetir continua de onde parou, sem reverter duas vezes', async () => {
    await nivel('1.1', 3)
    await nivel('1.2', 3)
    await nivel('1.3', 3)

    // 2 escritas por lote = 1 reversão (documento + auditoria); cai depois do primeiro lote.
    const erro = await executarReset(assinatura(), CH, SESSAO, MOTIVO, {
      escritasPorLote: 2,
      aposLote: (n) => {
        if (n === 0) throw new Error('queda simulada')
      },
    }).catch((e: unknown) => e)
    expect(erro).toBeInstanceOf(ErroApi)
    expect((erro as ErroApi).status).toBe(503)

    expect(await ler(CAMINHO_SESSAO)).toMatchObject({ status: 'reiniciando' })
    const restantes = await obterAdmin().db.collection(`${CAMINHO_PROPOSTA}/avaliacoes`).get()
    expect(restantes.size).toBe(2)
    const novo = await chamar(
      avaliacao,
      'PUT',
      { chamamentoId: CH, propostaId: PROP, sessaoId: SESSAO, codigo: '1.4', nivel: 3, justificativa: 'Tentativa durante o reset.', paginas: [1], decisao: 'unanimidade' },
      relator.token,
    )
    expect(novo.status).toBe(409)

    const r = await resetar()
    expect(r).toMatchObject({ status: 200, corpo: { resets: 1 } })
    expect((await obterAdmin().db.collection(`${CAMINHO_PROPOSTA}/avaliacoes`).get()).size).toBe(0)
    for (const codigo of ['1.1', '1.2', '1.3']) {
      const reversoes = (await auditoriaDe(`${CAMINHO_PROPOSTA}/avaliacoes/${codigo}`)).filter((x) => x.acao === ('resetar_sessao' as string))
      expect(reversoes).toHaveLength(1)
    }
    expect(await ler(CAMINHO_SESSAO)).toMatchObject({ status: 'reiniciada', resets: 1 })
  })
})
