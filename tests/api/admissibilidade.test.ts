// Admissibilidade simplificada (Simplificação 2/4): admitida (sim/não), motivo e páginas inicial/final por PA
// com página de corte. Sem checklist 28.1 nem de formatação (28.5). Salvamento automático (Simplificação 3/4):
// motivo e páginas podem ficar em branco ao gravar; a conclusão da proposta é que os exige (concluir.test.ts).
import { Timestamp } from 'firebase-admin/firestore'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { obterAdmin } from '../../api/_lib/admin'
import * as rota from '../../api/admissibilidade'
import * as avaliacao from '../../api/avaliacao'
import * as experiencia from '../../api/experiencia'
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
  semearProposta,
  type Usuario,
} from './apoio'

const LIMITES = [12, 12, 8, 12, 10, 8]

interface Plano {
  codigo: string
  paginaInicial: number | null
  paginaFinal: number | null
}

function planos(): Plano[] {
  let pagina = 3
  return LIMITES.map((limite, i) => {
    const plano = { codigo: `PA${i + 1}`, paginaInicial: pagina, paginaFinal: pagina + limite - 1 }
    pagina += limite
    return plano
  })
}

function corpo(dados: Record<string, unknown> = {}) {
  return { chamamentoId: CH, propostaId: PROP, sessaoId: SESSAO, admitida: true, planos: planos(), ...dados }
}

let presidente: Usuario
let antigo: Usuario
let admin: Usuario

beforeAll(async () => {
  await limparAuth()
  ;[presidente, antigo, admin] = await Promise.all([criarUsuario('presidente'), criarUsuario('antigo'), criarUsuario('admin')])
})

beforeEach(async () => {
  await limparFirestore()
  await semearProposta()
})

describe('/api/admissibilidade — acesso', () => {
  it('405 com Allow PUT, 401, 403 (cadastro antigo)', async () => {
    const r = await chamar(rota, 'GET', undefined, presidente.token)
    expect(r.status).toBe(405)
    expect(r.headers.get('Allow')).toBe('PUT')
    expect((await chamar(rota, 'PUT', corpo(), null)).status).toBe(401)
    expect((await chamar(rota, 'PUT', corpo(), antigo.token)).status).toBe(403)
  })

  it.each(['presidente', 'admin'] as const)('%s registra', async (perfil) => {
    expect((await chamar(rota, 'PUT', corpo(), { presidente, admin }[perfil].token)).status).toBe(200)
  })
})

describe('/api/admissibilidade — validação (400) e 404', () => {
  it.each([
    ['sem admitida', { admitida: undefined }, 'admitida', 'Informe se a proposta foi admitida (sim ou não).'],
    ['faltando PA', { planos: planos().slice(1) }, 'planos', 'Informe os 6 Planos de Ação (PA1 a PA6), cada um uma vez.'],
    ['checklist 28.1 (removido)', { requisitos: { '28.1.I': true } }, 'requisitos', 'Campo não permitido.'],
    ['formatação 28.5 (removida)', { irregularidadesFormais: ['28.5.II'] }, 'irregularidadesFormais', 'Campo não permitido.'],
  ])('%s', async (_caso, ajuste, campo, mensagem) => {
    const r = await chamar(rota, 'PUT', corpo(ajuste), presidente.token)
    expect(r.status).toBe(400)
    expect(r.corpo?.campos?.[campo]).toBe(mensagem)
    expect((await ler(CAMINHO_PROPOSTA))?.admissibilidade).toBeUndefined()
  })

  it('página inválida ou final antes da inicial → campo do PA', async () => {
    const zerada = planos()
    zerada[1] = { codigo: 'PA2', paginaInicial: 0, paginaFinal: null }
    expect(await chamar(rota, 'PUT', corpo({ planos: zerada }), presidente.token)).toMatchObject({
      status: 400,
      corpo: { campos: { 'planos.1.paginaInicial': 'Informe a página inicial (inteiro a partir de 1).' } },
    })
    const invertida = planos()
    invertida[2] = { codigo: 'PA3', paginaInicial: 30, paginaFinal: 29 }
    expect(await chamar(rota, 'PUT', corpo({ planos: invertida }), presidente.token)).toMatchObject({
      status: 400,
      corpo: { campos: { 'planos.2.paginaFinal': 'A página final não pode ser anterior à inicial.' } },
    })
  })

  it('proposta inexistente → 404', async () => {
    const r = await chamar(rota, 'PUT', corpo({ propostaId: 'nao-existe' }), presidente.token)
    expect(r).toMatchObject({ status: 404, corpo: { erro: 'Proposta não encontrada.' } })
  })
})

