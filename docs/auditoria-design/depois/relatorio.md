# Auditoria de design e acessibilidade — depois

Gerado por `tests/e2e/baseline.spec.ts` (Playwright + axe-core, WCAG 2.2 AA: wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa).
App local com os emuladores e os dados de ensaio (`scripts/lib/ensaio.ts`).

## Resumo

- Telas medidas: 44 (perfis: anônimo, administrador, avaliador, consulta).
- Screenshots: 88 em `telas/` (1280 e 768 px, página inteira).
- Violações axe (regra × tela): 0.
- Regras aprovadas por tela: de 16 a 34 (prova de que o axe analisou cada tela).
- O axe detecta só parte dos critérios WCAG (contraste, nomes, estrutura). Teclado, foco visível, ordem de leitura e
  reflow em 320 px pedem revisão manual nas próximas etapas.

### Violações por regra

| Regra | Impacto | Telas | Elementos | O que é |
|---|---|---|---|---|

### Itens que o axe pede para revisar à mão (incomplete)

| Regra | Telas | Elementos | O que é |
|---|---|---|---|
| `color-contrast` | 6 | 31 | Elements must meet minimum color contrast ratio thresholds |

## Violações por rota

### anonimo · login (`/login`)

Nenhuma violação.

### administrador · inicio (`/`)

Nenhuma violação.

### administrador · painel-chamamento (`/chamamentos/ensaio-2026`)

Nenhuma violação.

### administrador · chamamento-novo (`/chamamentos/novo`)

Nenhuma violação.

### administrador · chamamento-editar (`/chamamentos/ensaio-2026/editar`)

Nenhuma violação.

### administrador · proposta-nova (`/chamamentos/ensaio-2026/propostas/nova`)

Nenhuma violação.

### administrador · proposta-editar (`/chamamentos/ensaio-2026/propostas/ensaio-l1-beta/editar`)

Nenhuma violação.

### administrador · sessao-nova (`/chamamentos/ensaio-2026/sessoes/nova`)

Nenhuma violação.

### administrador · sessao (`/chamamentos/ensaio-2026/sessoes/e2e-sessao-aberta`)

Nenhuma violação.

### administrador · ata (`/chamamentos/ensaio-2026/sessoes/e2e-sessao-aberta/ata`)

Nenhuma violação.

### administrador · admissibilidade (`/chamamentos/ensaio-2026/propostas/ensaio-l1-beta/admissibilidade`)

Nenhuma violação.

### administrador · d1 (`/chamamentos/ensaio-2026/propostas/ensaio-l1-beta/d1`)

Nenhuma violação.

### administrador · d2 (`/chamamentos/ensaio-2026/propostas/ensaio-l1-beta/d2`)

Nenhuma violação.

### administrador · d2-memoria (`/chamamentos/ensaio-2026/propostas/ensaio-l1-beta/d2/memoria`)

Nenhuma violação.

### administrador · diligencias (`/chamamentos/ensaio-2026/propostas/ensaio-l1-beta/diligencias`)

Nenhuma violação.

### administrador · classificacao (`/chamamentos/ensaio-2026/lotes/L1/classificacao`)

Nenhuma violação.

### administrador · oscs (`/oscs`)

Nenhuma violação.

### administrador · usuarios (`/usuarios`)

Nenhuma violação.

### administrador · auditoria (`/auditoria`)

Nenhuma violação.

### administrador · projecao (`/projecao/ensaio-2026/e2e-sessao-aberta`)

Nenhuma violação.

### administrador · diligencia-nova (`/chamamentos/ensaio-2026/propostas/ensaio-l1-beta/diligencias/nova`)

Nenhuma violação.

### avaliador · inicio (`/`)

Nenhuma violação.

### avaliador · painel-chamamento (`/chamamentos/ensaio-2026`)

Nenhuma violação.

### avaliador · sessao (`/chamamentos/ensaio-2026/sessoes/e2e-sessao-aberta`)

Nenhuma violação.

### avaliador · ata (`/chamamentos/ensaio-2026/sessoes/e2e-sessao-aberta/ata`)

Nenhuma violação.

### avaliador · admissibilidade (`/chamamentos/ensaio-2026/propostas/ensaio-l1-beta/admissibilidade`)

Nenhuma violação.

### avaliador · d1 (`/chamamentos/ensaio-2026/propostas/ensaio-l1-beta/d1`)

Nenhuma violação.

### avaliador · d2 (`/chamamentos/ensaio-2026/propostas/ensaio-l1-beta/d2`)

Nenhuma violação.

### avaliador · d2-memoria (`/chamamentos/ensaio-2026/propostas/ensaio-l1-beta/d2/memoria`)

