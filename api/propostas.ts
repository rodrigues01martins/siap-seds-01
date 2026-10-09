// POST /api/propostas (criar) e PATCH /api/propostas (editar). Perfil: admin.
// Proposta em chamamentos/{chamamentoId}/propostas/{id}; exige chamamento, lote e OSC existentes.
// "bloqueada" só muda pela homologação (Etapa 3b): este endpoint não aceita o campo.

import type { Transaction } from 'firebase-admin/firestore'
import { z } from 'zod'
import { PERMISSOES } from '../src/domain/permissoes.js'
import { obterAdmin } from './_lib/admin.js'
import { ErroApi, MENSAGENS } from './_lib/erros.js'
import { conferirDesbloqueada, gravar } from './_lib/gravar.js'
import { criarRota, json } from './_lib/http.js'
import { autenticar } from './_lib/porteiro.js'
import { algumCampoAlem, cnpj, idDocumento, lerCorpo } from './_lib/validacao.js'

const loteCodigo = z.string().trim().min(1, 'Informe o lote.')
const observacao = z.string().trim().max(2000, 'Use no máximo 2.000 caracteres.')

const esquemaCriar = z.strictObject({
  chamamentoId: idDocumento,
  loteCodigo,
  oscCnpj: cnpj,
  observacao: observacao.optional(),
})

const esquemaEditar = z
  .strictObject({
    chamamentoId: idDocumento,
    propostaId: idDocumento,
    loteCodigo: loteCodigo.optional(),
    oscCnpj: cnpj.optional(),
    observacao: observacao.optional(),
  })
  .refine(algumCampoAlem(['chamamentoId', 'propostaId']), 'Informe ao menos um campo para alterar.')

/** Confere chamamento, lote e OSC; lança 400 com os campos problemáticos. */
async function conferirReferencias(
  transacao: Transaction,
  chamamentoId: string,
  lote: string,
  oscCnpj: string,
): Promise<void> {
  const { db } = obterAdmin()
  const [chamamento, osc] = await Promise.all([
    transacao.get(db.doc(`chamamentos/${chamamentoId}`)),
    transacao.get(db.doc(`oscs/${oscCnpj}`)),
  ])
  const campos: Record<string, string> = {}
  if (!chamamento.exists) campos.chamamentoId = 'Chamamento não encontrado.'
  else if (!((chamamento.get('lotes') ?? []) as { codigo: string }[]).some((l) => l.codigo === lote)) {
    campos.loteCodigo = 'Lote não encontrado neste chamamento.'
  }
  if (!osc.exists) campos.oscCnpj = 'OSC não cadastrada.'
  if (Object.keys(campos).length > 0) throw new ErroApi(400, MENSAGENS.dadosInvalidos, campos)
}

/** Uma proposta por OSC em cada lote do chamamento. */
async function conferirDuplicidade(
  transacao: Transaction,
  chamamentoId: string,
  lote: string,
  oscCnpj: string,
  ignorarId?: string,
): Promise<void> {
  const consulta = obterAdmin()
    .db.collection(`chamamentos/${chamamentoId}/propostas`)
    .where('oscCnpj', '==', oscCnpj)
    .where('loteCodigo', '==', lote)
  const existentes = await transacao.get(consulta)
  if (existentes.docs.some((d) => d.id !== ignorarId)) {
    throw new ErroApi(409, 'Esta OSC já tem proposta neste lote.')
  }
}

export const { GET, POST, PUT, PATCH, DELETE } = criarRota({
  POST: async (requisicao) => {
    const autor = await autenticar(requisicao, PERMISSOES.cadastros)
    const { chamamentoId, loteCodigo: lote, oscCnpj, observacao: obs } = await lerCorpo(requisicao, esquemaCriar)
    const id = obterAdmin().db.collection(`chamamentos/${chamamentoId}/propostas`).doc().id
    await gravar(autor, async (transacao) => {
      await conferirReferencias(transacao, chamamentoId, lote, oscCnpj)
      await conferirDuplicidade(transacao, chamamentoId, lote, oscCnpj)
      return [
        {
          caminho: `chamamentos/${chamamentoId}/propostas/${id}`,
          acao: 'criar',
          dados: { loteCodigo: lote, oscCnpj, observacao: obs, bloqueada: false },
        },
      ]
    })
    return json(201, { id, chamamentoId })
  },

  PATCH: async (requisicao) => {
    const autor = await autenticar(requisicao, PERMISSOES.cadastros)
    const { chamamentoId, propostaId, ...alteracoes } = await lerCorpo(requisicao, esquemaEditar)
    const caminho = `chamamentos/${chamamentoId}/propostas/${propostaId}`
    await gravar(autor, async (transacao) => {
      const atual = await transacao.get(obterAdmin().db.doc(caminho))
      if (!atual.exists) throw new ErroApi(404, MENSAGENS.naoEncontrado)
      // Homologada → 409 antes de qualquer outra validação.
      await conferirDesbloqueada(transacao, caminho)
      const lote = alteracoes.loteCodigo ?? (atual.get('loteCodigo') as string)
      const osc = alteracoes.oscCnpj ?? (atual.get('oscCnpj') as string)
      if (alteracoes.loteCodigo !== undefined || alteracoes.oscCnpj !== undefined) {
        await conferirReferencias(transacao, chamamentoId, lote, osc)
        await conferirDuplicidade(transacao, chamamentoId, lote, osc, propostaId)
      }
      return [{ caminho, acao: 'editar', dados: alteracoes }]
    })
    return json(200, { id: propostaId, chamamentoId })
  },
})
