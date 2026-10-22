// "Replicar para outro lote" (D2): copia as experiências de uma proposta para a proposta da mesma OSC no outro lote
// do mesmo chamamento, nos dois sentidos (L1 → L2 e L2 → L1), sem tocar na origem.
// GET /api/experiencia?replicar=true&chamamentoId&propostaId[&propostaDestinoId]: prévia, sem gravar nada.
// POST /api/experiencia { acao: 'replicar', chamamentoId, propostaId, sessaoId, propostaDestinoId? }: numa transação,
// copia os dados cadastrais e documentais (documentos com aceito = false, desconsiderações vazias, ids novos, sessaoId
// do destino), não duplica experiências equivalentes já presentes no destino, recalcula a D2 do destino e desfaz a
// conclusão só do destino.
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { obterAdmin } from '../../api/_lib/admin'
import * as rota from '../../api/experiencia'
import { calcularD2 } from '../../src/domain/d2'
import { paraExperiencia } from '../../src/esquemas/experiencia'
import { CH, DATA_LIMITE, PRESENTES, SESSAO, autoria, chamar, consultar, criarUsuario, limparAuth, limparFirestore, semCarimbos, type Usuario } from './apoio'

const OSC = '11222333000181'
const OUTRA_OSC = '22333444000181'
const P1 = 'p-l1' // OSC, lote L1
const P2 = 'p-l2' // mesma OSC, lote L2
const P3 = 'p-outra' // outra OSC, lote L2
const CH2 = 'ch2'
const P4 = 'p-ch2' // mesma OSC, outro chamamento
const caminho = (p: string, ch = CH) => `chamamentos/${ch}/propostas/${p}`

const EXP_A = {
  descricao: 'Gestão do CASE Goiânia',
  categorias: ['A', 'D'],
  modalidade: 'internacao',
  orgaoParceiro: 'SEDS/GO',
  instrumento: 'Termo de Colaboração nº 01/2019',
  mrosc: true,
  inicio: '2019-01-01',
  fim: null,
  vagas: 90,
  unidades: 2,
  trabalhadores: 70,
  valorAnualCentavos: 1_200_000_000,
  documentos: [
    { tipo: 'Termo de Colaboração', numeroSEI: '000012345', comprovaExecucaoSatisfatoria: false, aceito: true },
    { tipo: 'Atestado de capacidade técnica', numeroSEI: '000067890', comprovaExecucaoSatisfatoria: true, aceito: true },
  ],
  desconsideracoes: [{ criterio: 'C2.3', justificativa: 'Valor não comprovado.' }],
}
const EXP_B = {
  descricao: 'Acolhimento institucional',
  categorias: ['B'],
  modalidade: 'acolhimento',
  mrosc: false,
  inicio: '2016-03-01',
  fim: '2020-12-31',
  vagas: 20,
  unidades: null,
  trabalhadores: null,
  valorAnualCentavos: null,
  documentos: [{ tipo: 'Relatório de execução', numeroSEI: '000011111', comprovaExecucaoSatisfatoria: true, aceito: true }],
  desconsideracoes: [],
}
/** Campos cadastrais e documentais que a replicação copia (sem aceito, desconsiderações, sessão e autoria). */
const CAMPOS = ['descricao', 'categorias', 'modalidade', 'orgaoParceiro', 'instrumento', 'mrosc', 'inicio', 'fim', 'vagas', 'unidades', 'trabalhadores', 'valorAnualCentavos'] as const

let presidente: Usuario
let antigo: Usuario

const db = () => obterAdmin().db

async function semear(): Promise<void> {
  const chamamento = { numero: '001/2026', titulo: 'Chamamento', dataLimitePropostas: DATA_LIMITE, lotes: [{ codigo: 'L1', descricao: 'Lote I' }, { codigo: 'L2', descricao: 'Lote II' }] }
  await db().doc(`chamamentos/${CH}`).set(chamamento)
  await db().doc(`chamamentos/${CH2}`).set({ ...chamamento, numero: '002/2026' })
  await db().doc(`oscs/${OSC}`).set({ cnpj: OSC, razaoSocial: 'Instituto Esperança' })
  await db().doc(`oscs/${OUTRA_OSC}`).set({ cnpj: OUTRA_OSC, razaoSocial: 'Outra OSC' })
  await db().doc(caminho(P1)).set({ loteCodigo: 'L1', oscCnpj: OSC })
  await db().doc(caminho(P2)).set({ loteCodigo: 'L2', oscCnpj: OSC })
  await db().doc(caminho(P3)).set({ loteCodigo: 'L2', oscCnpj: OUTRA_OSC })
  await db().doc(caminho(P4, CH2)).set({ loteCodigo: 'L2', oscCnpj: OSC })
  await db().doc(`chamamentos/${CH}/sessoes/${SESSAO}`).set({ data: '2026-11-10', lotes: ['L1', 'L2'], status: 'aberta', presentes: PRESENTES, foco: null })
}

