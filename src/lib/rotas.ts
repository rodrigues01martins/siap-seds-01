// Endereços da jornada de avaliação (Simplificação 3/4). O chamamento vai na consulta (?ch=): os documentos ficam
// em chamamentos/{ch}/..., e o Firestore só lê pelo caminho completo.

export type AbaAvaliacao = 'admissao' | 'd1' | 'd2' | 'resultado'

export function rotaAvaliar(ch: string, propostaId: string, aba?: AbaAvaliacao): string {
  const consulta = new URLSearchParams({ ch, ...(aba ? { aba } : {}) })
  return `/avaliar/${propostaId}?${consulta.toString()}`
}

export function rotaSessao(ch: string, sessaoId: string): string {
  return `/sessao/${sessaoId}?${new URLSearchParams({ ch }).toString()}`
}
