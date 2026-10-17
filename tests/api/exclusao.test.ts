import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { obterAdmin } from '../../api/_lib/admin'
import { ErroApi } from '../../api/_lib/erros'
import { alvoChamamento, alvoOsc, alvoProposta, excluirComSeguranca } from '../../api/_lib/exclusao'
import { gravar } from '../../api/_lib/gravar'
import * as rotaChamamentos from '../../api/chamamentos'
import * as rotaOscs from '../../api/oscs'
import * as rotaPropostas from '../../api/propostas'
import {
  auditoriaDe,
  chamar,
  consultar,
  criarUsuario,
  ler,
  limparAuth,
  limparFirestore,
  totalAuditoria,
  type Usuario,
} from './apoio'

const CNPJ = '11222333000181'
const CH = 'ch1'
const P = 'p1'
const PROPOSTA = `chamamentos/${CH}/propostas/${P}`
const JUSTIFICATIVA = 'Cadastro em duplicidade, conforme despacho SEI 95574999.'
const EM_EXCLUSAO = 'Registro em exclusão: alteração não permitida.'
const INCOMPLETA = 'A exclusão foi registrada, mas não terminou. Repita a operação para concluir.'

let admin: Usuario
let cadastrador: Usuario

beforeAll(async () => {
  await limparAuth()
  admin = await criarUsuario('admin')
  // Tem as três permissões de Cadastros, mas não é administrador: excluir é só do admin.
  cadastrador = await criarUsuario('controle', { permissoes: ['consultar', 'chamamentos', 'oscs', 'propostas'] })
})

/** Chamamento com lotes, OSC e uma proposta com subcoleções (inclusive aninhada). */
async function semear(opcoes: { bloqueada?: boolean; proposta?: boolean } = {}): Promise<void> {
  const { db } = obterAdmin()
  await db.doc(`chamamentos/${CH}`).set({
    numero: '001/2026',
    titulo: 'Chamamento',
    lotes: [
      { codigo: 'L1', descricao: 'Lote 1' },
      { codigo: 'L2', descricao: 'Lote 2' },
    ],
  })
  await db.doc(`oscs/${CNPJ}`).set({ cnpj: CNPJ, razaoSocial: 'Instituto Esperança' })
  if (opcoes.proposta === false) return
  await db.doc(PROPOSTA).set({
    loteCodigo: 'L1',
    oscCnpj: CNPJ,
    protocolo: 'PROT-2026-0001',
    numeroSEI: '95574999',
    bloqueada: opcoes.bloqueada ?? false,
    admissibilidade: { situacao: 'admitida' },
  })
  await db.doc(`${PROPOSTA}/avaliacoes/1.1`).set({ nivel: 3, justificativa: 'Atende ao subcritério.' })
  await db.doc(`${PROPOSTA}/avaliacoes/1.2`).set({ nivel: 4, justificativa: 'Atende plenamente.' })
  await db.doc(`${PROPOSTA}/experiencias/e1`).set({ descricao: 'Experiência 1' })
  await db.doc(`${PROPOSTA}/experiencias/e2`).set({ descricao: 'Experiência 2' })
  await db.doc(`${PROPOSTA}/experiencias/e1/documentos/d1`).set({ tipo: 'Relatório', numeroSEI: '123' })
  await db.doc(`${PROPOSTA}/resultadoD2/atual`).set({ total: 12 })
  await db.doc(`${PROPOSTA}/diligencias/dl1`).set({ status: 'encerrada' })
}

async function subcolecoesDe(caminho: string): Promise<string[]> {
  return (await obterAdmin().db.doc(caminho).listCollections()).map((c) => c.id)
}

async function falha(promessa: Promise<unknown>): Promise<ErroApi> {
  const erro = await promessa.catch((e: unknown) => e)
  expect(erro).toBeInstanceOf(ErroApi)
  return erro as ErroApi
}

const quebrar = async (): Promise<void> => {
  throw new Error('falha simulada no recursiveDelete')
}
const assinaturaAdmin = () => ({ uid: admin.uid, email: admin.email, perfil: 'admin' as const })

