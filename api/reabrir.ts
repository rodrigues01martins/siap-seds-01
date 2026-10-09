// POST /api/reabrir — reabre proposta homologada (RF-18). Perfil: presidente.
// Motivo obrigatório; bloqueada volta a false, registra reabertoPor, reabertoEm e o motivo e limpa a
// homologação anterior (o histórico fica na auditoria). Única escrita permitida em proposta homologada.

import { FieldValue } from 'firebase-admin/firestore'
import { PERMISSOES } from '../src/domain/permissoes.js'
import { esquemaReabrir } from '../src/esquemas/resultado.js'
import { obterAdmin } from './_lib/admin.js'
import { ErroApi, MENSAGENS } from './_lib/erros.js'
import { gravar } from './_lib/gravar.js'
import { criarRota, json } from './_lib/http.js'
import { autenticar } from './_lib/porteiro.js'
import { lerCorpo } from './_lib/validacao.js'

export const { GET, POST, PUT, PATCH, DELETE } = criarRota({
  POST: async (requisicao) => {
    const autor = await autenticar(requisicao, PERMISSOES.reabrir)
    const { chamamentoId, propostaId, motivo } = await lerCorpo(requisicao, esquemaReabrir)
    const caminho = `chamamentos/${chamamentoId}/propostas/${propostaId}`

    await gravar(
      autor,
      async (transacao) => {
        const proposta = await transacao.get(obterAdmin().db.doc(caminho))
        if (!proposta.exists) throw new ErroApi(404, MENSAGENS.propostaNaoEncontrada)
        if (proposta.get('bloqueada') !== true) throw new ErroApi(409, MENSAGENS.naoHomologada)
        return [
          {
            caminho,
            acao: 'editar',
            dados: {
              bloqueada: false,
              reabertoPor: { uid: autor.uid, email: autor.email },
              reabertoEm: FieldValue.serverTimestamp(),
              motivoReabertura: motivo,
              homologadaPor: null,
              homologadaEm: null,
            },
          },
        ]
      },
      { permitirPropostaHomologada: true },
    )
    return json(200, { chamamentoId, propostaId, bloqueada: false })
  },
})
