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
   valida os dados e grava numa transação; cada documento guarda só atualizadoPor (nome/e-mail) e atualizadoEm.
3. A matriz vem de src/domain/matriz/matriz_2026.json; nada de pesos ou faixas fixos no código.
4. Proposta concluída (concluida=true) continua aceitando escrita: qualquer alteração na avaliação desfaz a conclusão.
5. Segredos nunca usam prefixo VITE_. FIREBASE_SERVICE_ACCOUNT só existe no servidor.
6. Componentes só usam tokens semânticos; nunca cores HEX diretas. Fonte de verdade visual:
   docs/DESIGN-SYSTEM-SEDS.md (Sistema de Design SEDS — Web Corporativo 1.0).
   Tokens em src/styles/tokens.css (3 níveis) e tema em src/index.css; biblioteca em src/components/ui
   (testes de cada componente ao lado); ícones só de lucide-react (componente Icone, 16/20/24).
   Telas usam os templates de src/components/templates (AppShell, AuthPage, ListPage, FormPage, DetailPage,
   WizardPage, DashboardPage), PageHeader com no máximo UMA ação primária por área, e FormularioApi nos
   formulários ligados à /api — exceto a avaliação (/avaliar), que usa o salvamento automático (sem botão Salvar). Marcas: só arquivos oficiais em public/brand/ (Brand.tsx); sem eles, texto.
   Telão (/projecao): tokens --sds-projecao-*. Relatórios: CORES_DOCUMENTO (documento.ts) lidas do tokens.css.
   Nenhum HEX fora de src/styles/tokens.css (tests/design/hex.test.ts). Mensagens de erro em região aria-live
   (MensagensCampo/MensagemErro em Field.tsx).

## Decisões
- Os PDFs dos Cadernos NÃO são carregados no app. A consulta é feita no SEI; o app guarda apenas o
  nº SEI (campo numeroSEI) e as páginas citadas. Nada de react-pdf, Firebase Storage ou pdfRef.
- Páginas citadas na avaliação da D1 usam a numeração interna do PA (1 até o limite do PA na matriz).
- Relatórios (espelho, quadro-resumo, ata) são gerados no navegador (pdfmake, exceljs), sem gravar nada. Rodapé com
  código de verificação = SHA-256 dos dados usados; "MINUTA" se houver proposta não concluída no documento.
- Exclusão livre (admin e presidente, api/_lib/cascata.ts): DELETE de chamamento, lote ({ id, lote } em
  /api/chamamentos), OSC, proposta, sessão, experiência, documento ({ ..., documento: índice } em /api/experiencia)
  e nível de subcritério (/api/avaliacao). Sem justificativa, sem identificador digitado, sem status "excluindo" e
  sem exigir sessão. Cascata: chamamento → lotes, sessões, propostas e tudo dentro delas, desempates; lote → propostas
  e desempates do lote (sai do chamamento e da pauta das sessões); OSC → suas propostas; proposta → admissibilidade,
  avaliações, experiências (com documentos) e resultado; sessão → a sessão e tudo registrado com o sessaoId dela.
  recursiveDelete e recálculo dos totais das propostas afetadas. Prévia: GET ?simular=true → { itens, total,
  resumo } ("1 proposta, 28 avaliações, 4 experiências"). Na tela: ícone de lixeira em cada item e um único
  ConfirmDialog destrutivo com a prévia ("Serão apagados: …").
- Gravações da Comissão só em sessão aberta: nível da D1, admissibilidade, experiências da D2 e desempate exigem o
  sessaoId de sessão aberta do chamamento (proposta de um lote em pauta, exceto no desempate); o sessaoId vai para o
  documento (base da exclusão da sessão em cascata). Exclusões não dependem de sessão.
- "Homologar" virou "Concluir" (POST /api/concluir { acao: 'concluir' | 'desfazer' }): reversível, sem
  justificativa e sem trava. Só conclui com a admissibilidade completa (motivo ≥ 10, se não admitida; páginas dos 6
  PAs, se admitida) e, se admitida, os 28 níveis e as 28 justificativas da D1 com o mínimo do chamamento
  (src/domain/conclusao.ts; não admitida conclui só com a admissibilidade). Alterar a avaliação
  (nível, experiência, documento, admissibilidade ou exclusão em cascata) grava concluida=false. Relatórios: não
  concluída leva MINUTA; concluída sai como final.
- Admissibilidade: admitida (sim/não), motivo (exigido ao concluir, se não) e páginas inicial/final por PA com página
  de corte (apurarPlano). D1: nível, justificativa e páginas (sem decisão nem voto divergente). As regras antigas de
  src/domain (calcularAdmissibilidade, decisão em problemasDoRegistro, status "homologada") não foram alteradas e
  ficam sem uso; a /api passa "unanimidade" ao domínio (esquemas/avaliacao.ts, problemasDoNivel).
