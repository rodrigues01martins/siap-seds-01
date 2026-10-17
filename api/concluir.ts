// POST /api/concluir — "Homologar" virou "Concluir" (Simplificação 2/4). Perfis: admin e presidente.
// { chamamentoId, propostaId, acao: 'concluir' | 'desfazer' }: ação reversível, sem justificativa e sem trava.
// Conclui só com a admissibilidade registrada e, se a proposta foi admitida, os níveis e as justificativas de
// todos os subcritérios da D1 (src/domain/conclusao.ts); senão 409 com o que falta. Grava concluida (true ou
// false). Qualquer alteração posterior na avaliação desfaz a conclusão (recalcular.ts e admissibilidade).
// Relatórios: proposta não concluída sai com a marca MINUTA; concluída sai como final.

import { problemasParaConcluir } from '../src/domain/conclusao.js'
import { idDocumento, z } from '../src/esquemas/base.js'
import { obterAdmin } from './_lib/admin.js'
import { ErroApi, MENSAGENS } from './_lib/erros.js'
import { gravar } from './_lib/gravar.js'
import { criarRota, json } from './_lib/http.js'
import { autenticar } from './_lib/porteiro.js'
import { lerCorpo } from './_lib/validacao.js'

export const esquemaConcluir = z.strictObject({
  chamamentoId: idDocumento,
  propostaId: idDocumento,
  acao: z.enum(['concluir', 'desfazer'], { error: 'Ação inválida. Use concluir ou desfazer.' }),
})

export const { GET, POST, PUT, PATCH, DELETE } = criarRota({
  POST: async (requisicao) => {
    const autor = await autenticar(requisicao)
    const { chamamentoId, propostaId, acao } = await lerCorpo(requisicao, esquemaConcluir)
    const caminho = `chamamentos/${chamamentoId}/propostas/${propostaId}`
    const concluida = acao === 'concluir'

    await gravar(autor, async (transacao) => {
      const { db } = obterAdmin()
      const proposta = await transacao.get(db.doc(caminho))
      if (!proposta.exists) throw new ErroApi(404, MENSAGENS.propostaNaoEncontrada)
      if (concluida) {
        const avaliacoes = await transacao.get(db.collection(`${caminho}/avaliacoes`))
        const problemas = problemasParaConcluir({
          admissibilidade: proposta.get('admissibilidade') as { situacao?: string } | undefined,
          avaliacoes: avaliacoes.docs.map((d) => ({ codigo: d.id, nivel: d.get('nivel'), justificativa: d.get('justificativa') })),
        })
        if (problemas.length > 0) throw new ErroApi(409, `Não é possível concluir: ${problemas.join('; ')}.`)
      }
      return [{ caminho, acao: 'editar', dados: { concluida } }]
    })
    return json(200, { chamamentoId, propostaId, concluida })
  },
})
