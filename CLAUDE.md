# Avaliação de Planos de Ação — Chamamento SEDS/GO 2026

## Contexto
App web para a Comissão de Seleção avaliar Cadernos de Proposta Técnica (Anexo III) conforme a Matriz de Avaliação (Anexo IV).
Avaliação coletiva em sessão com projeção; um Relator registra as decisões da Comissão.
Nota Final: NF = D1 + D2 (máx. 132). D1 = 28 subcritérios, nível inteiro 0–4 (máx. 112). D2 = experiência da OSC (máx. 20).
Eliminatórias: D1 < 67,2 → inapta; nível 0 em 1.1 ou 1.2 → desclassificada.

## Stack
- React 18 + TypeScript + Vite, React Router, Tailwind
- Firebase JS SDK v10 (Auth + Firestore), leitura com onSnapshot
- Vercel Functions em /api (Node 22, ver .nvmrc) com firebase-admin
- Vitest para testes

## Regras de arquitetura (não violar)
1. src/domain é código puro: não importa Firebase, React nem nada de rede.
2. O cliente NUNCA escreve no Firestore. Toda escrita passa por /api, que:
   verifica o ID token, confere o acesso no cadastro usuarios/{uid} (perfil, ativo),
   valida os dados, grava e registra em /auditoria na mesma transação.
3. A matriz vem de src/domain/matriz/matriz_2026.json; nada de pesos ou faixas fixos no código.
4. Proposta com campo bloqueada=true não aceita escrita (homologada).
5. Segredos nunca usam prefixo VITE_. FIREBASE_SERVICE_ACCOUNT só existe no servidor.
6. Componentes só usam tokens semânticos; nunca cores HEX diretas. Fonte de verdade visual:
   docs/DESIGN-SYSTEM-SEDS.md (Sistema de Design SEDS — Web Corporativo 1.0).
   Tokens em src/styles/tokens.css (3 níveis) e tema em src/index.css; biblioteca em src/components/ui
   (testes de cada componente ao lado); ícones só de lucide-react (componente Icone, 16/20/24).
   Telas usam os templates de src/components/templates (AppShell, AuthPage, ListPage, FormPage, DetailPage,
   WizardPage, DashboardPage), PageHeader com no máximo UMA ação primária por área, e FormularioApi nos
   formulários ligados à /api. Marcas: só arquivos oficiais em public/brand/ (Brand.tsx); sem eles, texto.
   Telão (/projecao): tokens --sds-projecao-*. Relatórios: CORES_DOCUMENTO (documento.ts) lidas do tokens.css.
   Nenhum HEX fora de src/styles/tokens.css (tests/design/hex.test.ts). Mensagens de erro em região aria-live
   (MensagensCampo/MensagemErro em Field.tsx).

## Decisões
- Os PDFs dos Cadernos NÃO são carregados no app. A consulta é feita no SEI; o app guarda apenas o
  nº SEI (campo numeroSEI) e as páginas citadas. Nada de react-pdf, Firebase Storage ou pdfRef.
- Páginas citadas na avaliação da D1 usam a numeração interna do PA (1 até o limite do PA na matriz).
- Relatórios (espelho, quadro-resumo, ata) e a exportação da auditoria são gerados no navegador (pdfmake,
  exceljs), sem gravar nada. Rodapé com código de verificação = SHA-256 dos dados usados; "MINUTA" se houver
  proposta não homologada no documento.
- Exclusão de cadastros (chamamento, OSC, proposta): livre para os dois perfis, justificativa obrigatória (mín. 20 caracteres).
  Proposta homologada → 409 ("Reabra a proposta antes de excluir"); apaga a proposta e TODAS as subcoleções.
  OSC com proposta vinculada → 409 (quantas e quais). Chamamento com propostas ou sessões → 409; apaga o chamamento
  e seus lotes. Ordem (api/_lib/exclusao.ts): transação confere bloqueios, marca status "excluindo" (o gravar recusa
  com 409 toda escrita no documento "excluindo" ou abaixo dele) e grava auditoria "excluir" com fotografia completa
  (documento + subcoleções), justificativa, uid e perfil; depois recursiveDelete; se falhar, fica "excluindo" e a
  repetição conclui (idempotente). Prévia: GET ?simular=true. Na tela: "Excluir" no menu de ações da linha
  (MenuAcoes), nunca ação primária; ConfirmDialog com a prévia, a justificativa e o identificador digitado.
