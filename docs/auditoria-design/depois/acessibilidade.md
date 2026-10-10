# Acessibilidade — teclado, foco, zoom 200% e erros anunciados

Gerado por `tests/e2e/acessibilidade.spec.ts` (Playwright, Chromium, emuladores e dados de ensaio, perfil administrador).
Zoom 200% = viewport CSS de 640×450 (1280×900 ampliado). Tabelas podem rolar dentro do próprio contêiner (WCAG 1.4.10).

## Teclado, foco visível e zoom 200%

| Rota | 1º Tab = pular | Alcançados pelo Tab | Foco sem anel | Rolagem horizontal a 200% | Cortado a 200% |
|---|---|---|---|---|---|
| inicio | sim | 24/24 | 0 | 0 px | 0 |
| painel-chamamento | sim | 61/61 | 0 | 0 px | 0 |
| chamamento-novo | sim | 23/23 | 0 | 0 px | 0 |
| chamamento-editar | sim | 34/34 | 0 | 0 px | 0 |
| proposta-nova | sim | 25/25 | 0 | 0 px | 0 |
| proposta-editar | sim | 25/25 | 0 | 0 px | 0 |
| sessao-nova | sim | 20/20 | 0 | 0 px | 0 |
| sessao | sim | 32/32 | 0 | 0 px | 0 |
| ata | sim | 22/22 | 0 | 0 px | 0 |
| admissibilidade | sim | 60/60 | 0 | 0 px | 0 |
| d1 | sim | 72/72 | 0 | 0 px | 0 |
| d2 | sim | 40/40 | 0 | 0 px | 0 |
| d2-memoria | sim | 27/27 | 0 | 0 px | 0 |
| diligencias | sim | 33/33 | 0 | 0 px | 0 |
| classificacao | sim | 25/25 | 0 | 0 px | 0 |
| oscs | sim | 21/21 | 0 | 0 px | 0 |
| usuarios | sim | 24/24 | 0 | 0 px | 0 |
| auditoria | sim | 17/17 | 0 | 0 px | 0 |
| projecao | — (sem elementos interativos, por desenho) | — | — | 0 px | 0 |
| catalogo-ui | sim | 94/94 | 1 | 0 px | 0 |
| diligencia-nova | sim | 23/23 | 0 | 0 px | 0 |

- catalogo-ui: foco sem anel: input[checkbox] "campor1b" (conhecido, média — pendencias.md)

## Mensagens de erro anunciadas

| Formulário | Anunciada (aria-live / alert) | Mensagem |
|---|---|---|
| login com senha errada | sim | Não foi possível entrarE-mail ou senha incorretos. |
| novo chamamento vazio | sim | Erro: Informe o número do chamamento. |
| nova proposta vazia | sim | Erro: CNPJ inválido. |
| abertura de sessão sem data | sim | Erro: Data inválida (use AAAA-MM-DD). |
| admissibilidade sem resultado | sim | Erro: Escolha: admitida ou não admitida. |
| D1 sem nível | sim | Erro: Escolha a decisão (unanimidade ou maioria). |
| nova diligência vazia | sim | Erro: Descreva o objeto da diligência (ao menos 10 caracteres). |
| nova experiência vazia (painel lateral) | sim | Erro: Informe a descrição. |
| nova OSC vazia (painel lateral) | sim | Erro: CNPJ inválido. |
