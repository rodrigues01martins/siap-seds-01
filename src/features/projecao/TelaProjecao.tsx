// /projecao/:ch/:sessaoId — telão da sala: só leitura, tema de projeção de alto contraste (fundo neutral.0,
// texto neutral.950), tipografia display, sem menu, sem sidebar e sem nenhuma ação (tela cheia: F11).
// A troca de foco entra com um fade curto (.projecao-entrada), desligado com prefers-reduced-motion. Acompanha em tempo real (onSnapshot) o foco da sessão,
// a proposta em foco (totais, admissibilidade) e o documento do item projetado.
// Qualquer usuário com acesso abre; o telão usa um login próprio só com a permissão Consulta (README).

import { useState } from 'react'
import { useParams } from 'react-router'
import { formatarCnpj } from '../../domain/cnpj'
import type { ResultadoD2 } from '../../domain/d2'
import type { TotaisProposta } from '../../domain/proposta'
import { situacaoDaProposta } from '../../domain/situacaoProposta'
import type { Admissibilidade } from '../../domain/admissibilidade'
import { dataBr } from '../../lib/datas'
import { useColecao, useDocumento } from '../../lib/firestore'
import type { Avaliacao, Chamamento, Osc, Proposta, Sessao } from '../../lib/tipos'
import {
  ProjecaoAdmissibilidade,
  ProjecaoD2,
  ProjecaoResumo,
  ProjecaoSubcriterio,
  TelaEspera,
} from './ConteudoProjecao'
import { tipoDoFoco } from './foco'

type ComCarimbo = { atualizadoEm?: { toDate(): Date } }


/** Horário da gravação mais recente entre os documentos exibidos (carimbo do servidor). */
function ultimaAtualizacao(documentos: (ComCarimbo | null | undefined)[], reserva: Date): string {
  const datas = documentos.map((d) => d?.atualizadoEm?.toDate?.()).filter((d): d is Date => d instanceof Date)
  const maior = datas.length ? new Date(Math.max(...datas.map((d) => d.getTime()))) : reserva
  return maior.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function TelaProjecao() {
  const { ch = '', sessaoId = '' } = useParams()
  const [abertaEm] = useState(() => new Date())
  const sessao = useDocumento<Sessao & ComCarimbo>(`chamamentos/${ch}/sessoes/${sessaoId}`)
  const chamamento = useDocumento<Chamamento>(`chamamentos/${ch}`)
  const foco = sessao.dados?.foco ?? null
  const tipo = foco ? tipoDoFoco(foco) : null
  const caminhoProposta = foco ? `chamamentos/${ch}/propostas/${foco.propostaId}` : null

  const proposta = useDocumento<Proposta & ComCarimbo & { admissibilidade?: Admissibilidade; totais?: TotaisProposta }>(caminhoProposta)
  const osc = useDocumento<Osc>(proposta.dados ? `oscs/${proposta.dados.oscCnpj}` : null)
  const avaliacao = useDocumento<Avaliacao & ComCarimbo>(
    tipo === 'subcriterio' && foco?.subcriterio ? `${caminhoProposta}/avaliacoes/${foco.subcriterio}` : null,
  )
  const resultadoD2 = useDocumento<ResultadoD2 & ComCarimbo>(tipo === 'd2' ? `${caminhoProposta}/resultadoD2/atual` : null)
  const experiencias = useColecao<{ descricao?: string }>(tipo === 'd2' ? `${caminhoProposta}/experiencias` : null)

  const erro = sessao.erro ?? chamamento.erro ?? proposta.erro
  const lote = chamamento.dados?.lotes.find((l) => l.codigo === proposta.dados?.loteCodigo)
  const nomes = Object.fromEntries(experiencias.dados.map((e) => [e.id, e.descricao ?? e.id]))

  const chaveFoco = foco ? `${foco.propostaId}-${tipo}-${foco.subcriterio ?? ''}` : 'espera'
  let conteudo: React.ReactNode
  if (erro) conteudo = <p className="text-display-md text-projecao-negativo">{erro}</p>
  else if (sessao.carregando || chamamento.carregando) conteudo = <p className="text-display-md">Carregando…</p>
  else if (!sessao.dados) conteudo = <p className="text-display-md">Sessão não encontrada.</p>
  else if (!foco || !proposta.dados) conteudo = <TelaEspera chamamento={chamamento.dados} />
  else if (tipo === 'admissibilidade') conteudo = <ProjecaoAdmissibilidade admissibilidade={proposta.dados.admissibilidade ?? null} />
  else if (tipo === 'subcriterio') conteudo = <ProjecaoSubcriterio codigo={foco.subcriterio ?? ''} registro={avaliacao.dados} />
  else if (tipo === 'd2') conteudo = <ProjecaoD2 resultado={resultadoD2.dados} nomes={nomes} />
  else conteudo = <ProjecaoResumo totais={proposta.dados.totais ?? null} status={situacaoDaProposta(proposta.dados)} />

  return (
    <div className="min-h-screen bg-projecao-bg text-projecao-fg">
      <header className="flex flex-wrap items-start justify-between gap-6 border-b-4 border-projecao-destaque-bg px-12 py-6">
        <div>
          {proposta.dados ? (
            <>
              <p className="text-display-lg">
                {osc.dados?.razaoSocial ?? 'OSC'}{' '}
                <span className="text-heading-1 font-normal text-projecao-fg-secundario">{formatarCnpj(proposta.dados.oscCnpj)}</span>
              </p>
              <p className="text-heading-1 font-normal text-projecao-fg-secundario">
                Lote {proposta.dados.loteCodigo}
                {lote ? ` — ${lote.descricao}` : ''} · Caderno SEI {proposta.dados.numeroSEI ?? '—'}
              </p>
            </>
          ) : (
            <p className="text-display-md">{chamamento.dados ? `Chamamento ${chamamento.dados.numero}` : 'Comissão de Seleção'}</p>
          )}
        </div>
        <div className="text-right text-heading-2 font-normal text-projecao-fg-secundario">
          <div>
            <p>{sessao.dados ? `Sessão de ${dataBr(sessao.dados.data)}` : 'Sessão'}</p>
            <p>Atualizado às {ultimaAtualizacao([sessao.dados, proposta.dados, avaliacao.dados, resultadoD2.dados], abertaEm)}</p>
          </div>
        </div>
      </header>
      <main className="px-12 py-10 text-heading-1 font-normal">
        <div key={chaveFoco} className="projecao-entrada">
          {conteudo}
        </div>
      </main>
    </div>
  )
}