Nenhuma violação.

### avaliador · diligencias (`/chamamentos/ensaio-2026/propostas/ensaio-l1-beta/diligencias`)

Nenhuma violação.

### avaliador · classificacao (`/chamamentos/ensaio-2026/lotes/L1/classificacao`)

Nenhuma violação.

### avaliador · projecao (`/projecao/ensaio-2026/e2e-sessao-aberta`)

Nenhuma violação.

### avaliador · diligencia-nova (`/chamamentos/ensaio-2026/propostas/ensaio-l1-beta/diligencias/nova`)

Nenhuma violação.

### consulta · inicio (`/`)

Nenhuma violação.

### consulta · painel-chamamento (`/chamamentos/ensaio-2026`)

Nenhuma violação.

### consulta · sessao (`/chamamentos/ensaio-2026/sessoes/e2e-sessao-aberta`)

Nenhuma violação.

### consulta · ata (`/chamamentos/ensaio-2026/sessoes/e2e-sessao-aberta/ata`)

Nenhuma violação.

### consulta · admissibilidade (`/chamamentos/ensaio-2026/propostas/ensaio-l1-beta/admissibilidade`)

Nenhuma violação.

### consulta · d1 (`/chamamentos/ensaio-2026/propostas/ensaio-l1-beta/d1`)

Nenhuma violação.

### consulta · d2 (`/chamamentos/ensaio-2026/propostas/ensaio-l1-beta/d2`)

Nenhuma violação.

### consulta · d2-memoria (`/chamamentos/ensaio-2026/propostas/ensaio-l1-beta/d2/memoria`)

Nenhuma violação.

### consulta · diligencias (`/chamamentos/ensaio-2026/propostas/ensaio-l1-beta/diligencias`)

Nenhuma violação.

### consulta · classificacao (`/chamamentos/ensaio-2026/lotes/L1/classificacao`)

Nenhuma violação.

### consulta · projecao (`/projecao/ensaio-2026/e2e-sessao-aberta`)

Nenhuma violação.

## Cores HEX soltas no código (src/, index.html; sem testes)

Total: 53.

