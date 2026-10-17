// /api/sessao — sessão da Comissão em chamamentos/{ch}/sessoes/{id}: data, lote(s) em pauta (lotes), status e
// presentes ({ nome, papel: presidente | membro }, exatamente um presidente, nomes não repetidos; sem login e
// sem declaração de impedimento). Perfis: admin e presidente (fazem tudo).
// POST abre. PATCH com "acao": presentes, foco ou encerrar. Sessão encerrada não aceita alteração (409).
// foco = { tipo: admissibilidade | subcriterio | d2 | resumo, propostaId, subcriterio? } (telão), só em
// proposta de lote da pauta. A avaliação só é aceita com sessaoId de sessão aberta.
// DELETE { chamamentoId, sessaoId } apaga a sessão e tudo que foi registrado com o sessaoId dela (aberta ou
// encerrada), recalculando os totais das propostas afetadas; GET ?simular=true: prévia. Ver _lib/cascata.ts.

import { planoDoSubcriterio } from '../src/domain/avaliacao.js'
import { esquemaExcluirSessao, esquemaPreviaSessao } from '../src/esquemas/exclusao.js'
import { esquemaAbrirSessao, esquemaAlterarSessao } from '../src/esquemas/sessao.js'
import { obterAdmin } from './_lib/admin.js'
import { alvoSessao, excluir, previaExclusao } from './_lib/cascata.js'
import { ErroApi, MENSAGENS } from './_lib/erros.js'
import { gravar } from './_lib/gravar.js'
import { criarRota, json } from './_lib/http.js'
import { autenticar } from './_lib/porteiro.js'
import { exigirSemProblemas, lerConsulta, lerCorpo } from './_lib/validacao.js'

const db = () => obterAdmin().db

export const { GET, POST, PUT, PATCH, DELETE } = criarRota({
  GET: async (requisicao) => {
    await autenticar(requisicao)
    const { chamamentoId, sessaoId } = lerConsulta(requisicao, esquemaPreviaSessao)
    return json(200, await previaExclusao(alvoSessao(chamamentoId, sessaoId)))
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
          dados: { data, lotes, status: 'aberta', presentes, foco: null },
        },
      ]
    })
    return json(201, { id, chamamentoId })
  },

  PATCH: async (requisicao) => {
    const autor = await autenticar(requisicao)
    const alteracao = await lerCorpo(requisicao, esquemaAlterarSessao)
    const caminho = `chamamentos/${alteracao.chamamentoId}/sessoes/${alteracao.sessaoId}`

    await gravar(autor, async (transacao) => {
      const sessao = await transacao.get(db().doc(caminho))
      if (!sessao.exists) throw new ErroApi(404, MENSAGENS.sessaoNaoEncontrada)
      if (sessao.get('status') !== 'aberta') throw new ErroApi(409, MENSAGENS.sessaoEncerrada)

      let dados: Record<string, unknown>
      switch (alteracao.acao) {
        case 'encerrar':
          dados = { status: 'encerrada', foco: null }
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

  DELETE: async (requisicao) => {
    const autor = await autenticar(requisicao)
    const { chamamentoId, sessaoId } = await lerCorpo(requisicao, esquemaExcluirSessao)
    return json(200, await excluir(autor, alvoSessao(chamamentoId, sessaoId)))
  },
})
