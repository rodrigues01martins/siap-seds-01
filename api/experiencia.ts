// /api/experiencia (C3): experiências da OSC (D2) e seus documentos comprobatórios.
// POST cria, PATCH edita, DELETE exclui. Perfis: presidente, relator.
// Documento em .../propostas/{p}/experiencias/{id}. Regras (categorias A–D, A+B, D com MROSC, datas,
// porte, desconsideração por critério) vêm de src/domain; esquema em src/esquemas/experiencia.ts.
// Internação vem da modalidade e execução satisfatória, dos documentos aceitos (Etapa 4b).
// A D2 e os totais são recalculados na mesma transação (C4).

import { problemasDaExperiencia } from '../src/domain/d2.js'
import { PERMISSOES } from '../src/domain/permissoes.js'
import type { TotaisProposta } from '../src/domain/proposta.js'
import {
  esquemaCriarExperiencia,
  esquemaEditarExperiencia,
  esquemaExcluirExperiencia,
  paraExperiencia,
} from '../src/esquemas/experiencia.js'
import { obterAdmin } from './_lib/admin.js'
import { ErroApi, MENSAGENS } from './_lib/erros.js'
import { gravar, type Autor, type Operacao } from './_lib/gravar.js'
import { criarRota, json } from './_lib/http.js'
import { autenticar } from './_lib/porteiro.js'
import { exigirPropostaEditavel, recalcular, type Mudanca } from './_lib/recalcular.js'
import { exigirSemProblemas, lerCorpo } from './_lib/validacao.js'

/**
 * Executa a operação sobre a experiência e o recálculo na mesma transação.
 * `montar` recebe o documento atual (ou null) e devolve a operação e o documento final.
 */
async function alterar(
  autor: Autor,
  chamamentoId: string,
  propostaId: string,
  id: string,
  montar: (atual: Record<string, unknown> | null) => { operacao: Operacao; final: Record<string, unknown> | null },
): Promise<TotaisProposta> {
  const caminho = `chamamentos/${chamamentoId}/propostas/${propostaId}/experiencias/${id}`
  let totais: TotaisProposta | undefined

  await gravar(autor, async (transacao) => {
    await exigirPropostaEditavel(transacao, chamamentoId, propostaId)
    const atual = await transacao.get(obterAdmin().db.doc(caminho))
    const { operacao, final } = montar(atual.exists ? (atual.data() ?? {}) : null)
    if (final) exigirSemProblemas(problemasDaExperiencia(paraExperiencia(id, final)))

    const mudanca: Mudanca = { colecao: 'experiencias', id, dados: final }
    const recalculo = await recalcular(transacao, chamamentoId, propostaId, mudanca)
    totais = recalculo.totais
    return [operacao, ...recalculo.operacoes]
  })
  return totais!
}

function exigirExistente(atual: Record<string, unknown> | null): Record<string, unknown> {
  if (!atual) throw new ErroApi(404, MENSAGENS.naoEncontrado)
  return atual
}

export const { GET, POST, PUT, PATCH, DELETE } = criarRota({
  POST: async (requisicao) => {
    const autor = await autenticar(requisicao, PERMISSOES.experienciasD2)
    const { chamamentoId, propostaId, ...dados } = await lerCorpo(requisicao, esquemaCriarExperiencia)
    const id = obterAdmin().db.collection(`chamamentos/${chamamentoId}/propostas/${propostaId}/experiencias`).doc().id
    const caminho = `chamamentos/${chamamentoId}/propostas/${propostaId}/experiencias/${id}`
    const totais = await alterar(autor, chamamentoId, propostaId, id, () => ({
      operacao: { caminho, acao: 'criar', dados },
      final: dados,
    }))
    return json(201, { id, totais })
  },

  PATCH: async (requisicao) => {
    const autor = await autenticar(requisicao, PERMISSOES.experienciasD2)
    const { chamamentoId, propostaId, id, ...alteracoes } = await lerCorpo(requisicao, esquemaEditarExperiencia)
    const caminho = `chamamentos/${chamamentoId}/propostas/${propostaId}/experiencias/${id}`
    const totais = await alterar(autor, chamamentoId, propostaId, id, (atual) => ({
      operacao: { caminho, acao: 'editar', dados: alteracoes },
      // Valida a junção com o que já existe (ex.: fim novo contra o início gravado).
      final: { ...exigirExistente(atual), ...alteracoes },
    }))
    return json(200, { id, totais })
  },

  DELETE: async (requisicao) => {
    const autor = await autenticar(requisicao, PERMISSOES.experienciasD2)
    const { chamamentoId, propostaId, id } = await lerCorpo(requisicao, esquemaExcluirExperiencia)
    const caminho = `chamamentos/${chamamentoId}/propostas/${propostaId}/experiencias/${id}`
    const totais = await alterar(autor, chamamentoId, propostaId, id, (atual) => {
      exigirExistente(atual)
      return { operacao: { caminho, acao: 'excluir' }, final: null }
    })
    return json(200, { id, totais })
  },
})
