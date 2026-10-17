// POST /api/oscs (criar) e PATCH /api/oscs (editar). Perfis: admin e presidente.
// O documento fica em oscs/{CNPJ normalizado}: o CNPJ é único por construção.
// DELETE (excluir, com justificativa) e GET ?simular=true (prévia): ver _lib/exclusao.ts.
// OSC com proposta vinculada não pode ser excluída (409 informando quantas e quais).

import { esquemaCriarOsc, esquemaEditarOsc, esquemaExcluirOsc, esquemaPreviaOsc } from '../src/esquemas/cadastros.js'
import { obterAdmin } from './_lib/admin.js'
import { ErroApi } from './_lib/erros.js'
import { alvoOsc, excluirComSeguranca, previaExclusao } from './_lib/exclusao.js'
import { gravar } from './_lib/gravar.js'
import { criarRota, json } from './_lib/http.js'
import { autenticar } from './_lib/porteiro.js'
import { lerConsulta, lerCorpo } from './_lib/validacao.js'

export const { GET, POST, PUT, PATCH, DELETE } = criarRota({
  GET: async (requisicao) => {
    await autenticar(requisicao)
    const { cnpj } = lerConsulta(requisicao, esquemaPreviaOsc)
    return json(200, await previaExclusao(alvoOsc(cnpj)))
  },

  POST: async (requisicao) => {
    const autor = await autenticar(requisicao)
    const dados = await lerCorpo(requisicao, esquemaCriarOsc)
    const caminho = `oscs/${dados.cnpj}`
    await gravar(autor, async (transacao) => {
      if ((await transacao.get(obterAdmin().db.doc(caminho))).exists) {
        throw new ErroApi(409, 'Já existe uma OSC cadastrada com este CNPJ.')
      }
      return [{ caminho, acao: 'criar', dados }]
    })
    return json(201, { cnpj: dados.cnpj })
  },

  PATCH: async (requisicao) => {
    const autor = await autenticar(requisicao)
    const { cnpj: chave, ...alteracoes } = await lerCorpo(requisicao, esquemaEditarOsc)
    await gravar(autor, () => [{ caminho: `oscs/${chave}`, acao: 'editar', dados: alteracoes }])
    return json(200, { cnpj: chave })
  },

  DELETE: async (requisicao) => {
    const autor = await autenticar(requisicao)
    const { cnpj, justificativa } = await lerCorpo(requisicao, esquemaExcluirOsc)
    return json(200, await excluirComSeguranca(autor, alvoOsc(cnpj), justificativa))
  },
})
