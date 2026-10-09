// POST /api/chamamentos (criar) e PATCH /api/chamamentos (editar). Perfil: admin.

import { z } from 'zod'
import { PERMISSOES } from '../src/domain/permissoes.js'
import { obterAdmin } from './_lib/admin.js'
import { gravar } from './_lib/gravar.js'
import { criarRota, json } from './_lib/http.js'
import { autenticar } from './_lib/porteiro.js'
import { algumCampoAlem, idDocumento, lerCorpo } from './_lib/validacao.js'

const lote = z.strictObject({
  codigo: z.string().trim().min(1, 'Informe o código do lote.').max(20, 'Use no máximo 20 caracteres.'),
  descricao: z.string().trim().min(1, 'Informe a descrição do lote.'),
})

const lotes = z
  .array(lote)
  .min(1, 'Informe ao menos um lote.')
  .refine((lista) => new Set(lista.map((l) => l.codigo)).size === lista.length, 'Há códigos de lote repetidos.')

const numero = z.string().trim().min(1, 'Informe o número do chamamento.')
const titulo = z.string().trim().min(3, 'Informe um título com ao menos 3 caracteres.')

const esquemaCriar = z.strictObject({ numero, titulo, lotes })

const esquemaEditar = z
  .strictObject({ id: idDocumento, numero: numero.optional(), titulo: titulo.optional(), lotes: lotes.optional() })
  .refine(algumCampoAlem(['id']), 'Informe ao menos um campo para alterar.')

export const { GET, POST, PUT, PATCH, DELETE } = criarRota({
  POST: async (requisicao) => {
    const autor = await autenticar(requisicao, PERMISSOES.cadastros)
    const dados = await lerCorpo(requisicao, esquemaCriar)
    const id = obterAdmin().db.collection('chamamentos').doc().id
    await gravar(autor, () => [{ caminho: `chamamentos/${id}`, acao: 'criar', dados }])
    return json(201, { id })
  },

  PATCH: async (requisicao) => {
    const autor = await autenticar(requisicao, PERMISSOES.cadastros)
    const { id, ...alteracoes } = await lerCorpo(requisicao, esquemaEditar)
    await gravar(autor, () => [{ caminho: `chamamentos/${id}`, acao: 'editar', dados: alteracoes }])
    return json(200, { id })
  },
})
