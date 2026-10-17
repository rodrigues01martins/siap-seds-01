// POST /api/propostas (criar) e PATCH /api/propostas (editar). Perfis: admin e presidente.
// Proposta em chamamentos/{chamamentoId}/propostas/{id}; exige chamamento, lote e OSC existentes.
// "bloqueada" só muda pela homologação (Etapa 3b): este endpoint não aceita o campo.
// DELETE (excluir, com justificativa) e GET ?simular=true (prévia): ver _lib/exclusao.ts.
// Proposta homologada não pode ser excluída (409: reabra antes); apaga todas as subcoleções.

import type { Transaction } from 'firebase-admin/firestore'
import {
  esquemaCriarProposta,
  esquemaEditarProposta,
  esquemaExcluirProposta,
  esquemaPreviaProposta,
} from '../src/esquemas/cadastros.js'
import { obterAdmin } from './_lib/admin.js'
import { ErroApi, MENSAGENS } from './_lib/erros.js'
import { alvoProposta, excluirComSeguranca, previaExclusao } from './_lib/exclusao.js'
import { conferirDesbloqueada, gravar } from './_lib/gravar.js'
import { criarRota, json } from './_lib/http.js'
import { autenticar } from './_lib/porteiro.js'
import { lerConsulta, lerCorpo } from './_lib/validacao.js'

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
  // A OSC é referência por campo (não fica acima da proposta no caminho): a trava do gravar não a vê.
  if (osc.get('status') === 'excluindo' || chamamento.get('status') === 'excluindo') {
    throw new ErroApi(409, MENSAGENS.emExclusao)
  }
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
  GET: async (requisicao) => {
    await autenticar(requisicao)
    const { chamamentoId, propostaId } = lerConsulta(requisicao, esquemaPreviaProposta)
    return json(200, await previaExclusao(alvoProposta(chamamentoId, propostaId)))
  },

  POST: async (requisicao) => {
    const autor = await autenticar(requisicao)
    const { chamamentoId, loteCodigo: lote, oscCnpj, ...demais } = await lerCorpo(requisicao, esquemaCriarProposta)
    const id = obterAdmin().db.collection(`chamamentos/${chamamentoId}/propostas`).doc().id
    await gravar(autor, async (transacao) => {
      await conferirReferencias(transacao, chamamentoId, lote, oscCnpj)
      await conferirDuplicidade(transacao, chamamentoId, lote, oscCnpj)
      return [
        {
          caminho: `chamamentos/${chamamentoId}/propostas/${id}`,
          acao: 'criar',
          dados: { loteCodigo: lote, oscCnpj, ...demais, bloqueada: false },
        },
      ]
    })
    return json(201, { id, chamamentoId })
  },

  PATCH: async (requisicao) => {
    const autor = await autenticar(requisicao)
    const { chamamentoId, propostaId, ...alteracoes } = await lerCorpo(requisicao, esquemaEditarProposta)
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

  DELETE: async (requisicao) => {
    const autor = await autenticar(requisicao)
    const { chamamentoId, propostaId, justificativa } = await lerCorpo(requisicao, esquemaExcluirProposta)
    return json(200, await excluirComSeguranca(autor, alvoProposta(chamamentoId, propostaId), justificativa))
  },
})