async function semearExperiencia(p: string, id: string, dados: Record<string, unknown>, ch = CH): Promise<void> {
  await db().doc(`${caminho(p, ch)}/experiencias/${id}`).set({ ...dados, sessaoId: 's-antiga', atualizadoPor: { nome: 'Origem', email: 'origem@go.gov.br' } })
}

async function experiencias(p: string): Promise<Record<string, Record<string, unknown>>> {
  const docs = (await db().collection(`${caminho(p)}/experiencias`).get()).docs
  return Object.fromEntries(docs.map((d) => [d.id, d.data()]))
}

/** Tudo o que existe na proposta (documento, experiências e resultado da D2), para comparar antes e depois. */
async function fotografia(p: string): Promise<unknown> {
  const proposta = (await db().doc(caminho(p)).get()).data()
  const resultado = (await db().doc(`${caminho(p)}/resultadoD2/atual`).get()).data() ?? null
  return JSON.parse(JSON.stringify({ proposta, resultado, experiencias: await experiencias(p) }))
}

const replicar = (dados: Record<string, unknown> = {}, usuario: Usuario | null = presidente) =>
  chamar(rota, 'POST', { acao: 'replicar', chamamentoId: CH, propostaId: P1, sessaoId: SESSAO, ...dados }, usuario?.token ?? null)

const previa = (dados: Record<string, string> = {}) =>
  consultar(rota, { replicar: 'true', chamamentoId: CH, propostaId: P1, ...dados }, presidente.token)

/** Campos da cópia que devem ser iguais aos da origem. */
const cadastrais = (e: Record<string, unknown>) => Object.fromEntries(CAMPOS.filter((c) => c in e).map((c) => [c, e[c]]))

beforeAll(async () => {
  await limparAuth()
  ;[presidente, antigo] = await Promise.all([criarUsuario('presidente'), criarUsuario('antigo')])
})

beforeEach(async () => {
  await limparFirestore()
  await semear()
  await semearExperiencia(P1, 'a', EXP_A)
  await semearExperiencia(P1, 'b', EXP_B)
})

describe('replicar para outro lote — prévia (GET ?replicar=true)', () => {
  it('OSC, lotes de origem e destino, experiências, documentos, quantas serão copiadas e quantas já existem; sem gravar', async () => {
    await semearExperiencia(P2, 'existente', { ...EXP_B, descricao: 'Outra experiência do destino', inicio: '2010-01-01' })
    const antes = await fotografia(P2)
    const r = await previa()
    expect(r).toMatchObject({
      status: 200,
      corpo: {
        osc: { cnpj: OSC, razaoSocial: 'Instituto Esperança' },
        origem: { propostaId: P1, lote: 'L1' },
        destino: { propostaId: P2, lote: 'L2' },
        experiencias: 2,
        documentos: 3,
        copiar: 2,
        equivalentes: 0,
        existentesNoDestino: 1,
      },
    })
    expect(await fotografia(P2)).toEqual(antes)
  })

  it('sem proposta da mesma OSC em outro lote → 409 com a explicação', async () => {
    await db().doc(caminho(P2)).delete()
    expect(await previa()).toMatchObject({ status: 409, corpo: { erro: 'Não há proposta desta OSC em outro lote deste chamamento.' } })
  })
})

