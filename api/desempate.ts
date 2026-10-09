// PUT /api/desempate — registra a decisão de desempate da Comissão (RF-27). Perfil: presidente.
// O sistema não calcula desempate: confere, com src/domain/classificacao.ts, que as propostas
// informadas formam exatamente um grupo empatado atual do lote e grava a ordem decidida com a
// justificativa em chamamentos/{ch}/desempates/{id}, auditado. Registrar de novo o mesmo grupo edita.

import { FieldValue } from 'firebase-admin/firestore'
import { classificarLote, type PropostaDoLote } from '../src/domain/classificacao.js'
import { PERMISSOES } from '../src/domain/permissoes.js'
import { esquemaDesempate } from '../src/esquemas/resultado.js'
import { obterAdmin } from './_lib/admin.js'
import { ErroApi, MENSAGENS } from './_lib/erros.js'
import { gravar } from './_lib/gravar.js'
import { criarRota, json } from './_lib/http.js'
import { autenticar } from './_lib/porteiro.js'
import { exigirSemProblemas, lerCorpo } from './_lib/validacao.js'

/** Mesmo grupo → mesmo documento (a decisão pode ser refeita, com auditoria de antes/depois). */
function idDaDecisao(lote: string, propostas: string[]): string {
  return `${lote.replace(/[^A-Za-z0-9_-]/g, '_')}--${[...propostas].sort().join('-')}`
}

export const { GET, POST, PUT, PATCH, DELETE } = criarRota({
  PUT: async (requisicao) => {
    const autor = await autenticar(requisicao, PERMISSOES.desempate)
    const { chamamentoId, loteCodigo, ordem, justificativa } = await lerCorpo(requisicao, esquemaDesempate)
    const { db } = obterAdmin()
    const id = idDaDecisao(loteCodigo, ordem)

    await gravar(autor, async (transacao) => {
      const chamamento = await transacao.get(db.doc(`chamamentos/${chamamentoId}`))
      if (!chamamento.exists) throw new ErroApi(404, MENSAGENS.chamamentoNaoEncontrado)
      const lotes = (chamamento.get('lotes') ?? []) as { codigo: string }[]
      if (!lotes.some((l) => l.codigo === loteCodigo)) exigirSemProblemas({ loteCodigo: 'Lote não encontrado neste chamamento.' })

      const propostas = await transacao.get(
        db.collection(`chamamentos/${chamamentoId}/propostas`).where('loteCodigo', '==', loteCodigo),
      )
      const doLote: PropostaDoLote[] = propostas.docs.map((d) => ({
        id: d.id,
        totais: d.get('totais') ?? null,
        admissao: d.get('admissibilidade.situacao'),
      }))
      const grupo = classificarLote(doLote).empates.find(
        (e) => e.ids.length === ordem.length && ordem.every((p) => e.ids.includes(p)),
      )
      if (!grupo) throw new ErroApi(409, MENSAGENS.naoEmpatadas)

      const caminho = `chamamentos/${chamamentoId}/desempates/${id}`
      const atual = await transacao.get(db.doc(caminho))
      return [
        {
          caminho,
          acao: atual.exists ? 'editar' : 'criar',
          dados: {
            loteCodigo,
            nf: grupo.nf,
            propostas: [...ordem].sort(),
            ordem,
            justificativa,
            decididoPor: { uid: autor.uid, email: autor.email },
            decididoEm: FieldValue.serverTimestamp(),
          },
        },
      ]
    })
    return json(200, { id, chamamentoId })
  },
})
