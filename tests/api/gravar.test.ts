import { Timestamp } from 'firebase-admin/firestore'
import { beforeEach, describe, expect, it } from 'vitest'
import { obterAdmin } from '../../api/_lib/admin'
import { ErroApi } from '../../api/_lib/erros'
import { gravar, type Autor } from '../../api/_lib/gravar'
import { ler, limparFirestore } from './apoio'

const autor: Autor = { uid: 'uid-presidente', email: 'presidente@go.gov.br', perfil: 'presidente', nome: 'Ana Lima' }
const PROPOSTA = 'chamamentos/c1/propostas/p1'

async function semente(caminho: string, dados: Record<string, unknown>) {
  await obterAdmin().db.doc(caminho).set(dados)
}

async function falha(promessa: Promise<unknown>): Promise<ErroApi> {
  const erro = await promessa.catch((e: unknown) => e)
  expect(erro).toBeInstanceOf(ErroApi)
  return erro as ErroApi
}

const totalAuditoria = async () => (await obterAdmin().db.collection('auditoria').count().get()).data().count

beforeEach(limparFirestore)

describe('gravar: transação, sem auditoria detalhada; cada documento guarda só atualizadoPor e atualizadoEm', () => {
  it('criar grava o documento com atualizadoPor (nome e e-mail) e atualizadoEm, e nada em auditoria/', async () => {
    await gravar(autor, () => [{ caminho: 'oscs/x', acao: 'criar', dados: { nome: 'OSC X' } }])

    const osc = await ler('oscs/x')
    expect(osc).toMatchObject({ nome: 'OSC X', atualizadoPor: { nome: 'Ana Lima', email: 'presidente@go.gov.br' } })
    expect(osc?.atualizadoEm).toBeInstanceOf(Timestamp)
    expect(osc).not.toHaveProperty('criadoEm')
    expect(await totalAuditoria()).toBe(0)
  })

  it('sem nome no cadastro, atualizadoPor leva nome null e o e-mail', async () => {
    await gravar({ ...autor, nome: null }, () => [{ caminho: 'oscs/x', acao: 'criar', dados: { nome: 'OSC X' } }])
    expect(await ler('oscs/x')).toMatchObject({ atualizadoPor: { nome: null, email: 'presidente@go.gov.br' } })
  })

  it('editar mescla os campos e troca atualizadoPor/atualizadoEm', async () => {
    await semente('oscs/x', { nome: 'Antigo', cidade: 'Goiânia', atualizadoPor: { nome: 'Outra', email: 'outra@go.gov.br' } })
    await gravar(autor, () => [{ caminho: 'oscs/x', acao: 'editar', dados: { nome: 'Novo' } }])

    expect(await ler('oscs/x')).toMatchObject({
      nome: 'Novo',
      cidade: 'Goiânia',
      atualizadoPor: { nome: 'Ana Lima', email: 'presidente@go.gov.br' },
    })
    expect(await totalAuditoria()).toBe(0)
  })

  it('excluir apaga o documento', async () => {
    await semente('oscs/x', { nome: 'OSC X' })
    await gravar(autor, () => [{ caminho: 'oscs/x', acao: 'excluir' }])
    expect(await ler('oscs/x')).toBeUndefined()
    expect(await totalAuditoria()).toBe(0)
  })

  it('criar sobre documento existente → 409', async () => {
    await semente('oscs/x', { nome: 'OSC X' })
    expect((await falha(gravar(autor, () => [{ caminho: 'oscs/x', acao: 'criar', dados: {} }]))).status).toBe(409)
  })

  it('editar ou excluir documento inexistente → 404', async () => {
    const editar = await falha(gravar(autor, () => [{ caminho: 'oscs/nada', acao: 'editar', dados: { a: 1 } }]))
    expect(editar).toMatchObject({ status: 404, message: 'Registro não encontrado.' })
    expect((await falha(gravar(autor, () => [{ caminho: 'oscs/nada', acao: 'excluir' }]))).status).toBe(404)
  })

  it('é atômico: se uma operação falha, nada é gravado', async () => {
    await falha(
      gravar(autor, () => [
        { caminho: 'oscs/nova', acao: 'criar', dados: { nome: 'Nova' } },
        { caminho: 'oscs/inexistente', acao: 'editar', dados: { nome: 'X' } },
      ]),
    )
    expect(await ler('oscs/nova')).toBeUndefined()
  })

  it('a função de preparo lê dentro da mesma transação', async () => {
    await semente('chamamentos/c1', { titulo: 'Chamamento 1' })
    await gravar(autor, async (transacao) => {
      const chamamento = await transacao.get(obterAdmin().db.doc('chamamentos/c1'))
      return [{ caminho: 'oscs/x', acao: 'criar', dados: { chamamento: chamamento.data()!.titulo } }]
    })
    expect(await ler('oscs/x')).toMatchObject({ chamamento: 'Chamamento 1' })
  })

  it('sem trava de homologação nem de exclusão: proposta com bloqueada=true ou status "excluindo" aceita escrita', async () => {
    await semente(PROPOSTA, { observacao: 'original', bloqueada: true, status: 'excluindo' })
    await gravar(autor, () => [
      { caminho: PROPOSTA, acao: 'editar', dados: { observacao: 'nova' } },
      { caminho: `${PROPOSTA}/avaliacoes/a1`, acao: 'criar', dados: { nivel: 3 } },
    ])
    expect(await ler(PROPOSTA)).toMatchObject({ observacao: 'nova' })
    expect(await ler(`${PROPOSTA}/avaliacoes/a1`)).toMatchObject({ nivel: 3 })
  })
})
