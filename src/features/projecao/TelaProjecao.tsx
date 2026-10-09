// /projecao/:ch/:sessaoId — telão da sala: só leitura, tela cheia, fonte grande e alto contraste,
// sem menu e sem nenhum controle de escrita. Acompanha em tempo real (onSnapshot) o foco da sessão,
// a proposta em foco (totais, admissibilidade) e o documento do item projetado.
// Qualquer perfil com leitura abre; o telão usa um login próprio com perfil membro (README).

import { useState } from 'react'
import { useParams } from 'react-router'
import { formatarCnpj } from '../../domain/cnpj'
import type { ResultadoD2 } from '../../domain/d2'
import { PERFIS, type Perfil } from '../../domain/perfis'
import type { TotaisProposta } from '../../domain/proposta'
import { statusDaProposta } from '../../domain/statusProposta'
import type { Admissibilidade } from '../../domain/admissibilidade'
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

/** Todos os perfis leem a projeção (o telão usa um usuário com perfil membro). */
export const PERFIS_PROJECAO: readonly Perfil[] = PERFIS

type ComCarimbo = { atualizadoEm?: { toDate(): Date } }

function dataBr(iso: string): string {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

/** Horário da gravação mais recente entre os documentos exibidos (carimbo do servidor). */
function ultimaAtualizacao(documentos: (ComCarimbo | null | undefined)[], reserva: Date): string {
  const datas = documentos.map((d) => d?.atualizadoEm?.toDate?.()).filter((d): d is Date => d instanceof Date)
  const maior = datas.length ? new Date(Math.max(...datas.map((d) => d.getTime()))) : reserva
  return maior.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function BotaoTelaCheia() {
  return (
    <button
      type="button"
      onClick={() => {
        if (document.fullscreenElement) void document.exitFullscreen?.()
        else void document.documentElement.requestFullscreen?.()
      }}
      className="rounded-md border-2 border-slate-500 px-3 py-1 text-lg text-slate-200 hover:bg-slate-800"
    >
      Tela cheia
    </button>
  )
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

  let conteudo: React.ReactNode
  if (erro) conteudo = <p className="text-3xl text-red-300">{erro}</p>
  else if (sessao.carregando || chamamento.carregando) conteudo = <p className="text-3xl">Carregando…</p>
  else if (!sessao.dados) conteudo = <p className="text-3xl">Sessão não encontrada.</p>
  else if (!foco || !proposta.dados) conteudo = <TelaEspera chamamento={chamamento.dados} />
  else if (tipo === 'admissibilidade') conteudo = <ProjecaoAdmissibilidade admissibilidade={proposta.dados.admissibilidade ?? null} />
  else if (tipo === 'subcriterio') conteudo = <ProjecaoSubcriterio codigo={foco.subcriterio ?? ''} registro={avaliacao.dados} />
  else if (tipo === 'd2') conteudo = <ProjecaoD2 resultado={resultadoD2.dados} nomes={nomes} />
  else conteudo = <ProjecaoResumo totais={proposta.dados.totais ?? null} status={statusDaProposta(proposta.dados)} />

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-slate-700 px-10 py-5">
        <div>
          {proposta.dados ? (
            <>
              <p className="text-4xl font-bold">
                {osc.dados?.razaoSocial ?? 'OSC'}{' '}
                <span className="text-2xl font-normal text-slate-400">{formatarCnpj(proposta.dados.oscCnpj)}</span>
              </p>
              <p className="text-2xl text-slate-300">
                Lote {proposta.dados.loteCodigo}
                {lote ? ` — ${lote.descricao}` : ''} · Caderno SEI {proposta.dados.numeroSEI ?? '—'}
              </p>
            </>
          ) : (
            <p className="text-3xl font-bold">{chamamento.dados ? `Chamamento ${chamamento.dados.numero}` : 'Comissão de Seleção'}</p>
          )}
        </div>
        <div className="flex items-start gap-6 text-right text-xl text-slate-300">
          <div>
            <p>{sessao.dados ? `Sessão de ${dataBr(sessao.dados.data)}` : 'Sessão'}</p>
            <p>Atualizado às {ultimaAtualizacao([sessao.dados, proposta.dados, avaliacao.dados, resultadoD2.dados], abertaEm)}</p>
          </div>
          <BotaoTelaCheia />
        </div>
      </header>
      <main className="px-10 py-8 text-2xl">{conteudo}</main>
    </div>
  )
}
