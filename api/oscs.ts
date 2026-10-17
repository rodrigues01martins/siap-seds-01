// POST /api/oscs (criar) e PATCH /api/oscs (editar). Perfis: admin e presidente.
// O documento fica em oscs/{CNPJ normalizado}: o CNPJ é único por construção.
// DELETE { cnpj } apaga a OSC e as propostas dela em todos os chamamentos; GET ?simular=true: prévia.
// Ver _lib/cascata.ts.

import { esquemaCriarOsc, esquemaEditarOsc } from '../src/esquemas/cadastros.js'
import { esquemaExcluirOsc, esquemaPreviaOsc } from '../src/esquemas/exclusao.js'
import { obterAdmin } from './_lib/admin.js'
import { alvoOsc, excluir, previaExclusao } from './_lib/cascata.js'
import { ErroApi } from './_lib/erros.js'
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
    const { cnpj } = await lerCorpo(requisicao, esquemaExcluirOsc)
    return json(200, await excluir(autor, alvoOsc(cnpj)))
  },
})
