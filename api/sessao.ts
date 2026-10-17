// /api/sessao — sessão da Comissão em chamamentos/{ch}/sessoes/{id}: data, lote(s) em pauta (lotes), status e
// presentes ({ nome, papel: presidente | membro }, exatamente um presidente, nomes não repetidos; sem login e
// sem declaração de impedimento). Perfis: admin e presidente (fazem tudo).
// POST abre. PATCH com "acao": presentes, foco, encerrar ou resetar. Sessão encerrada não aceita alteração
// (409). Tudo auditado. foco = { tipo: admissibilidade | subcriterio | d2 | resumo, propostaId, subcriterio? }
// (telão), só em proposta de lote da pauta. A avaliação só é aceita com sessaoId de sessão aberta.
// "resetar" (justificativa) descarta o que foi gravado na sessão; GET ?simular=true mostra a prévia (o que será
// revertido/apagado e os bloqueios). Ver _lib/resetSessao.ts.

import { FieldValue } from 'firebase-admin/firestore'
import { planoDoSubcriterio } from '../src/domain/avaliacao.js'
import { esquemaAbrirSessao, esquemaAlterarSessao, esquemaPreviaReset } from '../src/esquemas/sessao.js'
import { obterAdmin } from './_lib/admin.js'
import { ErroApi, MENSAGENS } from './_lib/erros.js'
import { gravar, type Autor } from './_lib/gravar.js'
import { criarRota, json } from './_lib/http.js'
import { autenticar } from './_lib/porteiro.js'
import { executarReset, previaReset } from './_lib/resetSessao.js'
import { exigirSemProblemas, lerConsulta, lerCorpo } from './_lib/validacao.js'

const db = () => obterAdmin().db

const assinatura = (autor: Autor) => ({ uid: autor.uid, email: autor.email })

export const { GET, POST, PUT, PATCH, DELETE } = criarRota({
  GET: async (requisicao) => {
    await autenticar(requisicao)
    const { chamamentoId, sessaoId } = lerConsulta(requisicao, esquemaPreviaReset)
    return json(200, await previaReset(chamamentoId, sessaoId))
  },

  POST: async (requisicao) => {
    const autor = await autenticar(requisicao)
    const { chamamentoId, data, lotes, presentes } = await lerCorpo(requisicao, esquemaAbrirSessao)
    const sessoes = db().collection(`chamamentos/${chamamentoId}/sessoes`)
    const id = sessoes.doc().id

    await gravar(autor, async (transacao) => {
      const chamamento = await transacao.get(db().doc(`chamamentos/${chamamentoId}`))
      if (!chamamento.exists) throw new ErroApi(404, MENSAGENS.chamamentoNaoEncontrado)
      const codigos = new Set(((chamamento.get('lotes') ?? []) as { codigo: string }[]).map((l) => l.codigo))
      const inexistente = lotes.find((l) => !codigos.has(l))
      if (inexistente) exigirSemProblemas({ lotes: `Lote não encontrado neste chamamento: ${inexistente}.` })

      const abertas = await transacao.get(sessoes.where('status', '==', 'aberta').limit(1))
      if (!abertas.empty) {
        throw new ErroApi(409, 'Já existe sessão aberta neste chamamento: encerre-a antes de abrir outra.')
      }
      return [
        {
          caminho: `chamamentos/${chamamentoId}/sessoes/${id}`,
          acao: 'criar',
          dados: { data, lotes, status: 'aberta', presentes, foco: null, abertaPor: assinatura(autor), abertaEm: FieldValue.serverTimestamp() },
        },
      ]
    })
    return json(201, { id, chamamentoId })
  },

  PATCH: async (requisicao) => {
    const autor = await autenticar(requisicao)
    const alteracao = await lerCorpo(requisicao, esquemaAlterarSessao)
    if (alteracao.acao === 'resetar') {
      const resultado = await executarReset(autor, alteracao.chamamentoId, alteracao.sessaoId, alteracao.justificativa)
      return json(200, { id: alteracao.sessaoId, chamamentoId: alteracao.chamamentoId, ...resultado })
    }
    const caminho = `chamamentos/${alteracao.chamamentoId}/sessoes/${alteracao.sessaoId}`

    await gravar(autor, async (transacao) => {
      const sessao = await transacao.get(db().doc(caminho))
      if (!sessao.exists) throw new ErroApi(404, MENSAGENS.sessaoNaoEncontrada)
      if (sessao.get('status') !== 'aberta') throw new ErroApi(409, MENSAGENS.sessaoEncerrada)

      let dados: Record<string, unknown>
      switch (alteracao.acao) {
        case 'encerrar':
          dados = { status: 'encerrada', foco: null, encerradaPor: assinatura(autor), encerradaEm: FieldValue.serverTimestamp() }
          break
        case 'presentes':
          dados = { presentes: alteracao.presentes }
          break
        case 'foco': {
          const { foco } = alteracao
          if (foco) {
            // A proposta precisa ser de um lote da pauta.
            const proposta = await transacao.get(db().doc(`chamamentos/${alteracao.chamamentoId}/propostas/${foco.propostaId}`))
            const lotes = (sessao.get('lotes') ?? []) as string[]
            const problemas: Record<string, string> = {}
            if (!proposta.exists || !lotes.includes(proposta.get('loteCodigo') as string)) {
              problemas['foco.propostaId'] = 'Proposta fora da pauta da sessão.'
            }
            if (foco.tipo === 'subcriterio' && !planoDoSubcriterio(foco.subcriterio!)) {
              problemas['foco.subcriterio'] = 'Subcritério inexistente na matriz.'
            }
            exigirSemProblemas(problemas)
          }
          dados = { foco }
          break
        }
      }
      return [{ caminho, acao: 'editar', dados }]
    })
    return json(200, { id: alteracao.sessaoId, chamamentoId: alteracao.chamamentoId })
  },
})
