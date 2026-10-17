// /api/sessao — sessão da Comissão em chamamentos/{ch}/sessoes/{id}.
// POST abre (permissão sessaoAbrirEncerrar). PATCH com "acao": presentes, declaracoes e foco (sessaoConduzir)
// ou encerrar (sessaoAbrirEncerrar). Presentes: quem tem papel na Comissão (usuarios/{uid}.comissao). Sessão encerrada não aceita alteração (409). Tudo auditado.
// foco = { tipo: admissibilidade | subcriterio | d2 | resumo, propostaId, subcriterio? } (Etapa 5: telão).
// A avaliação (C2) só é aceita com sessaoId de sessão aberta (api/avaliacao.ts).
// PATCH "resetar" (permissão resetarSessao E papel de presidente na Comissão, justificativa) descarta o que foi
// gravado na sessão; GET ?simular=true mostra a prévia (o que será revertido/apagado e os bloqueios). Ver
// _lib/resetSessao.ts.

import { FieldValue, type Transaction } from 'firebase-admin/firestore'
import { planoDoSubcriterio } from '../src/domain/avaliacao.js'
import { ehPapelComissao } from '../src/domain/comissao.js'
import { podeFazer } from '../src/domain/permissoes.js'
import { esquemaAbrirSessao, esquemaAlterarSessao, esquemaPreviaReset, type Declaracao } from '../src/esquemas/sessao.js'
import { obterAdmin } from './_lib/admin.js'
import { ErroApi, MENSAGENS } from './_lib/erros.js'
import { gravar, type Autor } from './_lib/gravar.js'
import { criarRota, json } from './_lib/http.js'
import { autenticar } from './_lib/porteiro.js'
import { executarReset, previaReset } from './_lib/resetSessao.js'
import { exigirSemProblemas, lerConsulta, lerCorpo } from './_lib/validacao.js'

interface Presente {
  uid: string
  email: string | null
  /** Papel na Comissão (presidente, relator ou membro). */
  perfil: string
}

const db = () => obterAdmin().db

/** Lê usuarios/{uid}; o e-mail identifica a pessoa nas mensagens de erro. */
async function lerUsuarios(transacao: Transaction, uids: string[]) {
  const documentos = await Promise.all(uids.map((uid) => transacao.get(db().doc(`usuarios/${uid}`))))
  return documentos.map((d, i) => ({
    uid: uids[i]!,
    email: (d.get('email') as string | undefined) ?? null,
    comissao: d.get('comissao') as unknown,
  }))
}

/** Presentes precisam ter papel na Comissão (presidente, relator ou membro), gravado na sessão e na ata. */
async function membrosDaComissao(transacao: Transaction, uids: string[]): Promise<Presente[]> {
  const usuarios = await lerUsuarios(transacao, uids)
  const fora = usuarios.find((u) => !ehPapelComissao(u.comissao))
  if (fora) exigirSemProblemas({ presentes: `Não é membro da Comissão: ${fora.email ?? fora.uid}.` })
  return usuarios.map((u) => ({ uid: u.uid, email: u.email, perfil: u.comissao as string }))
}

/** Só quem está presente declara; o motivo só é gravado quando há impedimento. */
async function conferirDeclaracoes(
  transacao: Transaction,
  declaracoes: Declaracao[],
  presentes: Presente[],
): Promise<Declaracao[]> {
  const uids = new Set(presentes.map((p) => p.uid))
  const ausente = declaracoes.find((d) => !uids.has(d.uid))
  if (ausente) {
    const [usuario] = await lerUsuarios(transacao, [ausente.uid])
    exigirSemProblemas({ declaracoes: `Declaração de quem não está presente: ${usuario!.email ?? ausente.uid}.` })
  }
  return declaracoes.map(({ uid, semImpedimento, motivo }) =>
    semImpedimento || !motivo ? { uid, semImpedimento } : { uid, semImpedimento, motivo },
  )
}

const assinatura = (autor: Autor) => ({ uid: autor.uid, email: autor.email })

/** Reset: além da permissão resetarSessao, só quem é o presidente da Comissão (usuarios/{uid}.comissao). */
async function exigirPresidente(requisicao: Request): Promise<Autor> {
  const autor = await autenticar(requisicao, 'resetarSessao')
  const cadastro = await db().doc(`usuarios/${autor.uid}`).get()
  if (cadastro.get('comissao') !== 'presidente') {
    throw new ErroApi(403, 'Só o presidente da Comissão pode resetar a sessão.')
  }
  return autor
}

/** A ação vem no corpo; lida antes para escolher a exigência (401/403 antes do 400, como nas demais). */
async function acaoDoCorpo(requisicao: Request): Promise<unknown> {
  const corpo = (await requisicao.clone().json().catch(() => null)) as { acao?: unknown } | null
  return corpo?.acao
}

