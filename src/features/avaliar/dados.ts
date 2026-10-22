// Dados da tela de avaliação (/avaliar/:propostaId?ch=), em tempo real: chamamento, proposta, OSC, sessão aberta,
// avaliações da D1, experiências da D2, memória da D2, a pauta (propostas dos lotes da sessão aberta), para
// "Proposta anterior / próxima", e as propostas da mesma OSC, para "Replicar para outro lote".

import { collection, query, where } from 'firebase/firestore'
import type { ResultadoD2 } from '../../domain/d2'
import { useColecao, useConsulta, useDocumento, type ComId, type Leitura } from '../../lib/firestore'
import type { Avaliacao, Chamamento, ExperienciaGravada, Osc, Proposta, Sessao } from '../../lib/tipos'
import { ordenarPauta } from './pauta'

export interface DadosProposta {
  chamamento: ComId<Chamamento>
  proposta: ComId<Proposta>
  osc: ComId<Osc> | null
  sessaoAberta: ComId<Sessao> | null
}

export interface DadosAvaliacao extends DadosProposta {
  avaliacoes: ComId<Avaliacao>[]
  experiencias: ExperienciaGravada[]
  resultadoD2: ResultadoD2 | null
  /** Ids das propostas da pauta da sessão aberta, na ordem da sessão. */
  pauta: string[]
  /** Propostas do chamamento da mesma OSC (inclusive esta), para "Replicar para outro lote" na D2. */
  propostasDaOsc: ComId<Proposta>[]
}

/** Chamamento, proposta, OSC e a sessão aberta do chamamento, em tempo real. */
export function useDadosProposta(ch: string, p: string): Leitura<DadosProposta | null> {
  const chamamento = useDocumento<Chamamento>(ch ? `chamamentos/${ch}` : null)
  const proposta = useDocumento<Proposta>(ch && p ? `chamamentos/${ch}/propostas/${p}` : null)
  const osc = useDocumento<Osc>(proposta.dados ? `oscs/${proposta.dados.oscCnpj}` : null)
  const abertas = useConsulta<Sessao>(ch ? `sessoes-abertas-${ch}` : null, (db) =>
    query(collection(db, `chamamentos/${ch}/sessoes`), where('status', '==', 'aberta')),
  )
  const carregando = chamamento.carregando || proposta.carregando || abertas.carregando || (proposta.dados !== null && osc.carregando)
  const erro = chamamento.erro ?? proposta.erro ?? osc.erro ?? abertas.erro
  const dados =
    chamamento.dados && proposta.dados
      ? { chamamento: chamamento.dados, proposta: proposta.dados, osc: osc.dados, sessaoAberta: abertas.dados[0] ?? null }
      : null
  return { carregando, erro, dados }
}

export function useDadosAvaliacao(ch: string, p: string): Leitura<DadosAvaliacao | null> {
  const base = useDadosProposta(ch, p)
  const caminho = ch && p ? `chamamentos/${ch}/propostas/${p}` : null
  const avaliacoes = useColecao<Avaliacao>(caminho && `${caminho}/avaliacoes`)
  const experiencias = useColecao<Omit<ExperienciaGravada, 'id'>>(caminho && `${caminho}/experiencias`)
  const resultadoD2 = useDocumento<ResultadoD2>(caminho && `${caminho}/resultadoD2/atual`)
  const propostas = useColecao<Proposta>(ch ? `chamamentos/${ch}/propostas` : null)
  const oscs = useColecao<Osc>('oscs')

  const leituras = [base, avaliacoes, experiencias, resultadoD2, propostas, oscs]
  const carregando = leituras.some((l) => l.carregando)
  const erro = leituras.map((l) => l.erro).find(Boolean) ?? null
  if (!base.dados) return { carregando, erro, dados: null }
  const nomes = new Map(oscs.dados.map((o) => [o.cnpj, o.razaoSocial]))
  return {
    carregando,
    erro,
    dados: {
      ...base.dados,
      avaliacoes: avaliacoes.dados,
      experiencias: [...experiencias.dados].sort((a, b) => a.inicio.localeCompare(b.inicio) || a.id.localeCompare(b.id)),
      resultadoD2: resultadoD2.dados,
      pauta: base.dados.sessaoAberta ? ordenarPauta(propostas.dados, base.dados.sessaoAberta.lotes ?? [], nomes) : [],
      propostasDaOsc: propostas.dados.filter((outra) => outra.oscCnpj === base.dados!.proposta.oscCnpj),
    },
  }
}

/**
 * A Comissão só registra em sessão aberta, com a proposta na pauta (a /api exige o sessaoId): por que a tela
 * não pode registrar `oQue` (ex.: "a admissibilidade"), ou null.
 */
export function motivoSemSessao(dados: DadosProposta, oQue: string): string | null {
  if (!dados.sessaoAberta) return `Nenhuma sessão aberta: o presidente precisa abrir a sessão para registrar ${oQue}.`
  if (!(dados.sessaoAberta.lotes ?? []).includes(dados.proposta.loteCodigo)) return 'Proposta fora da pauta da sessão aberta.'
  return null
}

/** D1 e D2: além da sessão, a proposta precisa ter sido admitida (não admitida não segue para avaliação). */
export function motivoSemAvaliacao(dados: DadosProposta, oQue: string): string | null {
  const admissao = dados.proposta.admissibilidade?.situacao
  if (admissao === 'nao_admitida' || admissao === 'desclassificada') {
    return 'Proposta não admitida (Anexo III, item 28): não segue para avaliação.'
  }
  return motivoSemSessao(dados, oQue)
}
