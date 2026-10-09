import { describe, expect, it } from 'vitest'
import { configuracaoAdmin } from './admin'

const CREDENCIAL = JSON.stringify({
  project_id: 'siap-seds-01',
  client_email: 'api@siap-seds-01.iam.gserviceaccount.com',
  private_key: '-----BEGIN PRIVATE KEY-----\nSEGREDO\n-----END PRIVATE KEY-----\n',
})

describe('configuracaoAdmin (B1)', () => {
  it('com os dois emuladores definidos usa o modo emulador, sem credencial', () => {
    expect(
      configuracaoAdmin({
        FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
        FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
        GCLOUD_PROJECT: 'demo-siap-seds',
      }),
    ).toEqual({ modo: 'emulador', projectId: 'demo-siap-seds' })
  })

  it('emulador sem GCLOUD_PROJECT usa o projeto demo', () => {
    expect(
      configuracaoAdmin({ FIRESTORE_EMULATOR_HOST: 'a:1', FIREBASE_AUTH_EMULATOR_HOST: 'b:2' }),
    ).toEqual({ modo: 'emulador', projectId: 'demo-siap-seds' })
  })

  it('apenas um dos emuladores definido é erro (evita misturar emulador com produção)', () => {
    expect(() => configuracaoAdmin({ FIRESTORE_EMULATOR_HOST: 'a:1' })).toThrow(/FIREBASE_AUTH_EMULATOR_HOST/)
    expect(() => configuracaoAdmin({ FIREBASE_AUTH_EMULATOR_HOST: 'b:2' })).toThrow(/FIRESTORE_EMULATOR_HOST/)
  })

  it('na Vercel recusa o modo emulador (tokens do emulador não têm assinatura)', () => {
    const emuladores = { FIRESTORE_EMULATOR_HOST: 'a:1', FIREBASE_AUTH_EMULATOR_HOST: 'b:2' }
    expect(() => configuracaoAdmin({ ...emuladores, VERCEL: '1' })).toThrow(/emuladores.*Vercel/)
    expect(() => configuracaoAdmin({ ...emuladores, VERCEL_ENV: 'production' })).toThrow(/emuladores.*Vercel/)
  })

  it('fora do emulador usa FIREBASE_SERVICE_ACCOUNT', () => {
    expect(configuracaoAdmin({ FIREBASE_SERVICE_ACCOUNT: CREDENCIAL })).toMatchObject({
      modo: 'credencial',
      projectId: 'siap-seds-01',
      credencial: { clientEmail: 'api@siap-seds-01.iam.gserviceaccount.com' },
    })
  })

  it('sem credencial: erro claro, sem ecoar segredo', () => {
    expect(() => configuracaoAdmin({})).toThrow(/FIREBASE_SERVICE_ACCOUNT/)
    expect(() => configuracaoAdmin({ FIREBASE_SERVICE_ACCOUNT: '{"private_key":"SEGREDO"' })).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining('SEGREDO') }),
    )
  })

  it('nunca lê variável com prefixo VITE_', () => {
    expect(() => configuracaoAdmin({ VITE_FIREBASE_SERVICE_ACCOUNT: CREDENCIAL })).toThrow(/FIREBASE_SERVICE_ACCOUNT/)
  })
})
