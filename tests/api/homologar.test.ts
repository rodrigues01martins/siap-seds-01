import { Timestamp } from 'firebase-admin/firestore'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import * as avaliacao from '../../api/avaliacao'
import * as experiencia from '../../api/experiencia'
import * as rota from '../../api/homologar'
import { MATRIZ_2026 } from '../../src/domain/matriz'
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
  semearNiveis,
  semearProposta,
  type Usuario,
} from './apoio'

const CODIGOS = MATRIZ_2026.dimensao1.planos.flatMap((p) => p.subcriterios.map((s) => s.codigo))
const ALVO = { chamamentoId: CH, propostaId: PROP }

let presidente: Usuario
let relator: Usuario

beforeAll(async () => {
  await limparAuth()
  ;[presidente, relator] = await Promise.all([criarUsuario('presidente'), criarUsuario('relator')])
})

beforeEach(async () => {
  await limparFirestore()
  await semearProposta()
})

/** Avaliação completa: 27 níveis semeados + o último pela /api, que calcula os totais. */
async function completarAvaliacao(): Promise<void> {
  const { ['6.4']: _, ...demais } = Object.fromEntries(CODIGOS.map((c) => [c, 3]))
  await semearNiveis(demais)
  const r = await chamar(
    avaliacao,
    'PUT',
    { ...ALVO, codigo: '6.4', nivel: 3, justificativa: 'Avaliação concluída pela Comissão.', paginas: [], decisao: 'unanimidade', sessaoId: SESSAO },
    relator.token,
  )
  expect(r.corpo?.totais).toMatchObject({ status: 'apta', completa: true })
}

describe('/api/homologar — acesso e validação', () => {
  it('405, 401 e 403 (relator não homologa)', async () => {
    expect((await chamar(rota, 'GET', undefined, presidente.token)).status).toBe(405)
    expect((await chamar(rota, 'POST', ALVO, null)).status).toBe(401)
    expect((await chamar(rota, 'POST', ALVO, relator.token)).status).toBe(403)
  })

  it('corpo inválido → 400; proposta inexistente → 404', async () => {
    expect((await chamar(rota, 'POST', { chamamentoId: CH }, presidente.token)).status).toBe(400)
    expect((await chamar(rota, 'POST', { ...ALVO, propostaId: 'nao-existe' }, presidente.token)).status).toBe(404)
  })

  it('proposta pendente (sem avaliação ou incompleta) → 409', async () => {
    const mensagem = 'Proposta com avaliação pendente: conclua os 28 subcritérios antes de homologar.'
    expect(await chamar(rota, 'POST', ALVO, presidente.token)).toMatchObject({ status: 409, corpo: { erro: mensagem } })
    await semearNiveis({ '1.1': 3 })
    await chamar(avaliacao, 'PUT', { ...ALVO, codigo: '1.2', nivel: 3, justificativa: 'Justificativa suficiente para o teste.', paginas: [], decisao: 'unanimidade', sessaoId: SESSAO }, relator.token)
    expect((await chamar(rota, 'POST', ALVO, presidente.token)).status).toBe(409)
  })
})

describe('/api/homologar — homologação', () => {
  it('grava bloqueada, homologadaPor e homologadaEm, auditado', async () => {
    await completarAvaliacao()
    const r = await chamar(rota, 'POST', ALVO, presidente.token)
    expect(r).toMatchObject({ status: 200, corpo: { bloqueada: true } })

    const proposta = await ler(CAMINHO_PROPOSTA)
    expect(proposta).toMatchObject({ bloqueada: true, homologadaPor: { uid: presidente.uid, email: presidente.email } })
    expect(proposta?.homologadaEm).toBeInstanceOf(Timestamp)

    const registro = (await auditoriaDe(CAMINHO_PROPOSTA)).at(-1)
    expect(registro).toMatchObject({
      acao: 'editar',
      antes: { bloqueada: false },
      depois: { bloqueada: true, homologadaPor: { uid: presidente.uid } },
      uid: presidente.uid,
      perfil: 'presidente',
    })
  })

  it('depois de homologada: C2, C3 e nova homologação → 409', async () => {
    await completarAvaliacao()
    await chamar(rota, 'POST', ALVO, presidente.token)

    const nivel = await chamar(avaliacao, 'PUT', { ...ALVO, codigo: '1.1', nivel: 1, justificativa: 'Tentativa após homologação.', paginas: [], decisao: 'unanimidade', sessaoId: SESSAO }, relator.token)
    expect(nivel).toMatchObject({ status: 409, corpo: { erro: 'Proposta homologada: alteração não permitida.' } })

    const exp = await chamar(experiencia, 'POST', { ...ALVO, descricao: 'Nova experiência', categorias: ['C'], modalidade: 'outra', mrosc: false, inicio: '2020-01-01', fim: null }, relator.token)
    expect(exp.status).toBe(409)

    expect((await chamar(rota, 'POST', ALVO, presidente.token)).status).toBe(409)
  })

  it('inapta e desclassificada também podem ser homologadas (só pendente não)', async () => {
    const { ['6.4']: _, ...demais } = Object.fromEntries(CODIGOS.map((c) => [c, 1]))
    await semearNiveis(demais)
    await chamar(avaliacao, 'PUT', { ...ALVO, codigo: '6.4', nivel: 1, justificativa: 'Avaliação concluída pela Comissão.', paginas: [], decisao: 'unanimidade', sessaoId: SESSAO }, relator.token)
    expect(((await ler(CAMINHO_PROPOSTA))?.totais as { status: string }).status).toBe('inapta')
    expect((await chamar(rota, 'POST', ALVO, presidente.token)).status).toBe(200)
  })
})
