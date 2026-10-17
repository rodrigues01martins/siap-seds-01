# Acessibilidade — teclado, foco, zoom 200% e erros anunciados

Gerado por `tests/e2e/acessibilidade.spec.ts` (Playwright, Chromium, emuladores e dados de ensaio, perfil administrador).
Zoom 200% = viewport CSS de 640×450 (1280×900 ampliado). Tabelas podem rolar dentro do próprio contêiner (WCAG 1.4.10).

## Teclado, foco visível e zoom 200%

| Rota | 1º Tab = pular | Alcançados pelo Tab | Foco sem anel | Rolagem horizontal a 200% | Cortado a 200% |
|---|---|---|---|---|---|
| inicio | sim | 37/37 | 0 | 0 px | 0 |
| painel-chamamento | sim | 52/52 | 0 | 0 px | 0 |
| chamamento-novo | sim | 20/20 | 0 | 0 px | 0 |
| chamamento-editar | sim | 31/31 | 0 | 0 px | 0 |
| proposta-nova | sim | 24/24 | 0 | 0 px | 0 |
| proposta-editar | sim | 24/24 | 0 | 0 px | 0 |
| sessao-nova | sim | 25/25 | 0 | 0 px | 0 |
| sessao | sim | 29/29 | 0 | 0 px | 0 |
| ata | sim | 21/21 | 0 | 0 px | 0 |
| admissibilidade | sim | 36/36 | 0 | 0 px | 0 |
| d1 | sim | 169/169 | 0 | 0 px | 0 |
| d2 | sim | 37/37 | 0 | 0 px | 0 |
| resultado | sim | 25/25 | 0 | 0 px | 0 |
| classificacao | sim | 25/25 | 0 | 0 px | 0 |
| oscs | sim | 23/23 | 0 | 0 px | 0 |
| usuarios | sim | 20/20 | 0 | 0 px | 0 |
| limpar-base | sim | 13/13 | 0 | 0 px | 0 |
| projecao | — (sem elementos interativos, por desenho) | — | — | 0 px | 0 |
| nao-encontrado | sim | 10/10 | 0 | 0 px | 0 |


## Mensagens de erro anunciadas

| Formulário | Anunciada (aria-live / alert) | Mensagem |
|---|---|---|
| login com senha errada | sim | Não foi possível entrarE-mail ou senha incorretos. |
| novo chamamento vazio | sim | Erro: Informe o número do chamamento. |
| nova proposta vazia | sim | Erro: CNPJ inválido. |
| abertura de sessão sem data | sim | Erro: Data inválida (use AAAA-MM-DD). |
| admissão: página final antes da inicial | sim | A página final não pode ser anterior à inicial. |
| D1: página acima do corte do PA | sim | Erro: Página 99 acima do limite de 12 páginas do PA1. |
| D2: experiência nova incompleta (na linha) | sim | Informe ao menos uma categoria. |
| nova OSC vazia (painel lateral) | sim | Erro: CNPJ inválido. |
