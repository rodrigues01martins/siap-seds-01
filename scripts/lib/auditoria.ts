// Registro de auditoria dos scripts administrativos (matriz, perfis, restauração, ensaio).
// Tem os campos que a trilha /auditoria lê (caminho, acao, antes, depois, uid, perfil, dataHora) e
// mantém os campos usados antes da Etapa 7 (alvo, detalhes, origem, executor, em).

import { FieldValue } from 'firebase-admin/firestore'

export function registroDeScript({
  acao,
  caminho,
  detalhes,
  origem,
  executor,
  antes = null,
}: {
  acao: string
  caminho: string
  detalhes: Record<string, unknown>
  origem: string
  executor: string
  antes?: Record<string, unknown> | null
}) {
  const agora = FieldValue.serverTimestamp()
  return {
    caminho,
    acao,
    antes,
    depois: detalhes,
    uid: executor,
    email: null,
    perfil: 'script',
    dataHora: agora,
    alvo: caminho,
    detalhes,
    origem,
    executor,
    em: agora,
  }
}