describe('/api/admissibilidade — gravação', () => {
  it('admitida: grava admitida, situação, páginas e página de corte por PA, sessaoId e atualizadoPor', async () => {
    const lista = planos()
    lista[2] = { codigo: 'PA3', paginaInicial: 30, paginaFinal: 39 }
    const r = await chamar(rota, 'PUT', corpo({ planos: lista }), presidente.token)
    expect(r).toMatchObject({ status: 200, corpo: { admissibilidade: { admitida: true, situacao: 'admitida' } } })

    const proposta = await ler(CAMINHO_PROPOSTA)
    const adm = proposta?.admissibilidade as Record<string, unknown>
    expect(adm).toMatchObject({ admitida: true, situacao: 'admitida', sessaoId: SESSAO })
    expect(adm).not.toHaveProperty('requisitos')
    expect(adm).not.toHaveProperty('irregularidadesFormais')
    expect(adm).not.toHaveProperty('registradaPor')
    expect((adm.planos as unknown[])[2]).toEqual({ codigo: 'PA3', paginaInicial: 30, paginaFinal: 39, paginas: 10, limite: 8, paginaCorte: 37, excede: 2 })
    expect(proposta).toMatchObject({ atualizadoPor: autoria(presidente) })
    expect(proposta?.atualizadoEm).toBeInstanceOf(Timestamp)
  })

  it('não admitida: grava o motivo; páginas podem ficar em branco', async () => {
    const vazias = planos().map((p) => ({ ...p, paginaInicial: null, paginaFinal: null }))
    const r = await chamar(rota, 'PUT', corpo({ admitida: false, motivo: 'Caderno entregue fora do prazo.', planos: vazias }), presidente.token)
    expect(r.status).toBe(200)
    expect((await ler(CAMINHO_PROPOSTA))?.admissibilidade).toMatchObject({
      admitida: false,
      motivo: 'Caderno entregue fora do prazo.',
      situacao: 'nao_admitida',
    })
  })

  it('salvamento automático: admitida com páginas ainda em branco e não admitida sem motivo são gravadas', async () => {
    const parcial = planos()
    parcial[1] = { codigo: 'PA2', paginaInicial: 15, paginaFinal: null }
    parcial[4] = { codigo: 'PA5', paginaInicial: null, paginaFinal: null }
    expect((await chamar(rota, 'PUT', corpo({ planos: parcial }), presidente.token)).status).toBe(200)
    const adm = (await ler(CAMINHO_PROPOSTA))?.admissibilidade as { planos: unknown[] }
    expect(adm.planos[1]).toMatchObject({ codigo: 'PA2', paginaInicial: 15, paginaFinal: null, paginas: null })

    expect((await chamar(rota, 'PUT', corpo({ admitida: false, motivo: 'curto' }), presidente.token)).status).toBe(200)
    expect((await ler(CAMINHO_PROPOSTA))?.admissibilidade).toMatchObject({ admitida: false, motivo: 'curto', situacao: 'nao_admitida' })
    expect((await chamar(rota, 'PUT', corpo({ admitida: false }), presidente.token)).status).toBe(200)
    expect((await ler(CAMINHO_PROPOSTA))?.admissibilidade).not.toHaveProperty('motivo')
  })

  it('proposta com bloqueada=true (homologação antiga) é aceita: não há mais trava', async () => {
    await obterAdmin().db.doc(CAMINHO_PROPOSTA).set({ bloqueada: true }, { merge: true })
    expect((await chamar(rota, 'PUT', corpo(), presidente.token)).status).toBe(200)
  })
})

describe('proposta não admitida não segue para avaliação', () => {
  it('C2 e C3 → 409 depois de não admitida', async () => {
    await chamar(rota, 'PUT', corpo({ admitida: false, motivo: 'Arquivo ilegível em várias páginas.' }), presidente.token)
    const mensagem = 'Proposta não admitida (Anexo III, item 28): não segue para avaliação.'
    const nivel = await chamar(
      avaliacao,
      'PUT',
      { chamamentoId: CH, propostaId: PROP, codigo: '1.1', nivel: 3, justificativa: 'Justificativa suficiente para o teste.', paginas: [], sessaoId: SESSAO },
      presidente.token,
    )
    expect(nivel).toMatchObject({ status: 409, corpo: { erro: mensagem } })
    const exp = await chamar(
      experiencia,
      'POST',
      { chamamentoId: CH, propostaId: PROP, sessaoId: SESSAO, descricao: 'X', categorias: ['C'], modalidade: 'outra', inicio: '2020-01-01' },
      presidente.token,
    )
    expect(exp).toMatchObject({ status: 409, corpo: { erro: mensagem } })
  })
})