- Sessão: data, chamamento, lote(s) em pauta (lotes), status (aberta | encerrada) e presentes como lista de
  { nome, papel: 'presidente' | 'membro' }, sem login e sem declaração de impedimento; exatamente 1 presidente e
  nomes não repetidos (comparados sem acento, caixa e espaços extras). Abertura numa página só (data, lotes,
  presentes com "Adicionar pessoa" e remoção com um clique). A ata lista os presentes com os papéis.
- O app foi simplificado: dois perfis com login (admin e presidente); presentes da sessão são apenas nomes;
  exclusão livre; sem auditoria detalhada. A revisão completa está na seção 0 do documento de requisitos.
  Decisão de 17/10/2026.
- Simplificação 2/4 (17/10/2026): saíram a auditoria detalhada (gravação em auditoria/, tela /auditoria, exportação;
  os registros antigos ficam no Firestore, sem leitura pelo app, e entram no backup), as diligências, a reabertura
  e a trava de homologação (bloqueada), o reset da sessão (dependia da auditoria; substituído pela exclusão da sessão
  em cascata), decisão/voto divergente da D1, o checklist 28.1 e o de formatação (28.5) e a exclusão antiga.
- Jornada fluida de avaliação (Simplificação 3/4, 17/10/2026): Início com a sessão aberta em destaque ("Continuar")
  ou "Abrir sessão"; /sessao/:id?ch= com presentes e a pauta (progresso "D1 18/28 · D2 ok", status, "Avaliar");
  /avaliar/:propostaId?ch=&aba= com a proposta inteira numa tela (abas Admissão | D1 | D2 | Resultado) e cabeçalho fixo
  (OSC, lote, nº SEI, "x de 28", D1 e NF parciais, status, eliminatória, anterior/próxima da pauta). O chamamento vai
  na consulta (?ch=) porque o Firestore lê pelo caminho completo; os endereços antigos redirecionam (Redirecionar.tsx).
  D1 numa página: seções por PA recolhíveis, linha por subcritério (escala 0–4 em botões, teclas 0–4, descritor,
  "Ver elementos", justificativa que cresce, páginas), pendência por linha e "Ir para o próximo pendente". D2 com
  edição na linha (documentos na linha expansível) e linha do tempo. Salvamento automático (src/lib/salvamento.ts,
  features/avaliar/salvamento.tsx): sem botão Salvar; a tela muda na hora (rascunho otimista) e grava em seguida
  (debounce de 800 ms para textos, imediato para níveis e caixas), uma gravação por vez, com nova tentativa
  automática (rede/5xx), indicador "Salvando… / Tudo salvo / Erro ao salvar — tentar de novo", rascunho incompleto
  guardado sem enviar ("Não salvo: …") e aviso ao sair com gravação pendente. Para isso a /api aceita rascunhos:
  PUT /api/avaliacao mescla nível (null desmarca), justificativa e páginas; a admissibilidade grava motivo e páginas
  em branco; os mínimos são conferidos ao concluir. Salvar não move o telão: o interruptor "Projetar" (cabeçalho da
  avaliação) leva o foco ao subcritério tocado e à aba (admissão, D1, D2 = d2, Resultado = resumo).
- O catálogo de componentes não faz parte do sistema; a documentação de componentes é mantida fora do
  repositório. Decisão de 15/10/2026. (Rota inexistente, como /ui, mostra a página "não encontrado".)

## Acesso (dois perfis: admin e presidente)
- Cadastro em usuarios/{uid}: nome, email, perfil ('admin' | 'presidente') e ativo.
- Os dois perfis fazem tudo (cadastros, avaliação, sessão, resultado e exclusão); só o admin
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
a ordem com justificativa (api/desempate.ts; 409 para grupo que o Edital já resolveu).

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
npm run test:e2e:exclusao (exclusão livre pela interface: lixeira, prévia, cascata, sessão, axe → docs/auditoria-design/exclusao/)
Teste com usuários: docs/TESTE-USABILIDADE.md · Backlog de interface: docs/auditoria-design/pendencias.md
npm run seed:matriz -- --projeto dev|prod | npm run tornar-admin -- --projeto dev|prod --email X (emergência)
npm run backup -- --projeto dev|prod [--chamamento ID] | npm run restaurar -- --projeto dev --arquivo F | npm run ensaio -- --projeto dev
Dia da sessão: docs/ROTEIRO-SESSAO.md · Produção: docs/CHECKLIST-PRODUCAO.md
