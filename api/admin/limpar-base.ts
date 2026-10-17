// /api/admin/limpar-base — limpeza da base (Simplificação 4/4), só o admin. Esboço: implementação no feat:.

import { ErroApi } from '../_lib/erros.js'
import { criarRota } from '../_lib/http.js'
import { autenticar } from '../_lib/porteiro.js'

const pendente = async (requisicao: Request): Promise<Response> => {
  await autenticar(requisicao, 'admin')
  throw new ErroApi(501, 'Ainda não implementado.')
}

export const { GET, POST, PUT, PATCH, DELETE } = criarRota({ GET: pendente, POST: pendente })
