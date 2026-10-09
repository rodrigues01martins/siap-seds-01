// PUT /api/avaliacao (C2): registra o nível de um subcritério da D1 decidido pela Comissão.
// Perfis: presidente, relator, membro. Documento em .../propostas/{p}/avaliacoes/{codigo}:
// o primeiro registro cria, os seguintes editam (auditoria guarda antes e depois).
// Os totais da proposta são recalculados na mesma transação (C4).
// sessaoId precisa ser de sessão aberta do chamamento (Etapa 4a).

import { z } from 'zod'
import { problemasDoRegistro } from '../src/domain/avaliacao.js'
import { PERMISSOES } from '../src/domain/permissoes.js'
import { obterAdmin } from './_lib/admin.js'
import { ErroApi, MENSAGENS } from './_lib/erros.js'
import { gravar } from './_lib/gravar.js'
import { criarRota, json } from './_lib/http.js'
import { autenticar } from './_lib/porteiro.js'
import { exigirPropostaEditavel, recalcular } from './_lib/recalcular.js'
import { exigirSemProblemas, idDocumento, lerCorpo } from './_lib/validacao.js'
import type { TotaisProposta } from '../src/domain/proposta.js'

// Tipos e formato no zod; regras de negócio (matriz, escala, páginas de corte) em src/domain.
const esquema = z.strictObject({
  chamamentoId: idDocumento,
  propostaId: idDocumento,
  codigo: z.string({ error: 'Informe o subcritério.' }).trim().min(1, 'Informe o subcritério.'),
  nivel: z.number({ error: 'Informe o nível.' }).int('O nível deve ser um inteiro de 0 a 4.'),
  justificativa: z.string({ error: 'Informe a justificativa.' }).trim(),
  paginas: z.array(z.number()).default([]),
  decisao: z.enum(['unanimidade', 'maioria'], { error: 'Use unanimidade ou maioria.' }),
  votoDivergente: z.string().trim().min(1, 'Descreva o voto divergente.').optional(),
  sessaoId: idDocumento,
})

export const { GET, POST, PUT, PATCH, DELETE } = criarRota({
  PUT: async (requisicao) => {
    const autor = await autenticar(requisicao, PERMISSOES.nivelD1)
    const { chamamentoId, propostaId, ...registro } = await lerCorpo(requisicao, esquema)
    const { db } = obterAdmin()
    let totais: TotaisProposta | undefined

    await gravar(autor, async (transacao) => {
      await exigirPropostaEditavel(transacao, chamamentoId, propostaId)
      // Etapa 4a: só em sessão aberta (lida na transação: encerrar a sessão conflita com a gravação).
      const sessao = await transacao.get(db.doc(`chamamentos/${chamamentoId}/sessoes/${registro.sessaoId}`))
      if (sessao.get('status') !== 'aberta') throw new ErroApi(409, MENSAGENS.semSessaoAberta)

      const chamamento = await transacao.get(db.doc(`chamamentos/${chamamentoId}`))
      const justificativaMinima = chamamento.get('justificativaMinima') as number | undefined
      exigirSemProblemas(problemasDoRegistro(registro, { justificativaMinima }))

      const { codigo, ...campos } = registro
      const dados = { ...campos, paginas: [...new Set(campos.paginas)].sort((a, b) => a - b) }
      const caminho = `chamamentos/${chamamentoId}/propostas/${propostaId}/avaliacoes/${codigo}`
      const existente = await transacao.get(db.doc(caminho))

      const recalculo = await recalcular(transacao, chamamentoId, propostaId, { colecao: 'avaliacoes', id: codigo, dados })
      totais = recalculo.totais
      return [{ caminho, acao: existente.exists ? 'editar' : 'criar', dados }, ...recalculo.operacoes]
    })

    return json(200, { codigo: registro.codigo, totais })
  },
})
