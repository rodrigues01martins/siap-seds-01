// Perfis de acesso usados nos testes de navegador e as rotas do app (com a exigência de cada uma).
import { CHAMAMENTO_ENSAIO } from '../../scripts/lib/ensaio'

export const SENHA_E2E = 'senha-e2e-123'
export const SESSAO_ABERTA = 'e2e-sessao-aberta'
/** Chamamento só do teste de fluxo completo (sem sessão aberta, proposta ainda não avaliada). */
export const CHAMAMENTO_FLUXO = 'e2e-fluxo'
export const PROPOSTA_FLUXO = 'e2e-fluxo-p1'

export interface PerfilE2E {
  id: string
  nome: string
  email: string
  admin: boolean
  permissoes: string[]
  comissao: 'presidente' | 'relator' | 'membro' | null
  uid?: string
}

export const PERFIS_E2E: PerfilE2E[] = [
  { id: 'administrador', nome: 'Administração E2E', email: 'admin@e2e.go.gov.br', admin: true, permissoes: [], comissao: 'presidente' },
  {
    id: 'avaliador',
    nome: 'Avaliação E2E',
    email: 'avaliador@e2e.go.gov.br',
    admin: false,
    permissoes: ['consultar', 'nivelD1', 'admissibilidade', 'experienciasD2', 'diligencias', 'sessaoConduzir'],
    comissao: 'relator',
  },
  { id: 'consulta', nome: 'Consulta E2E', email: 'consulta@e2e.go.gov.br', admin: false, permissoes: ['consultar'], comissao: null },
]

/** Primeira proposta avaliada do ensaio (a mais completa: apta). */
export const propostaE2E = (propostas: { id: string; esperado: string }[]) => propostas.find((p) => p.esperado === 'apta')!.id

export interface RotaE2E {
  slug: string
  caminho: string
  /** Permissão exigida (null = qualquer usuário com acesso). */
  exige: string | null
}

export function rotasE2E(proposta: string): RotaE2E[] {
  const ch = `/chamamentos/${CHAMAMENTO_ENSAIO}`
  const p = `${ch}/propostas/${proposta}`
  return [
    { slug: 'inicio', caminho: '/', exige: null },
    { slug: 'painel-chamamento', caminho: ch, exige: null },
    { slug: 'chamamento-novo', caminho: '/chamamentos/novo', exige: 'chamamentos' },
    { slug: 'chamamento-editar', caminho: `${ch}/editar`, exige: 'chamamentos' },
    { slug: 'proposta-nova', caminho: `${ch}/propostas/nova`, exige: 'propostas' },
    { slug: 'proposta-editar', caminho: `${p}/editar`, exige: 'propostas' },
    { slug: 'sessao-nova', caminho: `${ch}/sessoes/nova`, exige: 'sessaoAbrirEncerrar' },
    { slug: 'sessao', caminho: `${ch}/sessoes/${SESSAO_ABERTA}`, exige: null },
    { slug: 'ata', caminho: `${ch}/sessoes/${SESSAO_ABERTA}/ata`, exige: null },
    { slug: 'admissibilidade', caminho: `${p}/admissibilidade`, exige: null },
    { slug: 'd1', caminho: `${p}/d1`, exige: null },
    { slug: 'd2', caminho: `${p}/d2`, exige: null },
    { slug: 'd2-memoria', caminho: `${p}/d2/memoria`, exige: null },
    { slug: 'diligencias', caminho: `${p}/diligencias`, exige: null },
    { slug: 'classificacao', caminho: `${ch}/lotes/L1/classificacao`, exige: null },
    { slug: 'oscs', caminho: '/oscs', exige: 'oscs' },
    { slug: 'usuarios', caminho: '/usuarios', exige: 'admin' },
    { slug: 'auditoria', caminho: '/auditoria', exige: 'admin' },
    { slug: 'projecao', caminho: `/projecao/${CHAMAMENTO_ENSAIO}/${SESSAO_ABERTA}`, exige: null },
  ]
}
