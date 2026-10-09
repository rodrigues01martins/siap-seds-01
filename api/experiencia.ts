// /api/experiencia (C3): experiências da OSC (D2) e seus documentos comprobatórios.
// POST cria, PATCH edita, DELETE exclui. Perfis: presidente, relator.
// Documento em .../propostas/{p}/experiencias/{id}. Regras (categorias A–D, A+B, datas, porte)
// vêm de src/domain; a D2 e os totais são recalculados na mesma transação (C4).

import { z } from 'zod'
import { problemasDaExperiencia } from '../src/domain/d2.js'
import { PERMISSOES } from '../src/domain/permissoes.js'
import type { TotaisProposta } from '../src/domain/proposta.js'
import { obterAdmin } from './_lib/admin.js'
import { ErroApi, MENSAGENS } from './_lib/erros.js'
import { gravar, type Autor, type Operacao } from './_lib/gravar.js'
import { criarRota, json } from './_lib/http.js'
import { autenticar } from './_lib/porteiro.js'
import { exigirPropostaEditavel, paraExperiencia, recalcular, type Mudanca } from './_lib/recalcular.js'
import { algumCampoAlem, exigirSemProblemas, idDocumento, lerCorpo } from './_lib/validacao.js'

const documento = z.strictObject({
  tipo: z.string().trim().min(1, 'Informe o tipo do documento.'),
  descricao: z.string().trim().min(1, 'Informe a descrição do documento.'),
  referencia: z.string().trim().min(1).optional(),
})

const porte = z.number().nullable()

// Formato no zod; o conteúdo (categorias válidas, A+B, datas, inteiros ≥ 0) é validado
// por problemasDaExperiencia sobre o documento final.
const campos = {
  descricao: z.string().trim().max(500, 'Use no máximo 500 caracteres.'),
  categorias: z
    .array(z.string())
    .min(1, 'Informe ao menos uma categoria.')
    .refine((lista) => new Set(lista).size === lista.length, 'Há categorias repetidas.'),
  internacao: z.boolean(),
  inicio: z.string({ error: 'Informe o início (AAAA-MM-DD).' }),
  fim: z.string().nullable(),
  vagas: porte,
  unidades: porte,
  trabalhadores: porte,
  valorAnualCentavos: porte,
  execucaoSatisfatoria: z.boolean(),
  documentos: z.array(documento).max(50, 'Use no máximo 50 documentos.'),
}

const alvo = { chamamentoId: idDocumento, propostaId: idDocumento }

const esquemaCriar = z.strictObject({
  ...alvo,
  descricao: campos.descricao.optional(),
  categorias: campos.categorias,
  internacao: campos.internacao.default(false),
  inicio: campos.inicio,
  fim: campos.fim.default(null),
  vagas: porte.default(null),
  unidades: porte.default(null),
  trabalhadores: porte.default(null),
  valorAnualCentavos: porte.default(null),
  execucaoSatisfatoria: campos.execucaoSatisfatoria.default(false),
  documentos: campos.documentos.default([]),
})

const esquemaEditar = z
  .strictObject({ ...alvo, id: idDocumento, ...z.object(campos).partial().shape })
  .refine(algumCampoAlem(['chamamentoId', 'propostaId', 'id']), 'Informe ao menos um campo para alterar.')

const esquemaExcluir = z.strictObject({ ...alvo, id: idDocumento })

/** Firestore não aceita undefined: tira "referencia" ausente dos documentos. */
function limparDocumentos<T extends { documentos?: z.output<typeof documento>[] }>(dados: T): T {
  if (!dados.documentos) return dados
  return {
    ...dados,
    documentos: dados.documentos.map(({ referencia, ...resto }) => ({ ...resto, ...(referencia ? { referencia } : {}) })),
  }
}

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
    const { chamamentoId, propostaId, ...dados } = limparDocumentos(await lerCorpo(requisicao, esquemaCriar))
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
    const { chamamentoId, propostaId, id, ...alteracoes } = limparDocumentos(await lerCorpo(requisicao, esquemaEditar))
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
    const { chamamentoId, propostaId, id } = await lerCorpo(requisicao, esquemaExcluir)
    const caminho = `chamamentos/${chamamentoId}/propostas/${propostaId}/experiencias/${id}`
    const totais = await alterar(autor, chamamentoId, propostaId, id, (atual) => {
      exigirExistente(atual)
      return { operacao: { caminho, acao: 'excluir' }, final: null }
    })
    return json(200, { id, totais })
  },
})
