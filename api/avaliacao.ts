// PUT /api/avaliacao (C2): registra o nível de um subcritério da D1 decidido pela Comissão.
// Perfis: admin e presidente. Documento em .../propostas/{p}/avaliacoes/{codigo}:
// o primeiro registro cria, os seguintes editam (auditoria guarda antes e depois).
// Os totais da proposta são recalculados na mesma transação (C4).
// sessaoId precisa ser de sessão aberta do chamamento, com a proposta na pauta (Etapas 4a e 4b), e vai
// para o documento e para cada registro de auditoria; ao salvar, o subcritério vira o foco da sessão.

import { problemasDoRegistro } from '../src/domain/avaliacao.js'
import { esquemaRegistroAvaliacao } from '../src/esquemas/avaliacao.js'
import { obterAdmin } from './_lib/admin.js'
import { gravar } from './_lib/gravar.js'
import { criarRota, json } from './_lib/http.js'
import { autenticar } from './_lib/porteiro.js'
import { exigirPropostaEditavel, recalcular } from './_lib/recalcular.js'
import { exigirSessaoAberta } from './_lib/sessaoAberta.js'
import { exigirSemProblemas, lerCorpo } from './_lib/validacao.js'
import type { TotaisProposta } from '../src/domain/proposta.js'

export const { GET, POST, PUT, PATCH, DELETE } = criarRota({
  PUT: async (requisicao) => {
    const autor = await autenticar(requisicao)
    const { chamamentoId, propostaId, ...registro } = await lerCorpo(requisicao, esquemaRegistroAvaliacao)
    const { db } = obterAdmin()
    let totais: TotaisProposta | undefined

    await gravar(autor, async (transacao) => {
      await exigirPropostaEditavel(transacao, chamamentoId, propostaId)
      // Etapa 4a: só em sessão aberta, com a proposta na pauta.
      const caminhoSessao = await exigirSessaoAberta(transacao, chamamentoId, registro.sessaoId, propostaId)

      const chamamento = await transacao.get(db.doc(`chamamentos/${chamamentoId}`))
      const justificativaMinima = chamamento.get('justificativaMinima') as number | undefined
      exigirSemProblemas(problemasDoRegistro(registro, { justificativaMinima }))

      const { codigo, ...campos } = registro
      const dados = { ...campos, paginas: [...new Set(campos.paginas)].sort((a, b) => a - b) }
      const caminho = `chamamentos/${chamamentoId}/propostas/${propostaId}/avaliacoes/${codigo}`
      const existente = await transacao.get(db.doc(caminho))

      const recalculo = await recalcular(transacao, chamamentoId, propostaId, { colecao: 'avaliacoes', id: codigo, dados })
      totais = recalculo.totais
      return [
        { caminho, acao: existente.exists ? 'editar' : 'criar', dados },
        ...recalculo.operacoes,
        // Etapa 4b: o subcritério salvo vira o foco da sessão (projeção acompanha o registro).
        { caminho: caminhoSessao, acao: 'editar', dados: { foco: { tipo: 'subcriterio', propostaId, subcriterio: codigo } } },
      ]
    }, { sessaoId: registro.sessaoId })

    return json(200, { codigo: registro.codigo, totais })
  },
})
