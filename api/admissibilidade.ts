// PUT /api/admissibilidade — admissibilidade do Caderno (Anexo III, item 28), simplificada: admitida (sim/não),
// motivo (obrigatório se "não") e páginas inicial/final por PA com página de corte (src/domain). Perfis: admin
// e presidente. Grava propostas/{p}.admissibilidade { admitida, motivo?, planos, situacao, sessaoId } e desfaz
// a conclusão da proposta. Não admitida não segue para C2/C3 (recalcular.ts).
// Só em sessão aberta com a proposta na pauta; o sessaoId vai para admissibilidade.sessaoId.

import { esquemaAdmissibilidade, apurarPlanos, problemasDaAdmissao } from '../src/esquemas/admissibilidade.js'
import { obterAdmin } from './_lib/admin.js'
import { ErroApi, MENSAGENS } from './_lib/erros.js'
import { gravar } from './_lib/gravar.js'
import { criarRota, json } from './_lib/http.js'
import { autenticar } from './_lib/porteiro.js'
import { exigirSessaoAberta } from './_lib/sessaoAberta.js'
import { exigirSemProblemas, lerCorpo } from './_lib/validacao.js'

export const { GET, POST, PUT, PATCH, DELETE } = criarRota({
  PUT: async (requisicao) => {
    const autor = await autenticar(requisicao)
    const { chamamentoId, propostaId, sessaoId, ...entrada } = await lerCorpo(requisicao, esquemaAdmissibilidade)
    const caminho = `chamamentos/${chamamentoId}/propostas/${propostaId}`
    exigirSemProblemas(problemasDaAdmissao(entrada))
    const admissibilidade = {
      admitida: entrada.admitida,
      ...(entrada.admitida || !entrada.motivo ? {} : { motivo: entrada.motivo }),
      planos: apurarPlanos(entrada.planos),
      situacao: entrada.admitida ? 'admitida' : 'nao_admitida',
      sessaoId,
    }

    await gravar(autor, async (transacao) => {
      const proposta = await transacao.get(obterAdmin().db.doc(caminho))
      if (!proposta.exists) throw new ErroApi(404, MENSAGENS.propostaNaoEncontrada)
      await exigirSessaoAberta(transacao, chamamentoId, sessaoId, propostaId)
      return [{ caminho, acao: 'editar', dados: { admissibilidade, concluida: false } }]
    })
    return json(200, { admissibilidade })
  },
})
