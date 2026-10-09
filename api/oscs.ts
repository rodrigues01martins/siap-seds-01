// POST /api/oscs (criar) e PATCH /api/oscs (editar). Perfil: admin.
// O documento fica em oscs/{CNPJ normalizado}: o CNPJ é único por construção.

import { PERMISSOES } from '../src/domain/permissoes.js'
import { esquemaCriarOsc, esquemaEditarOsc } from '../src/esquemas/cadastros.js'
import { obterAdmin } from './_lib/admin.js'
import { ErroApi } from './_lib/erros.js'
import { gravar } from './_lib/gravar.js'
import { criarRota, json } from './_lib/http.js'
import { autenticar } from './_lib/porteiro.js'
import { lerCorpo } from './_lib/validacao.js'

export const { GET, POST, PUT, PATCH, DELETE } = criarRota({
  POST: async (requisicao) => {
    const autor = await autenticar(requisicao, PERMISSOES.cadastros)
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
    const autor = await autenticar(requisicao, PERMISSOES.cadastros)
    const { cnpj: chave, ...alteracoes } = await lerCorpo(requisicao, esquemaEditarOsc)
    await gravar(autor, () => [{ caminho: `oscs/${chave}`, acao: 'editar', dados: alteracoes }])
    return json(200, { cnpj: chave })
  },
})