describe('replicar para outro lote — cópia (POST { acao: "replicar" })', () => {
  it('Lote I → Lote II: copia dados cadastrais e documentais, com ids novos, aceito = false, sem desconsiderações e com o sessaoId do destino', async () => {
    const r = await replicar()
    expect(r).toMatchObject({ status: 200, corpo: { propostaDestinoId: P2, copiadas: 2, equivalentes: 0, existentesNoDestino: 0 } })

    const destino = Object.values(await experiencias(P2))
    expect(Object.keys(await experiencias(P2)).some((id) => id === 'a' || id === 'b')).toBe(false)
    expect(destino).toHaveLength(2)
    const a = destino.find((e) => e.descricao === EXP_A.descricao)!
    expect(cadastrais(a)).toEqual(cadastrais(EXP_A))
    expect(a.documentos).toEqual(EXP_A.documentos.map((d) => ({ ...d, aceito: false })))
    expect(a.desconsideracoes).toEqual([])
    expect(a.sessaoId).toBe(SESSAO)
    expect(a.atualizadoPor).toEqual(autoria(presidente))
    const b = destino.find((e) => e.descricao === EXP_B.descricao)!
    expect(cadastrais(b)).toEqual(cadastrais(EXP_B))
    expect(b.documentos).toEqual([{ ...EXP_B.documentos[0], aceito: false }])
  })

  it('Lote II → Lote I (bidirecional)', async () => {
    await semearExperiencia(P2, 'c', { ...EXP_B, descricao: 'Experiência cadastrada no Lote II' })
    const r = await replicar({ propostaId: P2 })
    expect(r).toMatchObject({ status: 200, corpo: { propostaDestinoId: P1, copiadas: 1 } })
    expect(Object.values(await experiencias(P1)).map((e) => e.descricao)).toContain('Experiência cadastrada no Lote II')
  })

  it('a proposta de origem fica exatamente como estava', async () => {
    await db().doc(caminho(P1)).update({ concluida: true, totais: { d2: 7 } })
    const antes = await fotografia(P1)
    expect((await replicar()).status).toBe(200)
    expect(await fotografia(P1)).toEqual(antes)
  })

  it('recalcula a D2 do destino pelas regras de src/domain (documentos não aceitos não comprovam execução)', async () => {
    const r = await replicar()
    const destino = await experiencias(P2)
    const lista = Object.entries(destino)
      .map(([id, d]) => paraExperiencia(id, d))
      .sort((x, y) => x.inicio.localeCompare(y.inicio) || x.id.localeCompare(y.id))
    const esperado = calcularD2({ experiencias: lista, dataLimite: DATA_LIMITE })
    expect(semCarimbos((await db().doc(`${caminho(P2)}/resultadoD2/atual`).get()).data())).toEqual(JSON.parse(JSON.stringify(esperado)))
    expect(r.corpo?.totais).toMatchObject({ d2: esperado.total })
    expect(lista.every((e) => e.execucaoSatisfatoria === false)).toBe(true)
    expect(esperado.criterios['C2.4'].pontos).toBe(0)
  })

  it('desfaz a conclusão só do destino (a origem continua concluída)', async () => {
    await db().doc(caminho(P1)).update({ concluida: true })
    await db().doc(caminho(P2)).update({ concluida: true })
    expect((await replicar()).status).toBe(200)
    expect((await db().doc(caminho(P2)).get()).get('concluida')).toBe(false)
    expect((await db().doc(caminho(P1)).get()).get('concluida')).toBe(true)
  })
})

describe('replicar para outro lote — sem duplicar e sem mexer no que já existe no destino', () => {
  it('replicar de novo não duplica: tudo já equivalente, nada é gravado e a conclusão do destino fica', async () => {
    expect((await replicar()).corpo).toMatchObject({ copiadas: 2 })
    await db().doc(caminho(P2)).update({ concluida: true })
    const antes = await fotografia(P2)
    const r = await replicar()
    expect(r).toMatchObject({ status: 200, corpo: { copiadas: 0, equivalentes: 2, existentesNoDestino: 2 } })
    expect(await fotografia(P2)).toEqual(antes)
  })

  it('cadastro equivalente anterior (aceite e desconsideração próprios, documento a mais) é reconhecido e preservado', async () => {
    const proprio = {
      ...EXP_A,
      descricao: '  gestão do CASE   Goiânia ',
      categorias: ['D', 'A'],
      documentos: [...EXP_A.documentos.map((d) => ({ ...d, aceito: false })), { tipo: 'Empenho', numeroSEI: '000099999', comprovaExecucaoSatisfatoria: false, aceito: true }],
      desconsideracoes: [{ criterio: 'C2.1', justificativa: 'Decisão do Lote II.' }],
    }
    await semearExperiencia(P2, 'proprio', proprio)
    const antes = (await experiencias(P2)).proprio
    const r = await replicar()
    expect(r).toMatchObject({ status: 200, corpo: { copiadas: 1, equivalentes: 1, existentesNoDestino: 1 } })
    expect((await experiencias(P2)).proprio).toEqual(antes)
    expect(Object.keys(await experiencias(P2))).toHaveLength(2)
  })

  it('descrição igual com dados diferentes (outro período) não é tratada como equivalente', async () => {
    await semearExperiencia(P2, 'parecida', { ...EXP_A, inicio: '2021-01-01' })
    expect(await replicar()).toMatchObject({ status: 200, corpo: { copiadas: 2, equivalentes: 0 } })
  })

  it('requisições simultâneas não duplicam (transação)', async () => {
    const respostas = await Promise.all([replicar(), replicar(), replicar()])
    expect(respostas.every((r) => r.status === 200)).toBe(true)
    expect(respostas.reduce((soma, r) => soma + (r.corpo?.copiadas as number), 0)).toBe(2)
    expect(Object.keys(await experiencias(P2))).toHaveLength(2)
  })
})