export const { GET, POST, PUT, PATCH, DELETE } = criarRota({
  GET: async (requisicao) => {
    await exigirPresidente(requisicao)
    const { chamamentoId, sessaoId } = lerConsulta(requisicao, esquemaPreviaReset)
    return json(200, await previaReset(chamamentoId, sessaoId))
  },

  POST: async (requisicao) => {
    const autor = await autenticar(requisicao, 'sessaoAbrirEncerrar')
    const { chamamentoId, data, pauta, presentes, declaracoes } = await lerCorpo(requisicao, esquemaAbrirSessao)
    const sessoes = db().collection(`chamamentos/${chamamentoId}/sessoes`)
    const id = sessoes.doc().id

    await gravar(autor, async (transacao) => {
      if (!(await transacao.get(db().doc(`chamamentos/${chamamentoId}`))).exists) {
        throw new ErroApi(404, MENSAGENS.chamamentoNaoEncontrado)
      }
      const propostas = await Promise.all(
        pauta.map((p) => transacao.get(db().doc(`chamamentos/${chamamentoId}/propostas/${p}`))),
      )
      const inexistente = pauta.find((_, i) => !propostas[i]!.exists)
      if (inexistente) exigirSemProblemas({ pauta: `Proposta não encontrada: ${inexistente}.` })

      const abertas = await transacao.get(sessoes.where('status', '==', 'aberta').limit(1))
      if (!abertas.empty) {
        throw new ErroApi(409, 'Já existe sessão aberta neste chamamento: encerre-a antes de abrir outra.')
      }

      const membros = await membrosDaComissao(transacao, presentes)
      return [
        {
          caminho: `chamamentos/${chamamentoId}/sessoes/${id}`,
          acao: 'criar',
          dados: {
            data,
            pauta,
            status: 'aberta',
            presentes: membros,
            declaracoes: await conferirDeclaracoes(transacao, declaracoes, membros),
            foco: null,
            abertaPor: assinatura(autor),
            abertaEm: FieldValue.serverTimestamp(),
          },
        },
      ]
    })
    return json(201, { id, chamamentoId })
  },

  PATCH: async (requisicao) => {
    if ((await acaoDoCorpo(requisicao)) === 'resetar') {
      const autor = await exigirPresidente(requisicao)
      const alteracao = await lerCorpo(requisicao, esquemaAlterarSessao)
      if (alteracao.acao !== 'resetar') throw new ErroApi(400, MENSAGENS.dadosInvalidos)
      const resultado = await executarReset(autor, alteracao.chamamentoId, alteracao.sessaoId, alteracao.justificativa)
      return json(200, { id: alteracao.sessaoId, chamamentoId: alteracao.chamamentoId, ...resultado })
    }
    const autor = await autenticar(requisicao, 'sessaoConduzir')
    const alteracao = await lerCorpo(requisicao, esquemaAlterarSessao)
    if (alteracao.acao === 'resetar') throw new ErroApi(400, MENSAGENS.dadosInvalidos)
    if (alteracao.acao === 'encerrar' && !podeFazer(autor.acesso, 'sessaoAbrirEncerrar')) {
      throw new ErroApi(403, MENSAGENS.semPermissao)
    }
    const caminho = `chamamentos/${alteracao.chamamentoId}/sessoes/${alteracao.sessaoId}`

    await gravar(autor, async (transacao) => {
      const sessao = await transacao.get(db().doc(caminho))
      if (!sessao.exists) throw new ErroApi(404, MENSAGENS.sessaoNaoEncontrada)
      if (sessao.get('status') !== 'aberta') throw new ErroApi(409, MENSAGENS.sessaoEncerrada)

      let dados: Record<string, unknown>
      switch (alteracao.acao) {
        case 'encerrar':
          dados = {
            status: 'encerrada',
            foco: null,
            encerradaPor: assinatura(autor),
            encerradaEm: FieldValue.serverTimestamp(),
          }
          break
        case 'presentes': {
          const membros = await membrosDaComissao(transacao, alteracao.presentes)
          const uids = new Set(alteracao.presentes)
          // Quem deixa de estar presente perde a declaração.
          const declaracoes = ((sessao.get('declaracoes') ?? []) as Declaracao[]).filter((d) => uids.has(d.uid))
          dados = { presentes: membros, declaracoes }
          break
        }
        case 'declaracoes': {
          const presentes = (sessao.get('presentes') ?? []) as Presente[]
          dados = { declaracoes: await conferirDeclaracoes(transacao, alteracao.declaracoes, presentes) }
          break
        }
        case 'foco': {
          const { foco } = alteracao
          if (foco) {
            const problemas: Record<string, string> = {}
            if (!((sessao.get('pauta') ?? []) as string[]).includes(foco.propostaId)) {
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
})
