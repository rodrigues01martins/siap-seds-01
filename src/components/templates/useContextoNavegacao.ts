// Contexto da navegação lateral: o chamamento da rota atual (/chamamentos/:ch/...) com seus lotes e a sessão
// aberta, lidos em tempo real. Fora de um chamamento (ou sem acesso), contexto vazio.

import { collection, query, where } from 'firebase/firestore'
import { useMatch } from 'react-router'
import { useConsulta, useDocumento } from '../../lib/firestore'
import type { Chamamento, Sessao } from '../../lib/tipos'
import type { ContextoNavegacao } from './navegacao'

export function useContextoNavegacao(): ContextoNavegacao {
  const rota = useMatch('/chamamentos/:ch/*')
  const ch = rota?.params.ch && rota.params.ch !== 'novo' ? rota.params.ch : null
  const chamamento = useDocumento<Chamamento>(ch ? `chamamentos/${ch}` : null)
  const sessoes = useConsulta<Sessao>(ch ? `nav-sessao-aberta|${ch}` : null, (db) =>
    query(collection(db, `chamamentos/${ch}/sessoes`), where('status', '==', 'aberta')),
  )
  if (!ch || !chamamento.dados) return {}
  return {
    chamamento: { id: ch, numero: chamamento.dados.numero, lotes: (chamamento.dados.lotes ?? []).map((l) => l.codigo) },
    sessaoAberta: sessoes.dados[0]?.id ?? null,
  }
}