beforeEach(limparFirestore)

describe('exclusão — acesso e validação', () => {
  it.each([
    ['proposta', rotaPropostas, { chamamentoId: CH, propostaId: P }],
    ['OSC', rotaOscs, { cnpj: CNPJ }],
    ['chamamento', rotaChamamentos, { id: CH }],
  ] as const)('%s: 401 sem login, 403 para quem não é admin (mesmo com a permissão de cadastro)', async (_c, rota, ids) => {
    await semear()
    expect((await chamar(rota, 'DELETE', { ...ids, justificativa: JUSTIFICATIVA }, null)).status).toBe(401)
    expect((await chamar(rota, 'DELETE', { ...ids, justificativa: JUSTIFICATIVA }, cadastrador.token)).status).toBe(403)
    expect((await consultar(rota, { ...ids, simular: 'true' }, null)).status).toBe(401)
    expect((await consultar(rota, { ...ids, simular: 'true' }, cadastrador.token)).status).toBe(403)
    expect(await totalAuditoria()).toBe(0)
  })

  it.each([
    ['proposta', rotaPropostas, { chamamentoId: CH, propostaId: P }],
    ['OSC', rotaOscs, { cnpj: CNPJ }],
    ['chamamento', rotaChamamentos, { id: CH }],
  ] as const)('%s: 400 sem justificativa ou com menos de 20 caracteres', async (_c, rota, ids) => {
    await semear({ proposta: false })
    const sem = await chamar(rota, 'DELETE', ids, admin.token)
    expect(sem.status).toBe(400)
    expect(sem.corpo?.campos).toHaveProperty('justificativa')
    const curta = await chamar(rota, 'DELETE', { ...ids, justificativa: '   Duplicado no SEI.   ' }, admin.token)
    expect(curta).toMatchObject({ status: 400, corpo: { campos: { justificativa: 'Justifique com ao menos 20 caracteres.' } } })
    expect(await totalAuditoria()).toBe(0)
  })

  it('registro inexistente → 404', async () => {
    const r = await chamar(rotaPropostas, 'DELETE', { chamamentoId: CH, propostaId: 'nao-existe', justificativa: JUSTIFICATIVA }, admin.token)
    expect(r.status).toBe(404)
    expect((await chamar(rotaOscs, 'DELETE', { cnpj: '11.444.777/0001-61', justificativa: JUSTIFICATIVA }, admin.token)).status).toBe(404)
    expect((await chamar(rotaChamamentos, 'DELETE', { id: 'nao-existe', justificativa: JUSTIFICATIVA }, admin.token)).status).toBe(404)
  })

  it('prévia sem simular=true → 400', async () => {
    await semear()
    expect((await consultar(rotaPropostas, { chamamentoId: CH, propostaId: P }, admin.token)).status).toBe(400)
  })
})

