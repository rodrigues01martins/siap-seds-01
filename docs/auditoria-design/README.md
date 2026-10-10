# Auditoria de design e acessibilidade — antes × depois

Medições do app nas Etapas 1 a 5 da adoção do **Sistema de Design SEDS** (`docs/DESIGN-SYSTEM-SEDS.md`), sempre
com os emuladores do Firebase e os dados de ensaio, no Chromium (Playwright) e com o axe-core (WCAG 2.2 AA).

| Pasta / arquivo | O que tem | Como gerar |
|---|---|---|
| [`antes/`](antes/relatorio.md) | medição inicial: 42 telas × 2 larguras, axe, HEX e classes de paleta | `npm run test:e2e:baseline` |
| [`depois/relatorio.md`](depois/relatorio.md) | a mesma medição no fim, com o **comparativo** e as rotas novas | `FASE_AUDITORIA=depois npm run test:e2e:baseline` |
| [`depois/acessibilidade.md`](depois/acessibilidade.md) | teclado, foco visível, zoom 200% e erros anunciados em todas as rotas | `npm run test:e2e:acessibilidade` |
| [`depois/testes-de-uso.md`](depois/testes-de-uso.md) | testes de uso por perfil, com tempos | `npm run test:e2e:uso` |
| [`etapa-3/`](etapa-3/relatorio.md), [`etapa-4/`](etapa-4/README.md) | telas migradas em cada etapa (screenshots antes/depois) | `npm run test:e2e:etapa3`, `npm run test:e2e:etapa4` |
| [`contraste.md`](contraste.md) | contraste de cada par de tokens | `npx tsx tests/design/tabela-contraste.ts` |
| [`pendencias.md`](pendencias.md) | backlog por prioridade | — |

## Resumo antes × depois

| Indicador | Antes | Depois | Meta |
|---|---|---|---|
| Telas medidas (mesmas rotas, perfis e larguras 1280/768) | 42 | 42 (+3 rotas novas) | — |
| Violações do axe na medição geral (regra × tela) | 0 | 0 | 0 |
| Violações do axe nas telas operacionais (medição da Etapa 4) | 3 telas com contraste insuficiente (D1, diligências, ata) | 0 | 0 |
| Elementos que o axe não decide sozinho (contraste a revisar) | 111 | 31 (revisados à mão: passam) | o menor possível |
| Cores HEX soltas fora de `tokens.css` | 13 | **0** | 0 |
| Classes de cor da paleta padrão do Tailwind | 490 em 40 arquivos | **0** | 0 |
| Telas sem template | 42 (não havia templates) | 1: catálogo `/ui` (a projeção não usa template, por desenho) | 0 |
| Teclado: rotas com todo elemento alcançável só com Tab | não medido | 20 de 20 (a projeção não tem elementos interativos) | todas |
| Foco sempre visível (anel ≥ 2 px) | não medido | 20 de 21 rotas; 1 checkbox no catálogo (pendência M1) | todas |
| Zoom 200% sem rolagem horizontal nem conteúdo cortado | não medido | 21 de 21 rotas | todas |
| Formulários com erro anunciado pelo leitor de tela (`aria-live`) | 1 de 9 | **9 de 9** | todos |
| Testes de uso por perfil concluídos | — | 5 de 5 (relator, membro, presidente, controle, telão) | todos |
| Fluxo completo pela interface (sessão → homologação) | — | passa | passa |
| Fonte | pilha padrão do sistema (sem Gotham) | Gotham declarada com fallback; Gotham licenciada pendente (M5) | Gotham oficial |

As linhas "não medido" ficaram fora do "antes" porque a medição inicial só tinha o axe; o teclado, o foco, o zoom e
os erros anunciados foram medidos a partir das Etapas 3 e 5.
