# Auditoria de design — Etapa 4 (telas operacionais)

Screenshots de página inteira a 1280 e 768 px, perfil administrador (e avaliador em sessão e D1), gerados por
`tests/e2e/etapa4.spec.ts` com os emuladores e os dados de ensaio:

- `antes/`: telas antes da migração (`FASE_ETAPA4=antes npm run test:e2e:etapa4`), com o axe só medido;
- `depois/`: telas no DS (`npm run test:e2e:etapa4`), com o axe exigindo **0 violações** (WCAG 2.2 AA) e o fluxo
  completo pela interface (sessão → admissibilidade → D1 → D2 → classificação → homologação): `depois/fluxo--homologada--1280.jpg`;
- `relatorios/`: quadro-resumo em PDF antes e depois da identidade do DS.

| Tela | axe antes (1280/768) | axe depois (1280/768) | Antes 1280 | Depois 1280 | Depois 768 |
|---|---|---|---|---|---|
| sessao-nova | 0/0 | 0/0 | [antes](antes/administrador--sessao-nova--1280.jpg) | [depois](depois/administrador--sessao-nova--1280.jpg) | [768](depois/administrador--sessao-nova--768.jpg) |
| sessao | 0/0 | 0/0 | [antes](antes/administrador--sessao--1280.jpg) | [depois](depois/administrador--sessao--1280.jpg) | [768](depois/administrador--sessao--768.jpg) |
| admissibilidade | 0/0 | 0/0 | [antes](antes/administrador--admissibilidade--1280.jpg) | [depois](depois/administrador--admissibilidade--1280.jpg) | [768](depois/administrador--admissibilidade--768.jpg) |
| d1 | 1/1 | 0/0 | [antes](antes/administrador--d1--1280.jpg) | [depois](depois/administrador--d1--1280.jpg) | [768](depois/administrador--d1--768.jpg) |
| d2 | 0/0 | 0/0 | [antes](antes/administrador--d2--1280.jpg) | [depois](depois/administrador--d2--1280.jpg) | [768](depois/administrador--d2--768.jpg) |
| d2-memoria | 0/0 | 0/0 | [antes](antes/administrador--d2-memoria--1280.jpg) | [depois](depois/administrador--d2-memoria--1280.jpg) | [768](depois/administrador--d2-memoria--768.jpg) |
| diligencias | 1/1 | 0/0 | [antes](antes/administrador--diligencias--1280.jpg) | [depois](depois/administrador--diligencias--1280.jpg) | [768](depois/administrador--diligencias--768.jpg) |
| classificacao | 0/0 | 0/0 | [antes](antes/administrador--classificacao--1280.jpg) | [depois](depois/administrador--classificacao--1280.jpg) | [768](depois/administrador--classificacao--768.jpg) |
| ata | 1/1 | 0/0 | [antes](antes/administrador--ata--1280.jpg) | [depois](depois/administrador--ata--1280.jpg) | [768](depois/administrador--ata--768.jpg) |
| projecao | 0/0 | 0/0 | [antes](antes/administrador--projecao--1280.jpg) | [depois](depois/administrador--projecao--1280.jpg) | [768](depois/administrador--projecao--768.jpg) |

Relatórios: [quadro-resumo antes](relatorios/quadro-resumo--antes.png) · [depois](relatorios/quadro-resumo--depois.png).
