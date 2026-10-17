// Autoria das gravações feitas pelos scripts administrativos. Sem auditoria detalhada (Simplificação 2/4):
// como na /api, cada documento guarda só quem gravou por último (atualizadoPor) e quando (atualizadoEm).

import { FieldValue } from 'firebase-admin/firestore'

export function autoriaDeScript(origem: string, executor: string) {
  const script = origem.replace(/^.*\//, '').replace(/\.ts$/, '')
  return {
    atualizadoPor: { nome: `Script ${script} (${executor})`, email: null },
    atualizadoEm: FieldValue.serverTimestamp(),
  }
}
