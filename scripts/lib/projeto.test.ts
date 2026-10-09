import { describe, expect, it } from 'vitest'
import { conferirCredencial, identificarExecutor, lerCredencial, resolverProjeto } from './projeto'

const FIREBASERC = { projects: { default: 'siap-dev', dev: 'siap-dev', prod: 'siap-prod' } }

const credencial = (dados: Record<string, unknown> = {}) =>
  JSON.stringify({
    type: 'service_account',
    project_id: 'siap-dev',
    client_email: 'seed@siap-dev.iam.gserviceaccount.com',
    private_key: '-----BEGIN PRIVATE KEY-----\nSEGREDO\n-----END PRIVATE KEY-----\n',
    ...dados,
  })

describe('resolverProjeto (--projeto dev|prod → ID pelo .firebaserc)', () => {
  it('traduz o alias para o ID do projeto', () => {
    expect(resolverProjeto('dev', FIREBASERC)).toBe('siap-dev')
    expect(resolverProjeto('prod', FIREBASERC)).toBe('siap-prod')
  })

  it('exige o argumento', () => {
    expect(() => resolverProjeto(undefined, FIREBASERC)).toThrow(/--projeto dev\|prod/)
  })

  it('aceita apenas dev ou prod', () => {
    expect(() => resolverProjeto('default', FIREBASERC)).toThrow(/dev\|prod/)
    expect(() => resolverProjeto('homolog', FIREBASERC)).toThrow(/dev\|prod/)
  })

  it('falha se o alias não estiver no .firebaserc', () => {
    expect(() => resolverProjeto('prod', { projects: { dev: 'siap-dev' } })).toThrow(/\.firebaserc.*prod/)
  })
})

describe('lerCredencial (FIREBASE_SERVICE_ACCOUNT)', () => {
  it('lê a conta de serviço em JSON', () => {
    expect(lerCredencial(credencial())).toMatchObject({
      projectId: 'siap-dev',
      clientEmail: 'seed@siap-dev.iam.gserviceaccount.com',
    })
  })

  it('exige a variável', () => {
    expect(() => lerCredencial(undefined)).toThrow(/FIREBASE_SERVICE_ACCOUNT/)
    expect(() => lerCredencial('  ')).toThrow(/FIREBASE_SERVICE_ACCOUNT/)
  })

  it('JSON inválido gera erro sem ecoar o conteúdo', () => {
    expect(() => lerCredencial('{"private_key": "SEGREDO"')).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining('SEGREDO') }),
    )
  })

  it('exige project_id, client_email e private_key', () => {
    expect(() => lerCredencial(credencial({ private_key: undefined }))).toThrow(/private_key/)
    expect(() => lerCredencial(credencial({ project_id: '' }))).toThrow(/project_id/)
  })
})

describe('conferirCredencial', () => {
  it('aceita credencial do mesmo projeto', () => {
    expect(() => conferirCredencial(lerCredencial(credencial()), 'siap-dev')).not.toThrow()
  })

  it('recusa credencial de outro projeto (evita gravar em prod com chave de dev e vice-versa)', () => {
    expect(() => conferirCredencial(lerCredencial(credencial()), 'siap-prod')).toThrow(/siap-dev.*siap-prod/)
  })
})

describe('identificarExecutor (quem rodou o script, para a auditoria)', () => {
  it('no GitHub Actions usa o usuário que disparou o workflow', () => {
    expect(identificarExecutor({ GITHUB_ACTIONS: 'true', GITHUB_ACTOR: 'rodrigues01martins' }, 'runner')).toBe(
      'github:rodrigues01martins',
    )
  })

  it('fora do Actions usa o usuário do sistema operacional', () => {
    expect(identificarExecutor({}, 'juliano.mrodrigues')).toBe('local:juliano.mrodrigues')
  })

  it('no Actions sem GITHUB_ACTOR não inventa nome', () => {
    expect(identificarExecutor({ GITHUB_ACTIONS: 'true' }, 'runner')).toBe('github:desconhecido')
  })
})
