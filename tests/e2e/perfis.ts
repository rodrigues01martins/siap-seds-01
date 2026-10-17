// Perfis usados nos testes de navegador (admin, presidente e um cadastro antigo) e as rotas do app.
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
  /** admin ou presidente; null = cadastro do modelo anterior (relator, membro, controle), sem acesso. */
  perfil: 'admin' | 'presidente' | null
  uid?: string
}

/** Os dois perfis do app e um cadastro do modelo anterior (vê "Seu acesso precisa ser atualizado"). */
export const PERFIS_E2E: PerfilE2E[] = [
  { id: 'administrador', nome: 'Administração E2E', email: 'admin@e2e.go.gov.br', perfil: 'admin' },
  { id: 'presidente', nome: 'Presidência E2E', email: 'presidente@e2e.go.gov.br', perfil: 'presidente' },
  { id: 'antigo', nome: 'Cadastro antigo E2E', email: 'antigo@e2e.go.gov.br', perfil: null },
]

/** Presentes das sessões semeadas: só nomes e papéis (sem login). */
export const PRESENTES_E2E = [
  { nome: 'Presidência E2E', papel: 'presidente' },
  { nome: 'Membro E2E A', papel: 'membro' },
  { nome: 'Membro E2E B', papel: 'membro' },
]

/** Chamamentos dos testes de uso: um por fluxo, para os fluxos não interferirem entre si. */
export const CHAMAMENTOS_USO = { avaliacao: 'uso-avaliacao', presidente: 'uso-presidente', telao: 'uso-telao' } as const
export const PROPOSTA_USO = 'uso-p1'
/** Exclusão de cadastros (exclusao.spec.ts): chamamento vazio e proposta com subcoleções, só para apagar. */
export const CHAMAMENTO_EXCLUIR = 'e2e-excluir'
export const CHAMAMENTO_EXCLUIR_PROPOSTA = 'e2e-excluir-prop'
export const PROPOSTA_EXCLUIR = 'e2e-excluir-p1'
/** Exclusão da sessão (exclusao.spec.ts) e acessibilidade: proposta sem admissibilidade nem níveis, numa sessão aberta. */
export const CHAMAMENTO_PAUTA = 'e2e-pauta'
export const PROPOSTA_PAUTA = 'e2e-pauta-p1'
export const SESSAO_PAUTA = 'e2e-pauta-sessao'

/** Primeira proposta avaliada do ensaio (a mais completa: apta). */
export const propostaE2E = (propostas: { id: string; esperado: string }[]) => propostas.find((p) => p.esperado === 'apta')!.id

export interface RotaE2E {
  slug: string
  caminho: string
  /** 'admin' = só o administrador (gestão de usuários); null = admin e presidente. */
  exige: 'admin' | null
}

export function rotasE2E(proposta: string): RotaE2E[] {
  const ch = `/chamamentos/${CHAMAMENTO_ENSAIO}`
  const p = `${ch}/propostas/${proposta}`
  const avaliar = `/avaliar/${proposta}?ch=${CHAMAMENTO_ENSAIO}`
  return [
    { slug: 'inicio', caminho: '/', exige: null },
    { slug: 'painel-chamamento', caminho: ch, exige: null },
    { slug: 'chamamento-novo', caminho: '/chamamentos/novo', exige: null },
    { slug: 'chamamento-editar', caminho: `${ch}/editar`, exige: null },
    { slug: 'proposta-nova', caminho: `${ch}/propostas/nova`, exige: null },
    { slug: 'proposta-editar', caminho: `${p}/editar`, exige: null },
    { slug: 'sessao-nova', caminho: `${ch}/sessoes/nova`, exige: null },
    { slug: 'sessao', caminho: `/sessao/${SESSAO_ABERTA}?ch=${CHAMAMENTO_ENSAIO}`, exige: null },
    { slug: 'ata', caminho: `${ch}/sessoes/${SESSAO_ABERTA}/ata`, exige: null },
    // Simplificação 3/4: a proposta inteira em /avaliar, uma aba por etapa.
    { slug: 'admissibilidade', caminho: `${avaliar}&aba=admissao`, exige: null },
    { slug: 'd1', caminho: `${avaliar}&aba=d1`, exige: null },
    { slug: 'd2', caminho: `${avaliar}&aba=d2`, exige: null },
    { slug: 'resultado', caminho: `${avaliar}&aba=resultado`, exige: null },
    { slug: 'classificacao', caminho: `${ch}/lotes/L1/classificacao`, exige: null },
    { slug: 'oscs', caminho: '/oscs', exige: null },
    { slug: 'usuarios', caminho: '/usuarios', exige: 'admin' },
    { slug: 'projecao', caminho: `/projecao/${CHAMAMENTO_ENSAIO}/${SESSAO_ABERTA}`, exige: null },
  ]
}
