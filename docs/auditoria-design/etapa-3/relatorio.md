# Auditoria de design — Etapa 3 (layout, navegação e templates)

Gerado por `tests/e2e/etapa3.spec.ts` (Playwright + axe-core, WCAG 2.2 AA) com os emuladores e os dados de ensaio.
Screenshots em `telas/` (1280 e 768 px, página inteira).

| Perfil | Tela | Rota | axe 1280 | axe 768 | Teclado (alcançados/focáveis) | Foco sem anel |
|---|---|---|---|---|---|---|
| anonimo | login | `/login` | 0 | 0 | 5/5 | 0 |
| administrador | inicio | `/` | 0 | 0 | 19/19 | 0 |
| administrador | painel-chamamento | `/chamamentos/ensaio-2026` | 0 | 0 | 61/61 | 0 |
| administrador | chamamento-novo | `/chamamentos/novo` | 0 | 0 | 23/23 | 0 |
| administrador | chamamento-editar | `/chamamentos/ensaio-2026/editar` | 0 | 0 | 34/34 | 0 |
| administrador | proposta-nova | `/chamamentos/ensaio-2026/propostas/nova` | 0 | 0 | 25/25 | 0 |
| administrador | proposta-editar | `/chamamentos/ensaio-2026/propostas/ensaio-l1-beta/editar` | 0 | 0 | 25/25 | 0 |
| administrador | oscs | `/oscs` | 0 | 0 | 21/21 | 0 |
| administrador | usuarios | `/usuarios` | 0 | 0 | 20/20 | 0 |
| administrador | auditoria | `/auditoria` | 0 | 0 | 17/17 | 0 |
| avaliador | inicio | `/` | 0 | 0 | 13/13 | 0 |
| avaliador | painel-chamamento | `/chamamentos/ensaio-2026` | 0 | 0 | 46/46 | 0 |
| avaliador | sem-permissao | `/oscs` | 0 | 0 | 6/6 | 0 |

