// /api/avaliacao (C2): nível de um subcritério da D1 decidido pela Comissão. Perfis: admin e presidente.
// PUT registra em .../propostas/{p}/avaliacoes/{codigo} (o primeiro registro cria, os seguintes substituem),
// com nível, justificativa e páginas (sem decisão nem voto divergente). Os totais da proposta são recalculados
// na mesma transação (C4) e a conclusão é desfeita. sessaoId precisa ser de sessão aberta do chamamento, com a
// proposta na pauta, e vai para o documento; ao salvar, o subcritério vira o foco da sessão.
// DELETE { chamamentoId, propostaId, codigo } apaga o nível (sem exigir sessão), com recálculo; GET
// ?simular=true: prévia. Ver _lib/cascata.ts.

import { FieldValue } from 'firebase-admin/firestore'
import type { TotaisProposta } from '../src/domain/proposta.js'
import { esquemaRegistroAvaliacao, problemasDoNivel } from '../src/esquemas/avaliacao.js'
import { esquemaExcluirNivel, esquemaPreviaNivel } from '../src/esquemas/exclusao.js'
import { obterAdmin } from './_lib/admin.js'
import { alvoNivel, excluir, previaExclusao } from './_lib/cascata.js'
import { gravar, type Operacao } from './_lib/gravar.js'
import { criarRota, json } from './_lib/http.js'
import { autenticar } from './_lib/porteiro.js'
import { exigirPropostaEditavel, recalcular } from './_lib/recalcular.js'
import { exigirSessaoAberta } from './_lib/sessaoAberta.js'
import { exigirSemProblemas, lerConsulta, lerCorpo } from './_lib/validacao.js'

export const { GET, POST, PUT, PATCH, DELETE } = criarRota({
  GET: async (requisicao) => {
    await autenticar(requisicao)
    const { chamamentoId, propostaId, codigo } = lerConsulta(requisicao, esquemaPreviaNivel)
    return json(200, await previaExclusao(alvoNivel(chamamentoId, propostaId, codigo)))
  },

  PUT: async (requisicao) => {
    const autor = await autenticar(requisicao)
    const { chamamentoId, propostaId, sessaoId, ...registro } = await lerCorpo(requisicao, esquemaRegistroAvaliacao)
    const { db } = obterAdmin()
    let totais: TotaisProposta | undefined

    await gravar(autor, async (transacao) => {
      await exigirPropostaEditavel(transacao, chamamentoId, propostaId)
      // Etapa 4a: só em sessão aberta, com a proposta na pauta.
      const caminhoSessao = await exigirSessaoAberta(transacao, chamamentoId, sessaoId, propostaId)

      const chamamento = await transacao.get(db.doc(`chamamentos/${chamamentoId}`))
      const justificativaMinima = chamamento.get('justificativaMinima') as number | undefined
      exigirSemProblemas(problemasDoNivel(registro, { justificativaMinima }))

      const { codigo, ...campos } = registro
      const dados = { ...campos, paginas: [...new Set(campos.paginas)].sort((a, b) => a - b), sessaoId }
      const caminho = `chamamentos/${chamamentoId}/propostas/${propostaId}/avaliacoes/${codigo}`
      const existente = await transacao.get(db.doc(caminho))

      const recalculo = await recalcular(transacao, chamamentoId, propostaId, { colecao: 'avaliacoes', id: codigo, dados })
      totais = recalculo.totais
      const operacoes: Operacao[] = [
        // Registrar de novo substitui: decisão e voto divergente de um registro antigo saem.
        existente.exists
          ? { caminho, acao: 'editar', dados: { ...dados, decisao: FieldValue.delete(), votoDivergente: FieldValue.delete() } }
          : { caminho, acao: 'criar', dados },
        ...recalculo.operacoes,
        // Etapa 4b: o subcritério salvo vira o foco da sessão (projeção acompanha o registro).
        { caminho: caminhoSessao, acao: 'editar', dados: { foco: { tipo: 'subcriterio', propostaId, subcriterio: codigo } } },
      ]
      return operacoes
    })

    return json(200, { codigo: registro.codigo, totais })
  },

  DELETE: async (requisicao) => {
    const autor = await autenticar(requisicao)
    const { chamamentoId, propostaId, codigo } = await lerCorpo(requisicao, esquemaExcluirNivel)
    return json(200, await excluir(autor, alvoNivel(chamamentoId, propostaId, codigo)))
  },
})
