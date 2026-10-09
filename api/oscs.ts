// POST /api/oscs (criar) e PATCH /api/oscs (editar). Perfil: admin.
// O documento fica em oscs/{CNPJ normalizado}: o CNPJ é único por construção.

import { z } from 'zod'
import { PERMISSOES } from '../src/domain/permissoes.js'
import { obterAdmin } from './_lib/admin.js'
import { ErroApi } from './_lib/erros.js'
import { gravar } from './_lib/gravar.js'
import { criarRota, json } from './_lib/http.js'
import { autenticar } from './_lib/porteiro.js'
import { algumCampoAlem, cnpj, lerCorpo } from './_lib/validacao.js'

const razaoSocial = z.string().trim().min(3, 'Informe a razão social.')
const nomeFantasia = z.string().trim().min(1, 'Informe o nome fantasia.')

const esquemaCriar = z.strictObject({ cnpj, razaoSocial, nomeFantasia: nomeFantasia.optional() })

const esquemaEditar = z
  .strictObject({ cnpj, razaoSocial: razaoSocial.optional(), nomeFantasia: nomeFantasia.optional() })
  .refine(algumCampoAlem(['cnpj']), 'Informe ao menos um campo para alterar.')

export const { GET, POST, PUT, PATCH, DELETE } = criarRota({
  POST: async (requisicao) => {
    const autor = await autenticar(requisicao, PERMISSOES.cadastros)
    const dados = await lerCorpo(requisicao, esquemaCriar)
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
    const { cnpj: chave, ...alteracoes } = await lerCorpo(requisicao, esquemaEditar)
    await gravar(autor, () => [{ caminho: `oscs/${chave}`, acao: 'editar', dados: alteracoes }])
    return json(200, { cnpj: chave })
  },
})
