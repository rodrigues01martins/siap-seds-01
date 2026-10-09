// /api/diligencias — diligências da proposta (RF-28). Perfis: presidente e relator.
// POST cria (objeto, prazo); PATCH com "acao": responder (registra a resposta) ou encerrar (conclusão).
// Em chamamentos/{ch}/propostas/{p}/diligencias/{id}; encerrada não muda (409); proposta homologada
// não aceita (trava de gravar.ts). Diligência em aberto impede a homologação (api/homologar.ts).
// Não admite inclusão de conteúdo técnico novo (Anexo III, 29.3) — aviso fixo na tela.

import { FieldValue } from 'firebase-admin/firestore'
import { PERMISSOES } from '../src/domain/permissoes.js'
import { esquemaAlterarDiligencia, esquemaCriarDiligencia } from '../src/esquemas/resultado.js'
import { obterAdmin } from './_lib/admin.js'
import { ErroApi, MENSAGENS } from './_lib/erros.js'
import { gravar, type Autor } from './_lib/gravar.js'
import { criarRota, json } from './_lib/http.js'
import { autenticar } from './_lib/porteiro.js'
import { lerCorpo } from './_lib/validacao.js'

const assinatura = (autor: Autor) => ({ uid: autor.uid, email: autor.email })

export const { GET, POST, PUT, PATCH, DELETE } = criarRota({
  POST: async (requisicao) => {
    const autor = await autenticar(requisicao, PERMISSOES.diligencias)
    const { chamamentoId, propostaId, objeto, prazo } = await lerCorpo(requisicao, esquemaCriarDiligencia)
    const { db } = obterAdmin()
    const caminhoProposta = `chamamentos/${chamamentoId}/propostas/${propostaId}`
    const id = db.collection(`${caminhoProposta}/diligencias`).doc().id

    await gravar(autor, async (transacao) => {
      if (!(await transacao.get(db.doc(caminhoProposta))).exists) throw new ErroApi(404, MENSAGENS.propostaNaoEncontrada)
      return [
        {
          caminho: `${caminhoProposta}/diligencias/${id}`,
          acao: 'criar',
          dados: { objeto, prazo, status: 'aberta', criadaPor: assinatura(autor), criadaEm: FieldValue.serverTimestamp() },
        },
      ]
    })
    return json(201, { id })
  },

  PATCH: async (requisicao) => {
    const autor = await autenticar(requisicao, PERMISSOES.diligencias)
    const alteracao = await lerCorpo(requisicao, esquemaAlterarDiligencia)
    const caminho = `chamamentos/${alteracao.chamamentoId}/propostas/${alteracao.propostaId}/diligencias/${alteracao.id}`

    await gravar(autor, async (transacao) => {
      const diligencia = await transacao.get(obterAdmin().db.doc(caminho))
      if (!diligencia.exists) throw new ErroApi(404, MENSAGENS.diligenciaNaoEncontrada)
      if (diligencia.get('status') === 'encerrada') throw new ErroApi(409, MENSAGENS.diligenciaEncerrada)
      const agora = FieldValue.serverTimestamp()
      const dados =
        alteracao.acao === 'responder'
          ? { status: 'respondida', resposta: { texto: alteracao.resposta, registradaPor: assinatura(autor), registradaEm: agora } }
          : { status: 'encerrada', conclusao: alteracao.conclusao, encerradaPor: assinatura(autor), encerradaEm: agora }
      return [{ caminho, acao: 'editar', dados }]
    })
    return json(200, { id: alteracao.id })
  },
})