describe('replicar para outro lote — validações e erros', () => {
  it('401 sem login e 403 para cadastro antigo', async () => {
    expect((await replicar({}, null)).status).toBe(401)
    expect((await replicar({}, antigo)).status).toBe(403)
    expect(await experiencias(P2)).toEqual({})
  })

  it('destino de outra OSC → 409', async () => {
    expect(await replicar({ propostaDestinoId: P3 })).toMatchObject({ status: 409, corpo: { erro: 'A proposta de destino é de outra OSC.' } })
    expect(await experiencias(P3)).toEqual({})
  })

  it('destino de outro chamamento → 404 (não está neste chamamento)', async () => {
    expect(await replicar({ propostaDestinoId: P4 })).toMatchObject({ status: 404, corpo: { erro: 'Proposta de destino não encontrada neste chamamento.' } })
    expect((await db().collection(`${caminho(P4, CH2)}/experiencias`).get()).size).toBe(0)
  })

  it('destino no mesmo lote (a própria proposta) → 409', async () => {
    expect(await replicar({ propostaDestinoId: P1 })).toMatchObject({ status: 409, corpo: { erro: 'A proposta de destino precisa ser de outro lote.' } })
  })

  it('sem sessão aberta, sessão encerrada ou lote de destino fora da pauta → 409, sem gravar', async () => {
    expect(await replicar({ sessaoId: 'nao-existe' })).toMatchObject({ status: 409, corpo: { erro: 'Avaliação só pode ser registrada em sessão aberta da Comissão.' } })
    await db().doc(`chamamentos/${CH}/sessoes/${SESSAO}`).update({ lotes: ['L1'] })
    expect(await replicar()).toMatchObject({ status: 409, corpo: { erro: 'Proposta fora da pauta da sessão.' } })
    await db().doc(`chamamentos/${CH}/sessoes/${SESSAO}`).update({ lotes: ['L1', 'L2'], status: 'encerrada' })
    expect((await replicar()).status).toBe(409)
    expect(await experiencias(P2)).toEqual({})
  })

  it('destino não admitido → 409 (não segue para avaliação)', async () => {
    await db().doc(caminho(P2)).update({ admissibilidade: { admitida: false, situacao: 'nao_admitida' } })
    expect(await replicar()).toMatchObject({ status: 409, corpo: { erro: 'Proposta não admitida (Anexo III, item 28): não segue para avaliação.' } })
  })

  it('origem sem experiências → 409', async () => {
    await db().recursiveDelete(db().collection(`${caminho(P1)}/experiencias`))
    expect(await replicar()).toMatchObject({ status: 409, corpo: { erro: 'A proposta de origem não tem experiências para replicar.' } })
  })

  it('experiência de origem inválida pelas regras atuais → 409 e nada é copiado (sem cópia parcial)', async () => {
    await semearExperiencia(P1, 'antiga', { descricao: 'Registro antigo sem modalidade', categorias: ['C'], inicio: '2018-01-01', fim: null })
    const r = await replicar()
    expect(r.status).toBe(409)
    expect(r.corpo?.erro).toMatch(/^Não é possível replicar “Registro antigo sem modalidade”/)
    expect(await experiencias(P2)).toEqual({})
  })

  it('corpo inválido → 400 (ação de replicar não aceita campos de experiência)', async () => {
    expect((await replicar({ descricao: 'x' })).status).toBe(400)
    expect((await replicar({ sessaoId: undefined })).status).toBe(400)
  })
})
