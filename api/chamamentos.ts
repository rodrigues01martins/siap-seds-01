// POST /api/chamamentos (criar) e PATCH /api/chamamentos (editar). Perfis: admin e presidente.
// dataLimitePropostas é a referência da D2 (Anexo IV, 3.3.1, IV): não muda depois que alguma
// proposta já tem totais calculados. justificativaMinima configura o mínimo da justificativa (C2).
// processoSei: Etapa 4a. Sem índice de correção nem data-base (Manutenção 1): os valores da D2 já chegam
// atualizados conforme o Edital; o esquema estrito recusa esses campos.
// DELETE { id } apaga o chamamento em cascata (lotes, sessões, propostas e tudo dentro delas, desempates);
// DELETE { id, lote } apaga só o lote (com suas propostas). GET ?simular=true: prévia. Ver _lib/cascata.ts.

import { esquemaCriarChamamento, esquemaEditarChamamento } from '../src/esquemas/cadastros.js'
import { esquemaExcluirChamamento, esquemaPreviaChamamento } from '../src/esquemas/exclusao.js'
import { obterAdmin } from './_lib/admin.js'
import { alvoChamamento, alvoLote, excluir, previaExclusao } from './_lib/cascata.js'
import { ErroApi } from './_lib/erros.js'
import { gravar } from './_lib/gravar.js'
import { criarRota, json } from './_lib/http.js'
import { autenticar } from './_lib/porteiro.js'
import { lerConsulta, lerCorpo } from './_lib/validacao.js'

export const { GET, POST, PUT, PATCH, DELETE } = criarRota({
  GET: async (requisicao) => {
    await autenticar(requisicao)
    const { id, lote } = lerConsulta(requisicao, esquemaPreviaChamamento)
    return json(200, await previaExclusao(lote ? alvoLote(id, lote) : alvoChamamento(id)))
  },

  POST: async (requisicao) => {
    const autor = await autenticar(requisicao)
    const dados = await lerCorpo(requisicao, esquemaCriarChamamento)
    const id = obterAdmin().db.collection('chamamentos').doc().id
    await gravar(autor, () => [{ caminho: `chamamentos/${id}`, acao: 'criar', dados }])
    return json(201, { id })
  },

  PATCH: async (requisicao) => {
    const autor = await autenticar(requisicao)
    const { id, ...alteracoes } = await lerCorpo(requisicao, esquemaEditarChamamento)
    await gravar(autor, async (transacao) => {
      const { db } = obterAdmin()
      const atual = await transacao.get(db.doc(`chamamentos/${id}`))
      const novaData = alteracoes.dataLimitePropostas
      if (atual.exists && novaData !== undefined && novaData !== atual.get('dataLimitePropostas')) {
        // Lida na transação: um recálculo concorrente (que também lê o chamamento) conflita e refaz.
        const propostas = await transacao.get(db.collection(`chamamentos/${id}/propostas`))
        if (propostas.docs.some((p) => p.get('totais') !== undefined)) {
          throw new ErroApi(
            409,
            'Não é possível alterar a data limite: a avaliação de propostas deste chamamento já começou.',
          )
        }
      }
      return [{ caminho: `chamamentos/${id}`, acao: 'editar', dados: alteracoes }]
    })
    return json(200, { id })
  },

  DELETE: async (requisicao) => {
    const autor = await autenticar(requisicao)
    const { id, lote } = await lerCorpo(requisicao, esquemaExcluirChamamento)
    return json(200, await excluir(autor, lote ? alvoLote(id, lote) : alvoChamamento(id)))
  },
})