describe('exclusão de proposta', () => {
  it('prévia (GET ?simular=true): contagem por subcoleção, sem bloqueio e sem gravar nada', async () => {
    await semear()
    const r = await consultar(rotaPropostas, { chamamentoId: CH, propostaId: P, simular: 'true' }, admin.token)
    expect(r).toMatchObject({
      status: 200,
      corpo: {
        caminho: PROPOSTA,
        existe: true,
        emExclusao: false,
        subcolecoes: { avaliacoes: 2, experiencias: 2, 'experiencias/documentos': 1, resultadoD2: 1, diligencias: 1 },
        total: 8,
        bloqueios: [],
      },
    })
    expect(await totalAuditoria()).toBe(0)
    expect(await ler(PROPOSTA)).not.toHaveProperty('status')
  })

  it('homologada → 409 "Reabra a proposta antes de excluir"; a prévia mostra o bloqueio; nada muda', async () => {
    await semear({ bloqueada: true })
    const r = await chamar(rotaPropostas, 'DELETE', { chamamentoId: CH, propostaId: P, justificativa: JUSTIFICATIVA }, admin.token)
    expect(r.status).toBe(409)
    expect(r.corpo?.erro).toContain('Reabra a proposta antes de excluir')

    const previa = await consultar(rotaPropostas, { chamamentoId: CH, propostaId: P, simular: 'true' }, admin.token)
    expect(previa.corpo?.bloqueios).toEqual([expect.objectContaining({ mensagem: expect.stringContaining('Reabra a proposta antes de excluir') })])
    expect(await ler(PROPOSTA)).not.toHaveProperty('status')
    expect(await subcolecoesDe(PROPOSTA)).toHaveLength(4)
    expect(await totalAuditoria()).toBe(0)
  })

  it('apaga a proposta e TODAS as subcoleções; auditoria "excluir" com fotografia completa', async () => {
    await semear()
    const r = await chamar(rotaPropostas, 'DELETE', { chamamentoId: CH, propostaId: P, justificativa: `  ${JUSTIFICATIVA}  ` }, admin.token)
    expect(r).toMatchObject({ status: 200, corpo: { caminho: PROPOSTA, total: 8, subcolecoes: { avaliacoes: 2 } } })

    expect(await ler(PROPOSTA)).toBeUndefined()
    expect(await subcolecoesDe(PROPOSTA)).toEqual([])
    expect(await ler(`${PROPOSTA}/experiencias/e1/documentos/d1`)).toBeUndefined()
    expect(await ler(`chamamentos/${CH}`)).toBeDefined()

    const registros = await auditoriaDe(PROPOSTA)
    expect(registros).toHaveLength(1)
    expect(registros[0]).toMatchObject({
      acao: 'excluir',
      antes: { protocolo: 'PROT-2026-0001', oscCnpj: CNPJ, admissibilidade: { situacao: 'admitida' } },
      depois: null,
      justificativa: JUSTIFICATIVA,
      uid: admin.uid,
      perfil: 'admin',
      subcolecoes: {
        avaliacoes: { '1.1': { dados: { nivel: 3 } }, '1.2': { dados: { nivel: 4 } } },
        experiencias: {
          e1: { dados: { descricao: 'Experiência 1' }, subcolecoes: { documentos: { d1: { dados: { tipo: 'Relatório' } } } } },
          e2: { dados: { descricao: 'Experiência 2' } },
        },
        resultadoD2: { atual: { dados: { total: 12 } } },
        diligencias: { dl1: { dados: { status: 'encerrada' } } },
      },
    })
    expect(registros[0]!.antes).not.toHaveProperty('status')
  })

  it('falha no recursiveDelete: fica "excluindo", recusa escritas (409) e a repetição conclui', async () => {
    await semear()
    const erro = await falha(excluirComSeguranca(assinaturaAdmin(), alvoProposta(CH, P), JUSTIFICATIVA, { apagar: quebrar }))
    expect(erro.status).toBe(503)
    expect(erro.message).toBe(INCOMPLETA)

    expect(await ler(PROPOSTA)).toMatchObject({ status: 'excluindo', protocolo: 'PROT-2026-0001' })
    expect(await subcolecoesDe(PROPOSTA)).toHaveLength(4)

    // Toda escrita no documento "excluindo" ou abaixo dele é recusada (trava do gravar).
    const editar = await chamar(rotaPropostas, 'PATCH', { chamamentoId: CH, propostaId: P, protocolo: 'OUTRO' }, admin.token)
    expect(editar).toMatchObject({ status: 409, corpo: { erro: EM_EXCLUSAO } })
    const avaliar = await falha(gravar(assinaturaAdmin(), () => [{ caminho: `${PROPOSTA}/avaliacoes/1.3`, acao: 'criar', dados: { nivel: 2 } }]))
    expect(avaliar).toMatchObject({ status: 409, message: EM_EXCLUSAO })

    const previa = await consultar(rotaPropostas, { chamamentoId: CH, propostaId: P, simular: 'true' }, admin.token)
    expect(previa.corpo).toMatchObject({ existe: true, emExclusao: true })

    const r = await chamar(rotaPropostas, 'DELETE', { chamamentoId: CH, propostaId: P, justificativa: JUSTIFICATIVA }, admin.token)
    expect(r.status).toBe(200)
    expect(await ler(PROPOSTA)).toBeUndefined()
    expect(await subcolecoesDe(PROPOSTA)).toEqual([])
    // A fotografia é a da primeira tentativa (completa): a repetição não grava outra.
    const registros = await auditoriaDe(PROPOSTA)
    expect(registros).toHaveLength(1)
    expect(registros[0]!.subcolecoes).toHaveProperty('avaliacoes')
  })
})

