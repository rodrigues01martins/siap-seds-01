# Acessibilidade — teclado, foco, zoom 200% e erros anunciados

Gerado por `tests/e2e/acessibilidade.spec.ts` (Playwright, Chromium, emuladores e dados de ensaio, perfil administrador).
Zoom 200% = viewport CSS de 640×450 (1280×900 ampliado). Tabelas podem rolar dentro do próprio contêiner (WCAG 1.4.10).

## Teclado, foco visível e zoom 200%

| Rota | 1º Tab = pular | Alcançados pelo Tab | Foco sem anel | Rolagem horizontal a 200% | Cortado a 200% |
|---|---|---|---|---|---|
| inicio | sim | 32/32 | 0 | 0 px | 0 |
| painel-chamamento | sim | 63/63 | 0 | 0 px | 0 |
| chamamento-novo | sim | 19/19 | 0 | 0 px | 0 |
| chamamento-editar | sim | 30/30 | 0 | 0 px | 0 |
| proposta-nova | sim | 23/23 | 0 | 0 px | 0 |
| proposta-editar | sim | 23/23 | 0 | 0 px | 0 |
| sessao-nova | sim | 24/24 | 0 | 0 px | 0 |
| sessao | sim | 32/32 | 0 | 0 px | 0 |
| ata | sim | 20/20 | 0 | 0 px | 0 |
| admissibilidade | sim | 36/36 | 0 | 0 px | 0 |
| d1 | sim | 69/69 | 0 | 0 px | 0 |
| d2 | sim | 37/37 | 0 | 0 px | 0 |
| d2-memoria | sim | 24/24 | 0 | 0 px | 0 |
| classificacao | sim | 24/24 | 0 | 0 px | 0 |
| oscs | sim | 22/22 | 0 | 0 px | 0 |
| usuarios | sim | 19/19 | 0 | 0 px | 0 |
| projecao | — (sem elementos interativos, por desenho) | — | — | 0 px | 0 |
| nao-encontrado | sim | 9/9 | 0 | 0 px | 0 |


## Mensagens de erro anunciadas

| Formulário | Anunciada (aria-live / alert) | Mensagem |
|---|---|---|
| login com senha errada | sim | Não foi possível entrarE-mail ou senha incorretos. |
| novo chamamento vazio | sim | Erro: Informe o número do chamamento. |
| nova proposta vazia | sim | Erro: CNPJ inválido. |
| abertura de sessão sem data | sim | Erro: Data inválida (use AAAA-MM-DD). |
| admissibilidade sem resultado | sim | Erro: Informe se a proposta foi admitida (sim ou não). |
| D1 sem nível | sim | Erro: Escolha o nível. |
| nova experiência vazia (painel lateral) | sim | Erro: Informe a descrição. |
| nova OSC vazia (painel lateral) | sim | Erro: CNPJ inválido. |