| Arquivo:linha | Valor | Trecho |
|---|---|---|
| src/styles/tokens.css:13 | `#005faa` | `--sds-brand-blue: #005faa;` |
| src/styles/tokens.css:14 | `#1d9531` | `--sds-brand-green: #1d9531;` |
| src/styles/tokens.css:15 | `#007770` | `--sds-brand-teal: #007770;` |
| src/styles/tokens.css:16 | `#ffda00` | `--sds-brand-yellow: #ffda00;` |
| src/styles/tokens.css:17 | `#ffffff` | `--sds-brand-white: #ffffff;` |
| src/styles/tokens.css:18 | `#030505` | `--sds-brand-black: #030505;` |
| src/styles/tokens.css:21 | `#f1f8fc` | `--sds-primary-50: #f1f8fc;` |
| src/styles/tokens.css:22 | `#dfeff9` | `--sds-primary-100: #dfeff9;` |
| src/styles/tokens.css:23 | `#b1d1eb` | `--sds-primary-200: #b1d1eb;` |
| src/styles/tokens.css:24 | `#78adda` | `--sds-primary-300: #78adda;` |
| src/styles/tokens.css:25 | `#468dca` | `--sds-primary-400: #468dca;` |
| src/styles/tokens.css:26 | `#1973b9` | `--sds-primary-500: #1973b9;` |
| src/styles/tokens.css:27 | `#005faa` | `--sds-primary-600: #005faa;` |
| src/styles/tokens.css:28 | `#00539a` | `--sds-primary-700: #00539a;` |
| src/styles/tokens.css:29 | `#004b87` | `--sds-primary-800: #004b87;` |
| src/styles/tokens.css:30 | `#003d6e` | `--sds-primary-900: #003d6e;` |
| src/styles/tokens.css:32 | `#e5f4e7` | `--sds-green-100: #e5f4e7;` |
| src/styles/tokens.css:33 | `#b5dfbb` | `--sds-green-200: #b5dfbb;` |
| src/styles/tokens.css:34 | `#7bc587` | `--sds-green-300: #7bc587;` |
| src/styles/tokens.css:35 | `#49ab59` | `--sds-green-400: #49ab59;` |
| src/styles/tokens.css:36 | `#1d9531` | `--sds-green-500: #1d9531;` |
| src/styles/tokens.css:37 | `#187d29` | `--sds-green-600: #187d29;` |
| src/styles/tokens.css:38 | `#146b23` | `--sds-green-700: #146b23;` |
| src/styles/tokens.css:40 | `#dcebea` | `--sds-teal-100: #dcebea;` |
| src/styles/tokens.css:41 | `#a5d0cd` | `--sds-teal-200: #a5d0cd;` |
| src/styles/tokens.css:42 | `#60aca7` | `--sds-teal-300: #60aca7;` |
| src/styles/tokens.css:43 | `#278e88` | `--sds-teal-400: #278e88;` |
| src/styles/tokens.css:44 | `#007770` | `--sds-teal-500: #007770;` |
| src/styles/tokens.css:45 | `#00615b` | `--sds-teal-600: #00615b;` |
| src/styles/tokens.css:46 | `#004d49` | `--sds-teal-700: #004d49;` |
| src/styles/tokens.css:48 | `#ffffff` | `--sds-neutral-0: #ffffff;` |
| src/styles/tokens.css:49 | `#f7f7f7` | `--sds-neutral-50: #f7f7f7;` |
| src/styles/tokens.css:50 | `#eeeeee` | `--sds-neutral-100: #eeeeee;` |
| src/styles/tokens.css:51 | `#e2e2e2` | `--sds-neutral-200: #e2e2e2;` |
| src/styles/tokens.css:52 | `#cccccc` | `--sds-neutral-300: #cccccc;` |
| src/styles/tokens.css:53 | `#a3a3a3` | `--sds-neutral-400: #a3a3a3;` |
| src/styles/tokens.css:54 | `#858585` | `--sds-neutral-500: #858585;` |
| src/styles/tokens.css:55 | `#666666` | `--sds-neutral-600: #666666;` |
| src/styles/tokens.css:56 | `#4a4a4a` | `--sds-neutral-700: #4a4a4a;` |
| src/styles/tokens.css:57 | `#363636` | `--sds-neutral-800: #363636;` |
| src/styles/tokens.css:58 | `#242424` | `--sds-neutral-900: #242424;` |
| src/styles/tokens.css:59 | `#171717` | `--sds-neutral-950: #171717;` |
| src/styles/tokens.css:62 | `#1d7a35` | `--sds-functional-success: #1d7a35;` |
| src/styles/tokens.css:63 | `#b42318` | `--sds-functional-error: #b42318;` |
| src/styles/tokens.css:64 | `#b77900` | `--sds-functional-warning: #b77900;` |
| src/styles/tokens.css:65 | `#8f5f00` | `--sds-functional-warning-text: #8f5f00;` |
| src/styles/tokens.css:66 | `#707070` | `--sds-functional-muted: #707070;` |
| src/styles/tokens.css:112 | `#858585` | `--sds-text-muted: var(--sds-functional-muted); /* §8: #858585 reprova AA; usar #707070 */` |
| src/styles/tokens.css:112 | `#707070` | `--sds-text-muted: var(--sds-functional-muted); /* §8: #858585 reprova AA; usar #707070 */` |
| src/styles/tokens.css:120 | `#E2E2E2` | `o campo; #E2E2E2 e #CCCCCC ficam abaixo disso), por isso Neutral 500. */` |
| src/styles/tokens.css:120 | `#CCCCCC` | `o campo; #E2E2E2 e #CCCCCC ficam abaixo disso), por isso Neutral 500. */` |
| src/styles/tokens.css:156 | `#030505` | `/* Destaque (amarelo só como acento; texto sempre #030505 sobre ele, §5 e §8). */` |
| src/styles/tokens.css:252 | `#E2E2E2` | `/* Card (§13): fundo branco, raio 12, padding 24, borda 1 px #E2E2E2, elevação 0–1. */` |

## Classes de cor da paleta padrão do Tailwind (não semânticas)

Total: 0 usos em 0 arquivos. Serão trocadas por tokens semânticos.

| Arquivo | Usos | Classes |
|---|---|---|

## Fontes

- `font-family` calculada do `<body>` no navegador: `Gotham, "Helvetica Neue", Arial, sans-serif`.
- Fontes web carregadas (`document.fonts`): nenhuma (só fontes do sistema).
- Declarações no código:

  - src/features/auditoria/TabelaAuditoria.tsx:64 — `<td className="px-2 py-1 font-mono break-all text-status-error-text">{l.antes}</td>`
  - src/features/auditoria/TabelaAuditoria.tsx:65 — `<td className="px-2 py-1 font-mono break-all text-status-success-text">{l.depois}</td>`
  - src/features/auditoria/TabelaAuditoria.tsx:107 — `<span className="block font-mono text-caption text-text-muted">{r.caminho}</span>`
  - src/features/relatorios/EditorAta.tsx:33 — `className="[&_textarea]:font-mono"`
  - src/index.css:14 — `*   @font-face { font-family: 'Gotham'; src: url('/fonts/Gotham-Book.woff2') format('woff2');`
  - src/index.css:20 — `--font-sans: var(--sds-font-family);`
  - src/relatorios/documento.ts:28 — `export const FONTE_PDF = 'Roboto'`
  - src/relatorios/documento.ts:131 — `defaultStyle: { font: FONTE_PDF, fontSize: 9, color: CORES_DOCUMENTO.texto },`
  - src/styles/tokens.css:101 — `--sds-font-family: 'Gotham', 'Helvetica Neue', Arial, sans-serif;`

