// POST /api/chamamentos (criar) e PATCH /api/chamamentos (editar). Perfil: admin.
// dataLimitePropostas é a referência da D2 (Anexo IV, 3.3.1, IV): não muda depois que alguma
// proposta já tem totais calculados. justificativaMinima configura o mínimo da justificativa (C2).
// processoSei, indiceCorrecao e dataBaseCorrecao (correção monetária dos valores da D2): Etapa 4a.

import { PERMISSOES } from '../src/domain/permissoes.js'
import { esquemaCriarChamamento, esquemaEditarChamamento } from '../src/esquemas/cadastros.js'
import { obterAdmin } from './_lib/admin.js'
import { ErroApi } from './_lib/erros.js'
import { gravar } from './_lib/gravar.js'
import { criarRota, json } from './_lib/http.js'
import { autenticar } from './_lib/porteiro.js'
import { lerCorpo } from './_lib/validacao.js'

export const { GET, POST, PUT, PATCH, DELETE } = criarRota({
  POST: async (requisicao) => {
    const autor = await autenticar(requisicao, PERMISSOES.cadastros)
    const dados = await lerCorpo(requisicao, esquemaCriarChamamento)
    const id = obterAdmin().db.collection('chamamentos').doc().id
    await gravar(autor, () => [{ caminho: `chamamentos/${id}`, acao: 'criar', dados }])
    return json(201, { id })
  },

  PATCH: async (requisicao) => {
    const autor = await autenticar(requisicao, PERMISSOES.cadastros)
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
})