describe('exclusão de OSC', () => {
  it('com propostas vinculadas → 409 informando quantas e quais; a prévia lista cada uma', async () => {
    await semear()
    const { db } = obterAdmin()
    await db.doc('chamamentos/ch2').set({ numero: '002/2026', titulo: 'Outro', lotes: [{ codigo: 'L1', descricao: 'Lote 1' }] })
    await db.doc('chamamentos/ch2/propostas/p9').set({ loteCodigo: 'L1', oscCnpj: CNPJ, protocolo: 'PROT-2026-0099', bloqueada: false })
    await db.doc('chamamentos/ch2/propostas/p8').set({ loteCodigo: 'L1', oscCnpj: '11444777000161', protocolo: 'PROT-OUTRA', bloqueada: false })

    const r = await chamar(rotaOscs, 'DELETE', { cnpj: '11.222.333/0001-81', justificativa: JUSTIFICATIVA }, admin.token)
    expect(r.status).toBe(409)
    expect(r.corpo?.erro).toContain('2 propostas vinculadas')
    expect(r.corpo?.erro).toContain('PROT-2026-0001')
    expect(r.corpo?.erro).toContain('PROT-2026-0099')
    expect(r.corpo?.erro).not.toContain('PROT-OUTRA')

    const previa = await consultar(rotaOscs, { cnpj: CNPJ, simular: 'true' }, admin.token)
    expect(previa.corpo?.bloqueios).toHaveLength(1)
    expect((previa.corpo?.bloqueios as { itens: string[] }[])[0]!.itens).toHaveLength(2)
    expect(await ler(`oscs/${CNPJ}`)).not.toHaveProperty('status')
    expect(await totalAuditoria()).toBe(0)
  })

  it('sem propostas → apaga e audita', async () => {
    await semear({ proposta: false })
    const r = await chamar(rotaOscs, 'DELETE', { cnpj: '11.222.333/0001-81', justificativa: JUSTIFICATIVA }, admin.token)
    expect(r).toMatchObject({ status: 200, corpo: { caminho: `oscs/${CNPJ}`, total: 1, subcolecoes: {} } })
    expect(await ler(`oscs/${CNPJ}`)).toBeUndefined()
    const [registro] = await auditoriaDe(`oscs/${CNPJ}`)
    expect(registro).toMatchObject({ acao: 'excluir', antes: { razaoSocial: 'Instituto Esperança' }, justificativa: JUSTIFICATIVA, perfil: 'admin' })
  })

  it('OSC "excluindo" não recebe proposta nova nem edição (409)', async () => {
    await semear({ proposta: false })
    await falha(excluirComSeguranca(assinaturaAdmin(), alvoOsc(CNPJ), JUSTIFICATIVA, { apagar: quebrar }))
    const proposta = await chamar(
      rotaPropostas,
      'POST',
      { chamamentoId: CH, loteCodigo: 'L1', oscCnpj: CNPJ, protocolo: 'PROT-NOVA', numeroSEI: '1' },
      admin.token,
    )
    expect(proposta).toMatchObject({ status: 409, corpo: { erro: EM_EXCLUSAO } })
    const editar = await chamar(rotaOscs, 'PATCH', { cnpj: CNPJ, razaoSocial: 'Novo nome' }, admin.token)
    expect(editar).toMatchObject({ status: 409, corpo: { erro: EM_EXCLUSAO } })

    expect((await chamar(rotaOscs, 'DELETE', { cnpj: CNPJ, justificativa: JUSTIFICATIVA }, admin.token)).status).toBe(200)
    expect(await ler(`oscs/${CNPJ}`)).toBeUndefined()
  })
})

