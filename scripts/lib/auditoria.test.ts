import { FieldValue } from 'firebase-admin/firestore'
import { describe, expect, it } from 'vitest'
import { registroDeScript } from './auditoria'

describe('registro de auditoria dos scripts administrativos', () => {
  it('tem os campos que a trilha (/auditoria) lê e mantém os campos antigos', () => {
    const r = registroDeScript({
      acao: 'backup.restaurado',
      caminho: 'chamamentos/ch1',
      detalhes: { arquivo: 'backup.json' },
      origem: 'scripts/restaurar-firestore.ts',
      executor: 'local:juliano',
    })
    expect(r).toMatchObject({
      caminho: 'chamamentos/ch1',
      acao: 'backup.restaurado',
      antes: null,
      depois: { arquivo: 'backup.json' },
      uid: 'local:juliano',
      email: null,
      perfil: 'script',
      // campos usados antes da Etapa 7
      alvo: 'chamamentos/ch1',
      detalhes: { arquivo: 'backup.json' },
      origem: 'scripts/restaurar-firestore.ts',
      executor: 'local:juliano',
    })
    expect(r.dataHora).toEqual(FieldValue.serverTimestamp())
    expect(r.em).toEqual(FieldValue.serverTimestamp())
  })
})
