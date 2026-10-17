// "Homologar" virou "Concluir" (Simplificação 2/4): ação reversível (Concluir / Desfazer conclusão), sem
// justificativa e sem trava. Só conclui com a admissibilidade registrada e, se admitida, os 28 níveis e as
// 28 justificativas da D1. Qualquer alteração na avaliação da proposta desfaz a conclusão.
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { obterAdmin } from '../../api/_lib/admin'
import * as admissibilidade from '../../api/admissibilidade'
import * as avaliacao from '../../api/avaliacao'
import * as rota from '../../api/concluir'
import * as experiencia from '../../api/experiencia'
import { MATRIZ_2026 } from '../../src/domain/matriz'
import {
  CAMINHO_PROPOSTA,
  CH,
  PROP,
  SESSAO,
  autoria,
  chamar,
  criarUsuario,
  ler,
  limparAuth,
  limparFirestore,
  semearNiveis,
  semearProposta,
  type Usuario,
} from './apoio'

const CODIGOS = MATRIZ_2026.dimensao1.planos.flatMap((p) => p.subcriterios.map((s) => s.codigo))
const ALVO = { chamamentoId: CH, propostaId: PROP }
const PLANOS = [12, 12, 8, 12, 10, 8].map((limite, i, todos) => {
  const inicio = 3 + todos.slice(0, i).reduce((a, b) => a + b, 0)
  return { codigo: `PA${i + 1}`, paginaInicial: inicio, paginaFinal: inicio + limite - 1 }
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

async function registrarAdmissibilidade(admitida = true): Promise<void> {
  const corpo = admitida
    ? { ...ALVO, sessaoId: SESSAO, admitida: true, planos: PLANOS }
    : { ...ALVO, sessaoId: SESSAO, admitida: false, motivo: 'Caderno entregue fora do prazo.', planos: PLANOS }
  expect((await chamar(admissibilidade, 'PUT', corpo, presidente.token)).status).toBe(200)
}

/** 27 níveis semeados e o último pela /api (que calcula os totais). */
async function completarD1(): Promise<void> {
  const { ['6.4']: _, ...demais } = Object.fromEntries(CODIGOS.map((c) => [c, 3]))
  await semearNiveis(demais)
  const r = await chamar(
    avaliacao,
    'PUT',
    { ...ALVO, codigo: '6.4', nivel: 3, justificativa: 'Avaliação concluída pela Comissão.', paginas: [], sessaoId: SESSAO },
    presidente.token,
  )
  expect(r.status).toBe(200)
}

const concluir = (usuario: Usuario = presidente) => chamar(rota, 'POST', { ...ALVO, acao: 'concluir' }, usuario.token)
const desfazer = (usuario: Usuario = presidente) => chamar(rota, 'POST', { ...ALVO, acao: 'desfazer' }, usuario.token)

describe('/api/concluir — acesso e validação', () => {
  it('405, 401 e 403 (cadastro antigo)', async () => {
    expect((await chamar(rota, 'GET', undefined, presidente.token)).status).toBe(405)
    expect((await chamar(rota, 'POST', { ...ALVO, acao: 'concluir' }, null)).status).toBe(401)
    expect((await concluir(antigo)).status).toBe(403)
  })

  it('corpo inválido → 400 (ação fora de concluir|desfazer; justificativa não existe mais)', async () => {
    expect((await chamar(rota, 'POST', ALVO, presidente.token)).status).toBe(400)
    expect((await chamar(rota, 'POST', { ...ALVO, acao: 'homologar' }, presidente.token)).status).toBe(400)
    const comMotivo = await chamar(rota, 'POST', { ...ALVO, acao: 'desfazer', motivo: 'Reabertura com motivo.' }, presidente.token)
    expect(comMotivo).toMatchObject({ status: 400, corpo: { campos: { motivo: 'Campo não permitido.' } } })
  })

  it('proposta inexistente → 404', async () => {
    const r = await chamar(rota, 'POST', { ...ALVO, propostaId: 'nao-existe', acao: 'concluir' }, presidente.token)
    expect(r).toMatchObject({ status: 404, corpo: { erro: 'Proposta não encontrada.' } })
  })
})

describe('/api/concluir — condições para concluir (409)', () => {
  it('sem admissibilidade registrada', async () => {
    await completarD1()
    const r = await concluir()
    expect(r).toMatchObject({ status: 409, corpo: { erro: 'Não é possível concluir: registre a admissibilidade.' } })
    expect((await ler(CAMINHO_PROPOSTA))?.concluida).not.toBe(true)
  })

  it('admitida com níveis faltando', async () => {
    await registrarAdmissibilidade()
    await semearNiveis({ '1.1': 3, '1.2': 2 })
    const r = await concluir()
    expect(r).toMatchObject({ status: 409, corpo: { erro: 'Não é possível concluir: faltam 26 de 28 níveis da D1.' } })
  })

  it('admitida com justificativa em branco (registro antigo)', async () => {
    await registrarAdmissibilidade()
    await completarD1()
    await obterAdmin().db.doc(`${CAMINHO_PROPOSTA}/avaliacoes/2.1`).update({ justificativa: '   ' })
    const r = await concluir()
    expect(r).toMatchObject({ status: 409, corpo: { erro: 'Não é possível concluir: faltam 1 de 28 justificativas da D1.' } })
  })
})

describe('/api/concluir — concluir e desfazer', () => {
  it('admitida, com os 28 níveis e justificativas: conclui; desfazer volta atrás, sem justificativa', async () => {
    await registrarAdmissibilidade()
    await completarD1()

    expect(await concluir()).toMatchObject({ status: 200, corpo: { concluida: true } })
    expect(await ler(CAMINHO_PROPOSTA)).toMatchObject({ concluida: true, atualizadoPor: autoria(presidente) })

    expect(await desfazer(admin)).toMatchObject({ status: 200, corpo: { concluida: false } })
    expect(await ler(CAMINHO_PROPOSTA)).toMatchObject({ concluida: false, atualizadoPor: autoria(admin) })

    // Reversível de novo.
    expect((await concluir()).status).toBe(200)
  })

  it('inapta e desclassificada também concluem (os 28 níveis bastam)', async () => {
    await registrarAdmissibilidade()
    const { ['6.4']: _, ...demais } = Object.fromEntries(CODIGOS.map((c) => [c, 1]))
    await semearNiveis(demais)
    await chamar(avaliacao, 'PUT', { ...ALVO, codigo: '6.4', nivel: 1, justificativa: 'Avaliação concluída pela Comissão.', paginas: [], sessaoId: SESSAO }, presidente.token)
    expect(((await ler(CAMINHO_PROPOSTA))?.totais as { status: string }).status).toBe('inapta')
    expect((await concluir()).status).toBe(200)
  })

  it('não admitida conclui só com a admissibilidade (não há D1 a registrar)', async () => {
    await registrarAdmissibilidade(false)
    expect(await concluir()).toMatchObject({ status: 200, corpo: { concluida: true } })
  })

  it('concluir de novo ou desfazer o que não está concluído não dá erro (idempotente)', async () => {
    expect((await desfazer()).status).toBe(200)
    await registrarAdmissibilidade(false)
    await concluir()
    expect((await concluir()).status).toBe(200)
  })
})

describe('sem trava: alterar a avaliação de uma proposta concluída desfaz a conclusão', () => {
  beforeEach(async () => {
    await registrarAdmissibilidade()
    await completarD1()
    expect((await concluir()).status).toBe(200)
  })

  it('novo nível da D1 → gravado e concluida = false', async () => {
    const r = await chamar(avaliacao, 'PUT', { ...ALVO, codigo: '1.1', nivel: 4, justificativa: 'Revisão do nível em nova sessão.', paginas: [], sessaoId: SESSAO }, presidente.token)
    expect(r.status).toBe(200)
    expect(await ler(CAMINHO_PROPOSTA)).toMatchObject({ concluida: false })
    expect(await ler(`${CAMINHO_PROPOSTA}/avaliacoes/1.1`)).toMatchObject({ nivel: 4 })
  })

  it('nova experiência da D2 → gravada e concluida = false', async () => {
    const r = await chamar(
      experiencia,
      'POST',
      { ...ALVO, sessaoId: SESSAO, descricao: 'Nova experiência', categorias: ['C'], modalidade: 'outra', mrosc: false, inicio: '2020-01-01', fim: null },
      presidente.token,
    )
    expect(r.status).toBe(201)
    expect(await ler(CAMINHO_PROPOSTA)).toMatchObject({ concluida: false })
  })

  it('nova admissibilidade → concluida = false', async () => {
    await registrarAdmissibilidade()
    expect(await ler(CAMINHO_PROPOSTA)).toMatchObject({ concluida: false })
  })

  it('excluir um nível da D1 → concluida = false', async () => {
    const r = await chamar(avaliacao, 'DELETE', { ...ALVO, codigo: '3.1' }, presidente.token)
    expect(r.status).toBe(200)
    expect(await ler(CAMINHO_PROPOSTA)).toMatchObject({ concluida: false })
  })
})