describe('exclusão de chamamento', () => {
  it('com propostas → 409', async () => {
    await semear()
    const r = await chamar(rotaChamamentos, 'DELETE', { id: CH, justificativa: JUSTIFICATIVA }, admin.token)
    expect(r.status).toBe(409)
    expect(r.corpo?.erro).toContain('1 proposta')
    expect(await ler(`chamamentos/${CH}`)).not.toHaveProperty('status')
  })

  it('com sessões → 409; a prévia lista os dois bloqueios', async () => {
    await semear()
    await obterAdmin().db.doc(`chamamentos/${CH}/sessoes/s1`).set({ data: '2026-11-10', status: 'encerrada' })
    const r = await chamar(rotaChamamentos, 'DELETE', { id: CH, justificativa: JUSTIFICATIVA }, admin.token)
    expect(r.status).toBe(409)
    expect(r.corpo?.erro).toContain('1 sessão')

    const previa = await consultar(rotaChamamentos, { id: CH, simular: 'true' }, admin.token)
    expect(previa.corpo?.bloqueios).toHaveLength(2)
  })

  it('só sessões (sem propostas) também bloqueia', async () => {
    await semear({ proposta: false })
    await obterAdmin().db.doc(`chamamentos/${CH}/sessoes/s1`).set({ data: '2026-11-10', status: 'encerrada' })
    expect((await chamar(rotaChamamentos, 'DELETE', { id: CH, justificativa: JUSTIFICATIVA }, admin.token)).status).toBe(409)
  })

  it('sem propostas nem sessões → apaga o chamamento e seus lotes, com auditoria', async () => {
    await semear({ proposta: false })
    const r = await chamar(rotaChamamentos, 'DELETE', { id: CH, justificativa: JUSTIFICATIVA }, admin.token)
    expect(r).toMatchObject({ status: 200, corpo: { caminho: `chamamentos/${CH}`, total: 1 } })
    expect(await ler(`chamamentos/${CH}`)).toBeUndefined()
    expect(await subcolecoesDe(`chamamentos/${CH}`)).toEqual([])
    const [registro] = await auditoriaDe(`chamamentos/${CH}`)
    expect(registro).toMatchObject({
      acao: 'excluir',
      antes: { numero: '001/2026', lotes: [{ codigo: 'L1' }, { codigo: 'L2' }] },
      justificativa: JUSTIFICATIVA,
      uid: admin.uid,
    })
  })

  it('chamamento "excluindo" não recebe proposta nem sessão (409); repetição conclui', async () => {
    await semear({ proposta: false })
    await falha(excluirComSeguranca(assinaturaAdmin(), alvoChamamento(CH), JUSTIFICATIVA, { apagar: quebrar }))
    const proposta = await chamar(
      rotaPropostas,
      'POST',
      { chamamentoId: CH, loteCodigo: 'L1', oscCnpj: CNPJ, protocolo: 'PROT-NOVA', numeroSEI: '1' },
      admin.token,
    )
    expect(proposta).toMatchObject({ status: 409, corpo: { erro: EM_EXCLUSAO } })
    const sessao = await falha(gravar(assinaturaAdmin(), () => [{ caminho: `chamamentos/${CH}/sessoes/s9`, acao: 'criar', dados: { status: 'aberta' } }]))
    expect(sessao.status).toBe(409)

    expect((await chamar(rotaChamamentos, 'DELETE', { id: CH, justificativa: JUSTIFICATIVA }, admin.token)).status).toBe(200)
    expect(await ler(`chamamentos/${CH}`)).toBeUndefined()
    expect(await auditoriaDe(`chamamentos/${CH}`)).toHaveLength(1)
  })
})
