// PUT /api/admissibilidade — admissibilidade do Caderno (Anexo III, item 28). Perfis: admin e presidente.
// Grava propostas/{p}.admissibilidade com a apuração de src/domain (páginas e página de corte por PA,
// requisitos, situação admitida | nao_admitida | desclassificada e motivos), autoria e data; auditado.
// Proposta homologada não aceita (409). Não admitida ou desclassificada não segue para C2/C3 (recalcular.ts).
// Só em sessão aberta com a proposta na pauta; o sessaoId vai para admissibilidade.sessaoId e para a auditoria.

import { FieldValue } from 'firebase-admin/firestore'
import { calcularAdmissibilidade, problemasDaAdmissibilidade } from '../src/domain/admissibilidade.js'
import { esquemaAdmissibilidade } from '../src/esquemas/admissibilidade.js'
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
    let apurada: ReturnType<typeof calcularAdmissibilidade> | undefined

    await gravar(autor, async (transacao) => {
      const proposta = await transacao.get(obterAdmin().db.doc(caminho))
      if (!proposta.exists) throw new ErroApi(404, MENSAGENS.propostaNaoEncontrada)
      if (proposta.get('bloqueada') === true) throw new ErroApi(409, MENSAGENS.homologada)
      await exigirSessaoAberta(transacao, chamamentoId, sessaoId, propostaId)
      exigirSemProblemas(problemasDaAdmissibilidade(entrada))
      apurada = calcularAdmissibilidade(entrada)
      return [
        {
          caminho,
          acao: 'editar',
          dados: {
            admissibilidade: {
              ...apurada,
              registradaPor: { uid: autor.uid, email: autor.email },
              registradaEm: FieldValue.serverTimestamp(),
              sessaoId,
            },
          },
        },
      ]
    }, { sessaoId })
    return json(200, { admissibilidade: apurada })
  },
})
