// POST /api/homologar (C5): o presidente homologa a proposta. Perfil: presidente.
// Só homologa proposta cujo status (totais gravados pelo servidor) não é "pendente" e sem diligência
// em aberto (RF-28).
// Grava bloqueada = true, homologadaPor e homologadaEm, auditado; depois disso a trava de
// gravar.ts devolve 409 para qualquer escrita na proposta e em suas subcoleções (C2, C3).

import { FieldValue } from 'firebase-admin/firestore'
import { z } from 'zod'
import { MATRIZ_2026 } from '../src/domain/matriz/index.js'
import { PERMISSOES } from '../src/domain/permissoes.js'
import { STATUS_DILIGENCIA_EM_ABERTO } from '../src/esquemas/resultado.js'
import { obterAdmin } from './_lib/admin.js'
import { ErroApi, MENSAGENS } from './_lib/erros.js'
import { gravar } from './_lib/gravar.js'
import { criarRota, json } from './_lib/http.js'
import { autenticar } from './_lib/porteiro.js'
import { idDocumento, lerCorpo } from './_lib/validacao.js'

const esquema = z.strictObject({ chamamentoId: idDocumento, propostaId: idDocumento })

const TOTAL_SUBCRITERIOS = MATRIZ_2026.dimensao1.planos.reduce((soma, p) => soma + p.subcriterios.length, 0)

export const { GET, POST, PUT, PATCH, DELETE } = criarRota({
  POST: async (requisicao) => {
    const autor = await autenticar(requisicao, PERMISSOES.homologar)
    const { chamamentoId, propostaId } = await lerCorpo(requisicao, esquema)
    const caminho = `chamamentos/${chamamentoId}/propostas/${propostaId}`

    await gravar(autor, async (transacao) => {
      const proposta = await transacao.get(obterAdmin().db.doc(caminho))
      if (!proposta.exists) throw new ErroApi(404, MENSAGENS.propostaNaoEncontrada)
      if (proposta.get('bloqueada') === true) throw new ErroApi(409, MENSAGENS.homologada)
      const status = proposta.get('totais.status') as string | undefined
      if (status === undefined || status === 'pendente') {
        throw new ErroApi(
          409,
          `Proposta com avaliação pendente: conclua os ${TOTAL_SUBCRITERIOS} subcritérios antes de homologar.`,
        )
      }
      // RF-28: diligência em aberto impede a homologação.
      const diligencias = await transacao.get(
        obterAdmin().db.collection(`${caminho}/diligencias`).where('status', 'in', [...STATUS_DILIGENCIA_EM_ABERTO]).limit(1),
      )
      if (!diligencias.empty) throw new ErroApi(409, MENSAGENS.diligenciaEmAberto)
      return [
        {
          caminho,
          acao: 'editar',
          dados: {
            bloqueada: true,
            homologadaPor: { uid: autor.uid, email: autor.email },
            homologadaEm: FieldValue.serverTimestamp(),
          },
        },
      ]
    })

    return json(200, { chamamentoId, propostaId, bloqueada: true })
  },
})
