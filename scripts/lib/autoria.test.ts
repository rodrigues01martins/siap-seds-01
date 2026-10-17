import { FieldValue } from 'firebase-admin/firestore'
import { describe, expect, it } from 'vitest'
import { autoriaDeScript } from './autoria'

describe('autoria dos scripts administrativos (sem auditoria detalhada)', () => {
  it('atualizadoPor com o script e quem o executou; atualizadoEm do servidor', () => {
    const r = autoriaDeScript('scripts/tornar-admin.ts', 'local:juliano')
    expect(r).toEqual({
      atualizadoPor: { nome: 'Script tornar-admin (local:juliano)', email: null },
      atualizadoEm: FieldValue.serverTimestamp(),
    })
  })
})