## Comparativo com o "antes"

| Indicador | Antes | Depois | Meta |
|---|---|---|---|
| Telas medidas (mesmas rotas, perfis e larguras) | 42 | 42 | — |
| Violações axe (regra × tela) | 0 | 0 | 0 |
| Elementos que o axe não decidiu (contraste a revisar) | 111 | 31 | o menor possível |
| HEX soltos fora de `tokens.css` | 13 | 0 | 0 |
| Classes da paleta padrão do Tailwind | 490 | 0 | 0 |
| Telas sem template (exceto por desenho) | 42 (não havia templates) | 0 | 0 |

### Violações axe por rota

| Perfil | Rota | Antes | Depois | Template (depois) |
|---|---|---|---|---|
| anonimo | login | 0 | 0 | AuthPage |
| administrador | inicio | 0 | 0 | ListPage |
| administrador | painel-chamamento | 0 | 0 | DetailPage |
| administrador | chamamento-novo | 0 | 0 | FormPage |
| administrador | chamamento-editar | 0 | 0 | FormPage |
| administrador | proposta-nova | 0 | 0 | FormPage |
| administrador | proposta-editar | 0 | 0 | FormPage |
| administrador | sessao-nova | 0 | 0 | WizardPage |
| administrador | sessao | 0 | 0 | DetailPage |
| administrador | ata | 0 | 0 | FormPage |
| administrador | admissibilidade | 0 | 0 | FormPage |
| administrador | d1 | 0 | 0 | DetailPage |
| administrador | d2 | 0 | 0 | ListPage |
| administrador | d2-memoria | 0 | 0 | DetailPage |
| administrador | diligencias | 0 | 0 | ListPage |
| administrador | classificacao | 0 | 0 | ListPage |
| administrador | oscs | 0 | 0 | ListPage |
| administrador | usuarios | 0 | 0 | ListPage |
| administrador | auditoria | 0 | 0 | ListPage |
| administrador | projecao | 0 | 0 | — (layout próprio do telão (sem AppShell, por desenho)) |
| administrador | diligencia-nova (nova) | — | 0 | FormPage |
| avaliador | inicio | 0 | 0 | ListPage |
| avaliador | painel-chamamento | 0 | 0 | DetailPage |
| avaliador | sessao | 0 | 0 | DetailPage |
| avaliador | ata | 0 | 0 | FormPage |
| avaliador | admissibilidade | 0 | 0 | FormPage |
| avaliador | d1 | 0 | 0 | DetailPage |
| avaliador | d2 | 0 | 0 | ListPage |
| avaliador | d2-memoria | 0 | 0 | DetailPage |
| avaliador | diligencias | 0 | 0 | ListPage |
| avaliador | classificacao | 0 | 0 | ListPage |
| avaliador | projecao | 0 | 0 | — (layout próprio do telão (sem AppShell, por desenho)) |
| avaliador | diligencia-nova (nova) | — | 0 | FormPage |
| consulta | inicio | 0 | 0 | ListPage |
| consulta | painel-chamamento | 0 | 0 | DetailPage |
| consulta | sessao | 0 | 0 | DetailPage |
| consulta | ata | 0 | 0 | FormPage |
| consulta | admissibilidade | 0 | 0 | FormPage |
| consulta | d1 | 0 | 0 | DetailPage |
| consulta | d2 | 0 | 0 | ListPage |
| consulta | d2-memoria | 0 | 0 | DetailPage |
| consulta | diligencias | 0 | 0 | ListPage |
| consulta | classificacao | 0 | 0 | ListPage |
| consulta | projecao | 0 | 0 | — (layout próprio do telão (sem AppShell, por desenho)) |

### Telas sem template

- administrador · projecao (`/projecao/ensaio-2026/e2e-sessao-aberta`) — layout próprio do telão (sem AppShell, por desenho)
- avaliador · projecao (`/projecao/ensaio-2026/e2e-sessao-aberta`) — layout próprio do telão (sem AppShell, por desenho)
- consulta · projecao (`/projecao/ensaio-2026/e2e-sessao-aberta`) — layout próprio do telão (sem AppShell, por desenho)
