import { describe, expect, it } from 'vitest'
import type { Acesso } from '../../domain/permissoes'
import { gruposDeNavegacao, type ContextoNavegacao } from './navegacao'

const ADMIN: Acesso = { admin: true, ativo: true, permissoes: [] }
const comum = (permissoes: Acesso['permissoes']): Acesso => ({ admin: false, ativo: true, permissoes })
const CONTEXTO: ContextoNavegacao = {
  chamamento: { id: 'ch1', numero: '001/2026', lotes: ['L1', 'L2'] },
  sessaoAberta: 's9',
}

const mapa = (acesso: Acesso | null, contexto: ContextoNavegacao = {}) =>
  gruposDeNavegacao(acesso, contexto).map((g) => [g.rotulo, g.itens.map((i) => `${i.rotulo} → ${i.caminho}`)])

describe('navegação por domínio (§12: agrupar por domínio; itens conforme o acesso)', () => {
  it('fora de um chamamento: início, cadastros e administração (administrador)', () => {
    expect(mapa(ADMIN)).toEqual([
      ['Início', ['Chamamentos → /']],
      ['Cadastros', ['Novo chamamento → /chamamentos/novo', 'OSCs → /oscs']],
      ['Administração', ['Usuários → /usuarios', 'Histórico de alterações → /auditoria', 'Catálogo de componentes → /ui']],
    ])
  })

  it('dentro de um chamamento: Sessão, Avaliação e Resultado aparecem, na ordem do domínio', () => {
    expect(mapa(ADMIN, CONTEXTO).map(([g]) => g)).toEqual(['Início', 'Sessão', 'Avaliação', 'Resultado', 'Cadastros', 'Administração'])
    expect(mapa(ADMIN, CONTEXTO)).toContainEqual(['Sessão', ['Sessão em andamento → /chamamentos/ch1/sessoes/s9']])
    expect(mapa(ADMIN, CONTEXTO)).toContainEqual(['Avaliação', ['Propostas do chamamento → /chamamentos/ch1']])
    expect(mapa(ADMIN, CONTEXTO)).toContainEqual([
      'Resultado',
      ['Classificação — Lote L1 → /chamamentos/ch1/lotes/L1/classificacao', 'Classificação — Lote L2 → /chamamentos/ch1/lotes/L2/classificacao'],
    ])
    expect(mapa(ADMIN, CONTEXTO)).toContainEqual([
      'Cadastros',
      ['Dados do chamamento → /chamamentos/ch1/editar', 'Nova proposta → /chamamentos/ch1/propostas/nova', 'Novo chamamento → /chamamentos/novo', 'OSCs → /oscs'],
    ])
  })

  it('sem sessão aberta: "Abrir sessão" só para quem tem a permissão', () => {
    const contexto = { ...CONTEXTO, sessaoAberta: null }
    expect(mapa(ADMIN, contexto)).toContainEqual(['Sessão', ['Abrir sessão → /chamamentos/ch1/sessoes/nova']])
    expect(mapa(comum(['consultar']), contexto).map(([g]) => g)).not.toContain('Sessão')
  })

  it('só consulta: lê tudo, sem cadastros nem administração', () => {
    expect(mapa(comum(['consultar']), CONTEXTO).map(([g]) => g)).toEqual(['Início', 'Sessão', 'Avaliação', 'Resultado'])
  })

  it('permissão OSCs: só OSCs em Cadastros', () => {
    expect(mapa(comum(['oscs']))).toEqual([
      ['Início', ['Chamamentos → /']],
      ['Cadastros', ['OSCs → /oscs']],
    ])
  })

  it('sem acesso: nenhum item', () => {
    expect(gruposDeNavegacao(null, CONTEXTO)).toEqual([])
    expect(gruposDeNavegacao(comum([]), CONTEXTO)).toEqual([])
  })

  it('cada item tem ícone e lote com caractere especial é codificado na rota', () => {
    const grupos = gruposDeNavegacao(ADMIN, { chamamento: { id: 'ch1', numero: '1', lotes: ['L 1/A'] }, sessaoAberta: null })
    expect(grupos.flatMap((g) => g.itens).every((i) => typeof i.icone === 'object' || typeof i.icone === 'function')).toBe(true)
    expect(grupos.find((g) => g.rotulo === 'Resultado')!.itens[0]!.caminho).toBe('/chamamentos/ch1/lotes/L%201%2FA/classificacao')
  })
})
