# Contraste dos tokens (WCAG 2.2 AA)

Gerado por `npx tsx tests/design/tabela-contraste.ts` a partir de `src/styles/tokens.css`;
o teste `tests/design/contraste.test.ts` falha se algum par ficar abaixo do mínimo.
Pares: 71 · aprovados: 71.

| Uso | Par (frente / fundo) | Razão | Mínimo | Aprovado |
|---|---|---|---|---|
| texto principal | `text-primary` #242424 / `background-default` #F7F7F7 | 14,49:1 | texto ≥ 4,5 | sim |
| texto secundário | `text-secondary` #666666 / `background-default` #F7F7F7 | 5,36:1 | texto ≥ 4,5 | sim |
| texto de apoio (metadados) | `text-muted` #707070 / `background-default` #F7F7F7 | 4,62:1 | texto ≥ 4,5 | sim |
| link | `text-link` #005FAA / `background-default` #F7F7F7 | 6,09:1 | texto ≥ 4,5 | sim |
| texto de sucesso | `status-success-text` #1D7A35 / `background-default` #F7F7F7 | 5,04:1 | texto ≥ 4,5 | sim |
| texto informativo | `status-info-text` #005FAA / `background-default` #F7F7F7 | 6,09:1 | texto ≥ 4,5 | sim |
| texto de atenção | `status-warning-text` #8F5F00 / `background-default` #F7F7F7 | 5,15:1 | texto ≥ 4,5 | sim |
| texto de erro | `status-error-text` #B42318 / `background-default` #F7F7F7 | 6,14:1 | texto ≥ 4,5 | sim |
| anel de foco | `focus-ring` #005FAA / `background-default` #F7F7F7 | 6,09:1 | componente ≥ 3 | sim |
| borda de campo e de checkbox/radio | `border-input` #858585 / `background-default` #F7F7F7 | 3,44:1 | componente ≥ 3 | sim |
| borda do botão secundário e controles marcados | `action-primary` #005FAA / `background-default` #F7F7F7 | 6,09:1 | componente ≥ 3 | sim |
| ícone de sucesso | `status-success` #1D7A35 / `background-default` #F7F7F7 | 5,04:1 | componente ≥ 3 | sim |
| ícone e borda de atenção | `status-warning` #B77900 / `background-default` #F7F7F7 | 3,41:1 | componente ≥ 3 | sim |
| ícone e borda de erro | `status-error` #B42318 / `background-default` #F7F7F7 | 6,14:1 | componente ≥ 3 | sim |
| texto principal | `text-primary` #242424 / `background-surface` #FFFFFF | 15,52:1 | texto ≥ 4,5 | sim |
| texto secundário | `text-secondary` #666666 / `background-surface` #FFFFFF | 5,74:1 | texto ≥ 4,5 | sim |
| texto de apoio (metadados) | `text-muted` #707070 / `background-surface` #FFFFFF | 4,95:1 | texto ≥ 4,5 | sim |
| link | `text-link` #005FAA / `background-surface` #FFFFFF | 6,53:1 | texto ≥ 4,5 | sim |
| texto de sucesso | `status-success-text` #1D7A35 / `background-surface` #FFFFFF | 5,40:1 | texto ≥ 4,5 | sim |
| texto informativo | `status-info-text` #005FAA / `background-surface` #FFFFFF | 6,53:1 | texto ≥ 4,5 | sim |
| texto de atenção | `status-warning-text` #8F5F00 / `background-surface` #FFFFFF | 5,52:1 | texto ≥ 4,5 | sim |
| texto de erro | `status-error-text` #B42318 / `background-surface` #FFFFFF | 6,57:1 | texto ≥ 4,5 | sim |
| anel de foco | `focus-ring` #005FAA / `background-surface` #FFFFFF | 6,53:1 | componente ≥ 3 | sim |
| borda de campo e de checkbox/radio | `border-input` #858585 / `background-surface` #FFFFFF | 3,69:1 | componente ≥ 3 | sim |
| borda do botão secundário e controles marcados | `action-primary` #005FAA / `background-surface` #FFFFFF | 6,53:1 | componente ≥ 3 | sim |
| ícone de sucesso | `status-success` #1D7A35 / `background-surface` #FFFFFF | 5,40:1 | componente ≥ 3 | sim |
| ícone e borda de atenção | `status-warning` #B77900 / `background-surface` #FFFFFF | 3,65:1 | componente ≥ 3 | sim |
| ícone e borda de erro | `status-error` #B42318 / `background-surface` #FFFFFF | 6,57:1 | componente ≥ 3 | sim |
| botão primário | `button-primary-fg` #FFFFFF / `button-primary-bg` #005FAA | 6,53:1 | texto ≥ 4,5 | sim |
| botão primário (hover) | `button-primary-fg` #FFFFFF / `button-primary-bg-hover` #004B87 | 8,91:1 | texto ≥ 4,5 | sim |
| botão primário (pressionado) | `button-primary-fg` #FFFFFF / `button-primary-bg-active` #003D6E | 11,10:1 | texto ≥ 4,5 | sim |
| botão secundário | `button-secondary-fg` #005FAA / `button-secondary-bg` #FFFFFF | 6,53:1 | texto ≥ 4,5 | sim |
| botão secundário (hover) | `button-secondary-fg` #005FAA / `button-secondary-bg-hover` #F1F8FC | 6,08:1 | texto ≥ 4,5 | sim |
| botão terciário | `button-tertiary-fg` #005FAA / `background-surface` #FFFFFF | 6,53:1 | texto ≥ 4,5 | sim |
| botão terciário (hover) | `button-tertiary-fg` #005FAA / `button-tertiary-bg-hover` #F1F8FC | 6,08:1 | texto ≥ 4,5 | sim |
| botão destrutivo | `button-destructive-fg` #FFFFFF / `button-destructive-bg` #B42318 | 6,57:1 | texto ≥ 4,5 | sim |
| botão destrutivo (hover) | `button-destructive-fg` #FFFFFF / `button-destructive-bg-hover` #991F15 | 8,20:1 | texto ≥ 4,5 | sim |
| texto digitado | `input-fg` #242424 / `input-bg` #FFFFFF | 15,52:1 | texto ≥ 4,5 | sim |
| placeholder | `input-placeholder` #707070 / `input-bg` #FFFFFF | 4,95:1 | texto ≥ 4,5 | sim |
| campo somente leitura | `input-fg` #242424 / `input-bg-readonly` #F7F7F7 | 14,49:1 | texto ≥ 4,5 | sim |
| borda de campo com erro | `input-border-error` #B42318 / `input-bg` #FFFFFF | 6,57:1 | componente ≥ 3 | sim |
| borda de campo válido | `input-border-success` #1D7A35 / `input-bg` #FFFFFF | 5,40:1 | componente ≥ 3 | sim |
| item do menu | `sidebar-fg` #FFFFFF / `sidebar-bg` #004D49 | 9,73:1 | texto ≥ 4,5 | sim |
| texto de apoio do menu | `sidebar-fg-muted` #DCEBEA / `sidebar-bg` #004D49 | 7,93:1 | texto ≥ 4,5 | sim |
| item do menu (hover) | `sidebar-fg` #FFFFFF / `sidebar-item-bg-hover` #00615B | 7,34:1 | texto ≥ 4,5 | sim |
| item do menu selecionado | `sidebar-item-fg-active` #FFFFFF / `sidebar-item-bg-active` #007770 | 5,42:1 | texto ≥ 4,5 | sim |
| marcador do item selecionado | `sidebar-item-indicator` #FFDA00 / `sidebar-item-bg-active` #007770 | 3,95:1 | componente ≥ 3 | sim |
| anel de foco no menu | `focus-ring-inverse` #FFFFFF / `sidebar-bg` #004D49 | 9,73:1 | componente ≥ 3 | sim |
| texto no card | `text-primary` #242424 / `card-bg` #FFFFFF | 15,52:1 | texto ≥ 4,5 | sim |
| cabeçalho da tabela | `table-header-fg` #666666 / `table-header-bg` #F7F7F7 | 5,36:1 | texto ≥ 4,5 | sim |
| linha da tabela (hover) | `text-primary` #242424 / `table-row-bg-hover` #F1F8FC | 14,47:1 | texto ≥ 4,5 | sim |
| linha da tabela selecionada | `text-primary` #242424 / `table-row-bg-selected` #DFEFF9 | 13,20:1 | texto ≥ 4,5 | sim |
| texto de apoio no cabeçalho | `text-muted` #707070 / `table-header-bg` #F7F7F7 | 4,62:1 | texto ≥ 4,5 | sim |
| badge success | `badge-success-fg` #1D7A35 / `badge-success-bg` #E5F4E7 | 4,74:1 | texto ≥ 4,5 | sim |
| ponto do badge success | `badge-success-dot` #1D7A35 / `badge-success-bg` #E5F4E7 | 4,74:1 | componente ≥ 3 | sim |
| badge info | `badge-info-fg` #005FAA / `badge-info-bg` #F1F8FC | 6,08:1 | texto ≥ 4,5 | sim |
| ponto do badge info | `badge-info-dot` #005FAA / `badge-info-bg` #F1F8FC | 6,08:1 | componente ≥ 3 | sim |
| badge warning | `badge-warning-fg` #8F5F00 / `badge-warning-bg` #F6EFE0 | 4,82:1 | texto ≥ 4,5 | sim |
| ponto do badge warning | `badge-warning-dot` #B77900 / `badge-warning-bg` #F6EFE0 | 3,19:1 | componente ≥ 3 | sim |
| badge error | `badge-error-fg` #B42318 / `badge-error-bg` #F9EDED | 5,75:1 | texto ≥ 4,5 | sim |
| ponto do badge error | `badge-error-dot` #B42318 / `badge-error-bg` #F9EDED | 5,75:1 | componente ≥ 3 | sim |
| badge neutral | `badge-neutral-fg` #666666 / `badge-neutral-bg` #EEEEEE | 4,95:1 | texto ≥ 4,5 | sim |
| ponto do badge neutral | `badge-neutral-dot` #858585 / `badge-neutral-bg` #EEEEEE | 3,18:1 | componente ≥ 3 | sim |
| alerta success | `status-success-text` #1D7A35 / `status-success-surface` #E5F4E7 | 4,74:1 | texto ≥ 4,5 | sim |
| alerta info | `status-info-text` #005FAA / `status-info-surface` #F1F8FC | 6,08:1 | texto ≥ 4,5 | sim |
| alerta warning | `status-warning-text` #8F5F00 / `status-warning-surface` #F6EFE0 | 4,82:1 | texto ≥ 4,5 | sim |
| alerta error | `status-error-text` #B42318 / `status-error-surface` #F9EDED | 5,75:1 | texto ≥ 4,5 | sim |
| texto sobre amarelo | `on-accent` #030505 / `accent` #FFDA00 | 14,87:1 | texto ≥ 4,5 | sim |
| série de dados 1 | `data-1` #007770 / `background-surface` #FFFFFF | 5,42:1 | componente ≥ 3 | sim |
| série de dados 2 | `data-2` #005FAA / `background-surface` #FFFFFF | 6,53:1 | componente ≥ 3 | sim |
| série de dados 3 | `data-3` #1D9531 / `background-surface` #FFFFFF | 3,89:1 | componente ≥ 3 | sim |