- Gravações da Comissão só em sessão aberta: nível da D1, admissibilidade, experiências da D2 e desempate exigem o
  sessaoId de sessão aberta do chamamento (proposta de um lote em pauta, exceto no desempate); o sessaoId vai para o documento
  e para cada registro de auditoria da operação (gravar({ sessaoId })). Diligências não dependem de sessão.
- Reset da sessão (PATCH /api/sessao ação "resetar"; prévia GET ?simular=true): admin ou presidente (perfis de
  login), justificativa obrigatória (mín. 20). Desfaz tudo o que foi gravado com o
  sessaoId (admissibilidade, níveis da D1, experiências e documentos da D2, desempates; diligências não): cada
  documento volta ao "antes" do primeiro registro de auditoria da sessão para ele (antes nulo → apagado).
  Bloqueios 409: proposta afetada homologada ("Reabra antes de resetar"); registro alterado depois em outra sessão
  não resetada ou fora de sessão ("Resete primeiro a sessão posterior"). Execução (api/_lib/resetSessao.ts): marca
  a sessão "reiniciando", reverte em lotes de até 400 escritas por transação (auditoria "resetar_sessao" com
  antes/depois), recalcula D1, D2, NF e status pelas regras de src/domain (recalcular.ts) e marca "reiniciada"
  (reiniciadaPor, reiniciadaEm, motivo, resets, historicoResets; presentes mantidos; foco limpo).
  Interrompido, fica "reiniciando" e a repetição continua de onde parou. Sessão reiniciada não recebe registros
  (para refazer, abre-se nova sessão). A ata registra cada reset (data, hora, quem resetou, motivo). Na tela da
  sessão, "Resetar sessão" (destructive) fica numa seção própria, fora das ações do cabeçalho; ConfirmDialog com
  a prévia, a justificativa e a palavra RESETAR.
- Sessão: data, chamamento, lote(s) em pauta (lotes), status (aberta | encerrada) e presentes como lista de
  { nome, papel: 'presidente' | 'membro' }, sem login e sem declaração de impedimento; exatamente 1 presidente e
  nomes não repetidos (comparados sem acento, caixa e espaços extras). Abertura numa página só (data, lotes,
  presentes com "Adicionar pessoa" e remoção com um clique). A ata lista os presentes com os papéis.
- O app foi simplificado: dois perfis com login (admin e presidente); presentes da sessão são apenas nomes;
  exclusão livre; sem auditoria detalhada. A revisão completa está na seção 0 do documento de requisitos.
  Decisão de 17/10/2026.
- O catálogo de componentes não faz parte do sistema; a documentação de componentes é mantida fora do
  repositório. Decisão de 15/10/2026. (Rota inexistente, como /ui, mostra a página "não encontrado".)

## Acesso (dois perfis: admin e presidente)
- Cadastro em usuarios/{uid}: nome, email, perfil ('admin' | 'presidente') e ativo.
- Os dois perfis fazem tudo (cadastros, avaliação, sessão, resultado, exclusão, reset e histórico); só o admin
  gerencia usuários e perfis na tela Usuários (/usuarios, api/usuarios.ts): novo usuário com perfil (conta criada
  com senha aleatória + e-mail "redefinir senha" do Firebase), mudar perfil, desativar. Ninguém tira o próprio
  admin nem se desativa.
- Cadastro antigo (permissoes/comissao, sem perfil) fica sem acesso até o admin dar um perfil; o login mostra
  "Seu acesso precisa ser atualizado pelo administrador". Exceção para não trancar o projeto: admin=true sem
  perfil ainda vale como admin.
- Entra no app quem está ativo e tem perfil. Mudança de perfil vale na hora (o app ouve usuarios/{uid}; a /api e
  as regras leem o cadastro). Leitura no Firestore: admin e presidente; escrita só pela /api.
- Sem custom claims e sem variável na Vercel para acesso.

