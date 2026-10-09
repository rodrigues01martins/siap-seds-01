import { Timestamp } from 'firebase-admin/firestore'
import { beforeEach, describe, expect, it } from 'vitest'
import { obterAdmin } from '../../api/_lib/admin'
import { ErroApi } from '../../api/_lib/erros'
import { gravar, type Autor } from '../../api/_lib/gravar'
import { auditoriaDe, ler, limparFirestore, totalAuditoria } from './apoio'

const autor: Autor = { uid: 'uid-relator', email: 'relator@go.gov.br', perfil: 'relator' }
const PROPOSTA = 'chamamentos/c1/propostas/p1'

async function semente(caminho: string, dados: Record<string, unknown>) {
  await obterAdmin().db.doc(caminho).set(dados)
}

async function falha(promessa: Promise<unknown>): Promise<ErroApi> {
  const erro = await promessa.catch((e: unknown) => e)
  expect(erro).toBeInstanceOf(ErroApi)
  return erro as ErroApi
}

beforeEach(limparFirestore)

describe('gravar (B4): transação + auditoria no mesmo commit', () => {
  it('criar grava o documento e a auditoria com antes = null', async () => {
    await gravar(autor, () => [{ caminho: 'oscs/x', acao: 'criar', dados: { nome: 'OSC X' } }])

    expect(await ler('oscs/x')).toMatchObject({ nome: 'OSC X' })
    const [registro] = await auditoriaDe('oscs/x')
    expect(registro).toMatchObject({
      caminho: 'oscs/x',
      acao: 'criar',
      antes: null,
      depois: { nome: 'OSC X' },
      uid: 'uid-relator',
      perfil: 'relator',
    })
    expect(registro!.dataHora).toBeInstanceOf(Timestamp)
  })

  it('editar registra antes e depois', async () => {
    await semente('oscs/x', { nome: 'Antigo', cidade: 'Goiânia' })
    await gravar(autor, () => [{ caminho: 'oscs/x', acao: 'editar', dados: { nome: 'Novo' } }])

    expect(await ler('oscs/x')).toMatchObject({ nome: 'Novo', cidade: 'Goiânia' })
    const [registro] = await auditoriaDe('oscs/x')
    expect(registro!.acao).toBe('editar')
    expect(registro!.antes).toMatchObject({ nome: 'Antigo', cidade: 'Goiânia' })
    expect(registro!.depois).toMatchObject({ nome: 'Novo', cidade: 'Goiânia' })
  })

  it('excluir apaga o documento e registra depois = null', async () => {
    await semente('oscs/x', { nome: 'OSC X' })
    await gravar(autor, () => [{ caminho: 'oscs/x', acao: 'excluir' }])

    expect(await ler('oscs/x')).toBeUndefined()
    const [registro] = await auditoriaDe('oscs/x')
    expect(registro).toMatchObject({ acao: 'excluir', antes: { nome: 'OSC X' }, depois: null })
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

  it('é atômico: se uma operação falha, nada é gravado (nem auditoria)', async () => {
    await falha(
      gravar(autor, () => [
        { caminho: 'oscs/nova', acao: 'criar', dados: { nome: 'Nova' } },
        { caminho: 'oscs/inexistente', acao: 'editar', dados: { nome: 'X' } },
      ]),
    )
    expect(await ler('oscs/nova')).toBeUndefined()
    expect(await totalAuditoria()).toBe(0)
  })

  it('a função de preparo lê dentro da mesma transação', async () => {
    await semente('chamamentos/c1', { titulo: 'Chamamento 1' })
    await gravar(autor, async (transacao) => {
      const chamamento = await transacao.get(obterAdmin().db.doc('chamamentos/c1'))
      return [{ caminho: 'oscs/x', acao: 'criar', dados: { chamamento: chamamento.data()!.titulo } }]
    })
    expect(await ler('oscs/x')).toMatchObject({ chamamento: 'Chamamento 1' })
  })
})

describe('trava de homologação (B5)', () => {
  const MENSAGEM = 'Proposta homologada: alteração não permitida.'

  it('editar proposta bloqueada → 409, sem gravar nem auditar', async () => {
    await semente(PROPOSTA, { observacao: 'original', bloqueada: true })
    const erro = await falha(gravar(autor, () => [{ caminho: PROPOSTA, acao: 'editar', dados: { observacao: 'x' } }]))
    expect(erro).toMatchObject({ status: 409, message: MENSAGEM })
    expect(await ler(PROPOSTA)).toMatchObject({ observacao: 'original' })
    expect(await totalAuditoria()).toBe(0)
  })

  it('escrever em subcoleção de proposta bloqueada → 409', async () => {
    await semente(PROPOSTA, { bloqueada: true })
    const erro = await falha(
      gravar(autor, () => [{ caminho: `${PROPOSTA}/avaliacoes/a1`, acao: 'criar', dados: { nivel: 3 } }]),
    )
    expect(erro).toMatchObject({ status: 409, message: MENSAGEM })
    expect(await ler(`${PROPOSTA}/avaliacoes/a1`)).toBeUndefined()
  })

  it('excluir proposta bloqueada → 409', async () => {
    await semente(PROPOSTA, { bloqueada: true })
    expect((await falha(gravar(autor, () => [{ caminho: PROPOSTA, acao: 'excluir' }]))).status).toBe(409)
  })

  it('proposta não bloqueada aceita escrita em si e nas subcoleções', async () => {
    await semente(PROPOSTA, { bloqueada: false })
    await gravar(autor, () => [
      { caminho: PROPOSTA, acao: 'editar', dados: { observacao: 'ok' } },
      { caminho: `${PROPOSTA}/avaliacoes/a1`, acao: 'criar', dados: { nivel: 3 } },
    ])
    expect(await ler(`${PROPOSTA}/avaliacoes/a1`)).toMatchObject({ nivel: 3 })
  })

  it('outros documentos do chamamento não são afetados pela trava', async () => {
    await semente(PROPOSTA, { bloqueada: true })
    await semente('chamamentos/c1', { titulo: 'X' })
    await gravar(autor, () => [{ caminho: 'chamamentos/c1', acao: 'editar', dados: { titulo: 'Y' } }])
    expect(await ler('chamamentos/c1')).toMatchObject({ titulo: 'Y' })
  })
})
