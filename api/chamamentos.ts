// POST /api/chamamentos (criar) e PATCH /api/chamamentos (editar). Perfil: admin.
// dataLimitePropostas é a referência da D2 (Anexo IV, 3.3.1, IV): não muda depois que alguma
// proposta já tem totais calculados. justificativaMinima configura o mínimo da justificativa (C2).

import { z } from 'zod'
import { PERMISSOES } from '../src/domain/permissoes.js'
import { obterAdmin } from './_lib/admin.js'
import { ErroApi } from './_lib/erros.js'
import { gravar } from './_lib/gravar.js'
import { criarRota, json } from './_lib/http.js'
import { autenticar } from './_lib/porteiro.js'
import { algumCampoAlem, dataIso, idDocumento, lerCorpo } from './_lib/validacao.js'

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

const justificativaMinima = z
  .number()
  .int('Use um número inteiro.')
  .min(0, 'Use um número de 0 a 2.000.')
  .max(2000, 'Use um número de 0 a 2.000.')

const esquemaCriar = z.strictObject({
  numero,
  titulo,
  dataLimitePropostas: dataIso,
  justificativaMinima: justificativaMinima.optional(),
  lotes,
})

const esquemaEditar = z
  .strictObject({
    id: idDocumento,
    numero: numero.optional(),
    titulo: titulo.optional(),
    dataLimitePropostas: dataIso.optional(),
    justificativaMinima: justificativaMinima.optional(),
    lotes: lotes.optional(),
  })
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
})