## Perfis e permissões
Fonte no código: src/domain/permissoes.ts (teste garante que bate com esta tabela).
| Perfil | Pode |
|---|---|
| admin | tudo + gestão de usuários e perfis (exigência 'admin' do porteiro) |
| presidente | tudo, menos gestão de usuários e perfis (exigência 'usuario' do porteiro) |

Empate de NF (RF-27): aplicam-se, em ordem, os critérios do Edital da matriz (matriz_2026.json: desempate e
fonteDesempate; src/domain/classificacao.ts). Só se persistir o empate a Comissão decide e um dos perfis registra
a ordem com justificativa (api/desempate.ts, auditado; 409 para grupo que o Edital já resolveu).

## Fluxo de trabalho (obrigatório)
- Existem só duas branches: dev e main. Nunca crie outras branches nem Pull Requests.
- Todo trabalho é feito e commitado na dev (e enviado com push para a dev).
- Antes de CADA commit: npm run typecheck e npm test. Se falhar, corrija; não faça commit com erro.
- Merge na main somente quando o usuário pedir ("faça o merge da dev na main"), com merge commit
  (git merge --no-ff dev), e push.
- Quando firestore.rules mudar, avise no final com a mensagem:
  "ATENÇÃO: copiar firestore.rules para o console do Firebase (dev e depois prod)".
- Sem GitHub Actions (não há .github/workflows).
- Testes de emulador (npm run test:regras e npm run test:api, Java 21+) ao mexer em firestore.rules ou na /api.

## Convenções
- Código e nomes em português, sem acentos em identificadores (ex.: calcularD2, experiencias).
- TDD: o teste vem primeiro e é visto falhando (vermelho) antes do código que o faz passar. Como nenhum
  commit pode quebrar typecheck ou npm test:
  - teste de emulador (/api, regras): commit test: com um esboço do módulo que compila, depois feat:/fix:;
  - teste que roda no npm test: rode-o vermelho localmente e commite teste e código juntos no feat:/fix:.
- Commits no padrão: feat:, fix:, test:, chore:, docs:
- Primeiro admin de cada projeto: e-mail em api/_lib/adminsIniciais.ts; vira admin sozinho no primeiro login
  (PUT /api/usuarios), só enquanto o projeto não tiver admin. Demais usuários pela tela Usuários.
- Plano Hobby da Vercel: no máximo 12 arquivos de função em api/ (api/_lib/limiteFuncoes.test.ts). Endpoint novo
  entra como método ou ação de um arquivo existente; utilitários ficam em api/_lib.

## Comandos
npm run dev | npm run build | npm test | npm run typecheck
npm run test:regras | npm run test:api (emuladores, Java 21+) | npm run emuladores
npm run test:e2e:baseline (Playwright + axe nos emuladores; FASE_AUDITORIA=antes|depois → docs/auditoria-design/)
npm run test:e2e:etapa3 (telas migradas: teclado, axe 1280/768 e screenshots → docs/auditoria-design/etapa-3/)
npm run test:e2e:etapa4 (telas operacionais: axe, screenshots antes/depois e fluxo completo pela /api nos emuladores)
npm run test:e2e:uso (testes de uso por perfil, com tempos) | npm run test:e2e:acessibilidade (teclado, foco, zoom 200%, aria-live)
npm run test:e2e:exclusao (exclusão de cadastros pela interface: bloqueios, confirmação, axe → docs/auditoria-design/exclusao/)
npm run test:e2e:reset (reset da sessão pela interface: prévia, confirmação, sessão reiniciada, ata → docs/auditoria-design/reset-sessao/)
Teste com usuários: docs/TESTE-USABILIDADE.md · Backlog de interface: docs/auditoria-design/pendencias.md
npm run seed:matriz -- --projeto dev|prod | npm run tornar-admin -- --projeto dev|prod --email X (emergência)
npm run backup -- --projeto dev|prod [--chamamento ID] | npm run restaurar -- --projeto dev --arquivo F | npm run ensaio -- --projeto dev
Dia da sessão: docs/ROTEIRO-SESSAO.md · Produção: docs/CHECKLIST-PRODUCAO.md
