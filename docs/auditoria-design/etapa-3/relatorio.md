# Auditoria de design — Etapa 3 (layout, navegação e templates)

Gerado por `tests/e2e/etapa3.spec.ts` (Playwright + axe-core, WCAG 2.2 AA) com os emuladores e os dados de ensaio.
Screenshots em `telas/` (1280 e 768 px, página inteira).

| Perfil | Tela | Rota | axe 1280 | axe 768 | Teclado (alcançados/focáveis) | Foco sem anel |
|---|---|---|---|---|---|---|
| anonimo | login | `/login` | 0 | 0 | 5/5 | 0 |
| administrador | inicio | `/` | 0 | 0 | 37/37 | 0 |
| administrador | painel-chamamento | `/chamamentos/ensaio-2026` | 0 | 0 | 52/52 | 0 |
| administrador | chamamento-novo | `/chamamentos/novo` | 0 | 0 | 20/20 | 0 |
| administrador | chamamento-editar | `/chamamentos/ensaio-2026/editar` | 0 | 0 | 31/31 | 0 |
| administrador | proposta-nova | `/chamamentos/ensaio-2026/propostas/nova` | 0 | 0 | 24/24 | 0 |
| administrador | proposta-editar | `/chamamentos/ensaio-2026/propostas/ensaio-l1-beta/editar` | 0 | 0 | 24/24 | 0 |
| administrador | oscs | `/oscs` | 0 | 0 | 23/23 | 0 |
| administrador | usuarios | `/usuarios` | 0 | 0 | 20/20 | 0 |
| presidente | inicio | `/` | 0 | 0 | 35/35 | 0 |
| presidente | painel-chamamento | `/chamamentos/ensaio-2026` | 0 | 0 | 50/50 | 0 |
| presidente | sem-permissao | `/usuarios` | 0 | 0 | 8/8 | 0 |

