# Pendências (backlog) — interface, acessibilidade e uso

Tudo o que as Etapas 1 a 5 não resolveram, por prioridade. Na Etapa 5 a regra foi corrigir só o que tinha
**severidade alta** nos testes; o restante ficou aqui. Fontes: `depois/relatorio.md` (medição de design),
`depois/acessibilidade.md`, `depois/testes-de-uso.md` e as notas das Etapas 3 e 4.

**Critério de prioridade**
- **Alta:** impede uma tarefa, leva a registro errado, deixa uma exigência legal ou institucional de fora, ou
  bloqueia o uso real.
- **Média:** atrasa, confunde ou falha num estado pouco usado.
- **Baixa:** incômodo visual, dívida técnica ou melhoria.

Corrigido na Etapa 5 (alta): mensagens de erro dos campos não eram anunciadas pelo leitor de tela em 8 de 9
formulários (agora ficam numa região `aria-live`).

## Alta

| # | Pendência | Por que importa | O que fazer | Quem decide |
|---|---|---|---|---|
| A1 | **Teste com usuários reais ainda não feito.** O roteiro e a planilha estão prontos (`docs/TESTE-USABILIDADE.md`). | Os testes automatizados provam que o fluxo funciona, não que a Comissão entende a tela sem ajuda. | Aplicar com 5 pessoas antes da sessão real; corrigir os problemas de severidade alta; meta SUS ≥ 68. | Coordenação da Comissão |
| A2 | **Perfil "controle" sem acesso ao histórico de alterações.** Hoje `/auditoria` é só do administrador (regra do CLAUDE.md, `firestore.rules` e `/api`). O teste de uso do controle confirma só a leitura. | Quem fiscaliza precisa ver a trilha sem receber poder de escrita (hoje teria de virar administrador). | Criar a permissão `auditoria` (somente leitura) em `src/domain/permissoes.ts`, nas regras e na tela Usuários. **É mudança de regra de acesso:** precisa de decisão e de testes de regras e da `/api`. | Administração do sistema |
| A3 | **Marcas oficiais ausentes.** A assinatura SEDS + Governo de Goiás aparece em texto no app e nos PDFs. | Identidade institucional exigida pelo Kit de Divulgação. | Colocar os arquivos oficiais em `public/brand/` (light, dark, monochrome) e preencher `MARCAS` em `Brand.tsx` e o cabeçalho dos relatórios (README, seção 8). | Comunicação da SEDS |

## Média

| # | Pendência | Detalhe | Sugestão |
|---|---|---|---|
| M1 | Checkbox no estado de erro esconde o anel de foco | O contorno vermelho de 1 px (`outline-1`) vence o anel de 2 px. Nenhuma tela usa esse estado hoje (era visto só no catálogo `/ui`, removido na Manutenção 2); vale para uso futuro. | Trocar o contorno de erro por borda ou usar `focus-visible:outline-2 focus-visible:outline-focus-ring`. |
| M2 | Cores derivadas do DS sem validação | Os HEX de marca (§3 e §8 do DS) foram derivados da identidade visual. | Validar com a Comunicação; se mudarem, basta trocar os primitivos em `tokens.css` (os relatórios leem de lá). |
| M3 | Tabelas largas rolam na horizontal | Painel do chamamento (ações por proposta), D2 e classificação, a 768 px e no zoom 200%. Funciona e é permitido (WCAG 1.4.10), mas é apertado. | Agrupar as ações por linha num menu ("Avaliar ▾") e esconder colunas secundárias abaixo de `lg`. |
| M4 | Documento do DS incompleto | `docs/DESIGN-SYSTEM-SEDS.md` termina no meio da seção 13. Seções citadas nos pedidos (18–21, 28, 36, 43, 44, 51–54) não estão no arquivo. | Completar o documento; revisar as telas contra as seções que faltam. |
| M5 | Gotham não licenciada | App e PDFs usam o fallback (Helvetica Neue/Arial e Roboto). | Obter os arquivos licenciados para `public/fonts/` e registrar no `@font-face` e no pdfmake (`src/relatorios/pdf.ts`). |
| M6 | Telão sem botão "Tela cheia" | Removido porque o modo projeção não tem ações. A tela cheia depende de F11. | Incluir no `docs/ROTEIRO-SESSAO.md` o passo "F11 no computador do telão" ou criar um atalho de teclado só para isso. |

## Baixa

Resolvido pela Manutenção 2: o catálogo `/ui` (antiga B1, tela sem template) foi removido do sistema.

| # | Pendência | Detalhe | Sugestão |
|---|---|---|---|
| B2 | 31 elementos de contraste "a revisar" no axe | O axe não decide sozinho: rodapé fixo da D1 (sobreposto ao conteúdo) e textos do gráfico SVG da D2. **Revisados à mão:** passam (texto do rodapé #242424 sobre #FFFFFF; rótulos brancos sobre teal 5,4:1 e azul 6,4:1; anos #666666 sobre #FFFFFF 5,7:1). Eram 111 no "antes". | Nada a fazer; repetir a revisão se as cores do gráfico mudarem. |
| B3 | "Acesso não autorizado" dentro do app sem template | Mensagem curta com PageHeader e alerta. | Usar `DetailPage` quando houver uma revisão de textos. |
| B4 | Utilitários de teste duplicados | `etapa3.spec.ts` e `etapa4.spec.ts` têm cópias de funções que hoje estão em `tests/e2e/apoio.ts`. | Passar a importar de `apoio.ts`. |
| B5 | `npm run dev` não serve a `/api` | Só os testes de navegador montam a `/api` no Vite (`vite.e2e.config.ts`); no `npm run dev` as telas leem, mas gravar exige a Vercel (preview da `dev`). | Criar `npm run dev:api` com a configuração de e2e e os emuladores. |
| B6 | Pacotes grandes no build | O Vite avisa que pdfmake e exceljs geram arquivos grandes (já carregados só quando usados). | Dividir em `manualChunks` se o tempo de download incomodar. |
| B7 | Tempo de digitação nos testes | Os tempos de `depois/testes-de-uso.md` são da máquina (digitação instantânea), não de pessoas. | Usar os tempos do teste com usuários (A1) como referência de uso real. |
