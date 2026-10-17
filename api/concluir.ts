// POST /api/concluir — Concluir / Desfazer conclusão da proposta (Simplificação 2/4).
// Esboço: a implementação vem no commit feat.

import { ErroApi } from './_lib/erros.js'
import { criarRota } from './_lib/http.js'
import { autenticar } from './_lib/porteiro.js'

export const { GET, POST, PUT, PATCH, DELETE } = criarRota({
  POST: async (requisicao) => {
    await autenticar(requisicao)
    throw new ErroApi(501, 'Não implementado.')
  },
})
