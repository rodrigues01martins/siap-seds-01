// /api/avaliacao (C2): nível de um subcritério da D1 decidido pela Comissão. Perfis: admin e presidente.
// PUT (salvamento automático, Simplificação 3/4) grava em .../propostas/{p}/avaliacoes/{codigo} o que vier —
// nível (null desmarca), justificativa e/ou páginas —, mesclado ao que já está gravado (o primeiro registro cria).
// Rascunho vale: a justificativa curta é pendência, conferida ao concluir (src/domain/conclusao.ts). Os totais da
// proposta são recalculados na mesma transação (C4) e a conclusão é desfeita. sessaoId precisa ser de sessão
// aberta do chamamento, com a proposta na pauta, e vai para o documento. Salvar não mexe no foco do telão (quem
// projeta é o interruptor "Projetar" da tela, PATCH /api/sessao).
// DELETE { chamamentoId, propostaId, codigo } apaga o nível (sem exigir sessão), com recálculo; GET
// ?simular=true: prévia. Ver _lib/cascata.ts.

import { FieldValue } from 'firebase-admin/firestore'
import type { TotaisProposta } from '../src/domain/proposta.js'
import { esquemaSalvarAvaliacao, problemasDoRascunho } from '../src/esquemas/avaliacao.js'
import { esquemaExcluirNivel, esquemaPreviaNivel } from '../src/esquemas/exclusao.js'
import { obterAdmin } from './_lib/admin.js'
import { alvoNivel, excluir, previaExclusao } from './_lib/cascata.js'
import { ErroApi } from './_lib/erros.js'
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
    const { chamamentoId, propostaId, sessaoId, codigo, ...campos } = await lerCorpo(requisicao, esquemaSalvarAvaliacao)
    if (campos.nivel === undefined && campos.justificativa === undefined && campos.paginas === undefined) {
      throw new ErroApi(400, 'Informe o nível, a justificativa ou as páginas.')
    }
    exigirSemProblemas(problemasDoRascunho({ codigo, ...campos }))
    const { db } = obterAdmin()
    let totais: TotaisProposta | undefined

    await gravar(autor, async (transacao) => {
      await exigirPropostaEditavel(transacao, chamamentoId, propostaId)
      // Etapa 4a: só em sessão aberta, com a proposta na pauta.
      await exigirSessaoAberta(transacao, chamamentoId, sessaoId, propostaId)

      const caminho = `chamamentos/${chamamentoId}/propostas/${propostaId}/avaliacoes/${codigo}`
      const existente = await transacao.get(db.doc(caminho))
      const atual = existente.data() ?? {}
      const dados = {
        nivel: campos.nivel !== undefined ? campos.nivel : ((atual.nivel as number | null | undefined) ?? null),
        justificativa: campos.justificativa ?? ((atual.justificativa as string | undefined) ?? ''),
        paginas: campos.paginas ? [...new Set(campos.paginas)].sort((a, b) => a - b) : ((atual.paginas as number[] | undefined) ?? []),
        sessaoId,
      }

      const recalculo = await recalcular(transacao, chamamentoId, propostaId, { colecao: 'avaliacoes', id: codigo, dados })
      totais = recalculo.totais
      const operacoes: Operacao[] = [
        // Decisão e voto divergente de um registro anterior à Simplificação 2/4 saem.
        existente.exists
          ? { caminho, acao: 'editar', dados: { ...dados, decisao: FieldValue.delete(), votoDivergente: FieldValue.delete() } }
          : { caminho, acao: 'criar', dados },
        ...recalculo.operacoes,
      ]
      return operacoes
    })

    return json(200, { codigo, totais })
  },

  DELETE: async (requisicao) => {
    const autor = await autenticar(requisicao)
    const { chamamentoId, propostaId, codigo } = await lerCorpo(requisicao, esquemaExcluirNivel)
    return json(200, await excluir(autor, alvoNivel(chamamentoId, propostaId, codigo)))
  },
})
