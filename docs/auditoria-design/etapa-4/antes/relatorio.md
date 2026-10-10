# Auditoria de design — Etapa 4 (telas operacionais) — antes

Gerado por `tests/e2e/etapa4.spec.ts` (Playwright + axe-core, WCAG 2.2 AA) com os emuladores e os dados de ensaio.
Screenshots nesta pasta (1280 e 768 px, página inteira).

| Perfil | Tela | Rota | axe 1280 | axe 768 |
|---|---|---|---|---|
| administrador | sessao-nova | `/chamamentos/ensaio-2026/sessoes/nova` | 0 | 0 |
| administrador | sessao | `/chamamentos/ensaio-2026/sessoes/e2e-sessao-aberta` | 0 | 0 |
| administrador | admissibilidade | `/chamamentos/ensaio-2026/propostas/ensaio-l1-beta/admissibilidade` | 0 | 0 |
| administrador | d1 | `/chamamentos/ensaio-2026/propostas/ensaio-l1-beta/d1` | 1 | 1 |
| administrador | d2 | `/chamamentos/ensaio-2026/propostas/ensaio-l1-beta/d2` | 0 | 0 |
| administrador | d2-memoria | `/chamamentos/ensaio-2026/propostas/ensaio-l1-beta/d2/memoria` | 0 | 0 |
| administrador | diligencias | `/chamamentos/ensaio-2026/propostas/ensaio-l1-beta/diligencias` | 1 | 1 |
| administrador | classificacao | `/chamamentos/ensaio-2026/lotes/L1/classificacao` | 0 | 0 |
| administrador | ata | `/chamamentos/ensaio-2026/sessoes/e2e-sessao-aberta/ata` | 1 | 1 |
| administrador | projecao | `/projecao/ensaio-2026/e2e-sessao-aberta` | 0 | 0 |
| avaliador | sessao | `/chamamentos/ensaio-2026/sessoes/e2e-sessao-aberta` | 0 | 0 |
| avaliador | d1 | `/chamamentos/ensaio-2026/propostas/ensaio-l1-beta/d1` | 1 | 1 |

- administrador · d1: color-contrast (serious): Elements must meet minimum color contrast ratio thresholds — div:nth-child(1) > .text-slate-800.font-semibold > .font-normal.text-slate-500 | div:nth-child(2) > .text-slate-800.font-semibold > .font-normal.text-slate-500 | div:nth-child(3) > .text-slate-800.font-semibold > .font-normal.text-slate-500
- administrador · d1: color-contrast (serious): Elements must meet minimum color contrast ratio thresholds — div:nth-child(1) > .text-slate-800.font-semibold > .font-normal.text-slate-500 | div:nth-child(2) > .text-slate-800.font-semibold > .font-normal.text-slate-500 | div:nth-child(3) > .text-slate-800.font-semibold > .font-normal.text-slate-500
- administrador · diligencias: color-contrast (serious): Elements must meet minimum color contrast ratio thresholds — .space-y-5 > .text-slate-500.text-sm
- administrador · diligencias: color-contrast (serious): Elements must meet minimum color contrast ratio thresholds — .space-y-5 > .text-slate-500.text-sm
- administrador · ata: color-contrast (serious): Elements must meet minimum color contrast ratio thresholds — .text-xs
- administrador · ata: color-contrast (serious): Elements must meet minimum color contrast ratio thresholds — .text-xs
- avaliador · d1: color-contrast (serious): Elements must meet minimum color contrast ratio thresholds — div:nth-child(1) > .text-slate-800.font-semibold > .font-normal.text-slate-500 | div:nth-child(2) > .text-slate-800.font-semibold > .font-normal.text-slate-500 | div:nth-child(3) > .text-slate-800.font-semibold > .font-normal.text-slate-500
- avaliador · d1: color-contrast (serious): Elements must meet minimum color contrast ratio thresholds — div:nth-child(1) > .text-slate-800.font-semibold > .font-normal.text-slate-500 | div:nth-child(2) > .text-slate-800.font-semibold > .font-normal.text-slate-500 | div:nth-child(3) > .text-slate-800.font-semibold > .font-normal.text-slate-500
