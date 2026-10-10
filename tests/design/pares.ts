// Pares de tokens usados juntos na interface (texto sobre fundo e componentes sobre fundo).
// Texto: mínimo 4,5:1 (WCAG 1.4.3). Componentes, ícones e bordas que identificam controles: 3:1 (1.4.11).

export interface Par {
  frente: string
  fundo: string
  tipo: 'texto' | 'componente'
  uso: string
}

const t = (frente: string, fundo: string, uso: string): Par => ({ frente, fundo, tipo: 'texto', uso })
const c = (frente: string, fundo: string, uso: string): Par => ({ frente, fundo, tipo: 'componente', uso })

const FUNDOS = ['sds-background-default', 'sds-background-surface']

export const PARES: Par[] = [
  ...FUNDOS.flatMap((f) => [
    t('sds-text-primary', f, 'texto principal'),
    t('sds-text-secondary', f, 'texto secundário'),
    t('sds-text-muted', f, 'texto de apoio (metadados)'),
    t('sds-text-link', f, 'link'),
    t('sds-status-success-text', f, 'texto de sucesso'),
    t('sds-status-info-text', f, 'texto informativo'),
    t('sds-status-warning-text', f, 'texto de atenção'),
    t('sds-status-error-text', f, 'texto de erro'),
    c('sds-focus-ring', f, 'anel de foco'),
    c('sds-border-input', f, 'borda de campo e de checkbox/radio'),
    c('sds-action-primary', f, 'borda do botão secundário e controles marcados'),
    c('sds-status-success', f, 'ícone de sucesso'),
    c('sds-status-warning', f, 'ícone e borda de atenção'),
    c('sds-status-error', f, 'ícone e borda de erro'),
  ]),
  // Botões
  t('sds-button-primary-fg', 'sds-button-primary-bg', 'botão primário'),
  t('sds-button-primary-fg', 'sds-button-primary-bg-hover', 'botão primário (hover)'),
  t('sds-button-primary-fg', 'sds-button-primary-bg-active', 'botão primário (pressionado)'),
  t('sds-button-secondary-fg', 'sds-button-secondary-bg', 'botão secundário'),
  t('sds-button-secondary-fg', 'sds-button-secondary-bg-hover', 'botão secundário (hover)'),
  t('sds-button-tertiary-fg', 'sds-background-surface', 'botão terciário'),
  t('sds-button-tertiary-fg', 'sds-button-tertiary-bg-hover', 'botão terciário (hover)'),
  t('sds-button-destructive-fg', 'sds-button-destructive-bg', 'botão destrutivo'),
  t('sds-button-destructive-fg', 'sds-button-destructive-bg-hover', 'botão destrutivo (hover)'),
  // Campos
  t('sds-input-fg', 'sds-input-bg', 'texto digitado'),
  t('sds-input-placeholder', 'sds-input-bg', 'placeholder'),
  t('sds-input-fg', 'sds-input-bg-readonly', 'campo somente leitura'),
  c('sds-input-border-error', 'sds-input-bg', 'borda de campo com erro'),
  c('sds-input-border-success', 'sds-input-bg', 'borda de campo válido'),
  // Sidebar
  t('sds-sidebar-fg', 'sds-sidebar-bg', 'item do menu'),
  t('sds-sidebar-fg-muted', 'sds-sidebar-bg', 'texto de apoio do menu'),
  t('sds-sidebar-fg', 'sds-sidebar-item-bg-hover', 'item do menu (hover)'),
  t('sds-sidebar-item-fg-active', 'sds-sidebar-item-bg-active', 'item do menu selecionado'),
  c('sds-sidebar-item-indicator', 'sds-sidebar-item-bg-active', 'marcador do item selecionado'),
  c('sds-focus-ring-inverse', 'sds-sidebar-bg', 'anel de foco no menu'),
  // Cards e tabelas
  t('sds-text-primary', 'sds-card-bg', 'texto no card'),
  t('sds-table-header-fg', 'sds-table-header-bg', 'cabeçalho da tabela'),
  t('sds-text-primary', 'sds-table-row-bg-hover', 'linha da tabela (hover)'),
  t('sds-text-primary', 'sds-table-row-bg-selected', 'linha da tabela selecionada'),
  t('sds-text-muted', 'sds-table-header-bg', 'texto de apoio no cabeçalho'),
  // Badges e alertas (texto e ponto sobre o fundo do badge)
  ...['success', 'info', 'warning', 'error', 'neutral'].flatMap((s) => [
    t(`sds-badge-${s}-fg`, `sds-badge-${s}-bg`, `badge ${s}`),
    c(`sds-badge-${s}-dot`, `sds-badge-${s}-bg`, `ponto do badge ${s}`),
  ]),
  ...['success', 'info', 'warning', 'error'].map((s) => t(`sds-status-${s}-text`, `sds-status-${s}-surface`, `alerta ${s}`)),
  // Destaque amarelo: sempre texto escuro (DS §8)
  t('sds-on-accent', 'sds-accent', 'texto sobre amarelo'),
  // Dados (gráficos): marcas sobre o fundo branco
  c('sds-data-1', 'sds-background-surface', 'série de dados 1'),
  c('sds-data-2', 'sds-background-surface', 'série de dados 2'),
  c('sds-data-3', 'sds-background-surface', 'série de dados 3'),
]

export const MINIMO = { texto: 4.5, componente: 3 } as const
