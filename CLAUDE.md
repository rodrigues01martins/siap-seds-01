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
   verifica o ID token, confere o perfil (custom claim "perfil"),
   valida os dados, grava e registra em /auditoria na mesma transação.
3. A matriz vem de src/domain/matriz/matriz_2026.json; nada de pesos ou faixas fixos no código.
4. Proposta com campo bloqueada=true não aceita escrita (homologada).
5. Segredos nunca usam prefixo VITE_. FIREBASE_SERVICE_ACCOUNT só existe no servidor.

## Decisões
- Os PDFs dos Cadernos NÃO são carregados no app. A consulta é feita no SEI; o app guarda apenas o
  nº SEI (campo numeroSEI) e as páginas citadas. Nada de react-pdf, Firebase Storage ou pdfRef.
- Páginas citadas na avaliação da D1 usam a numeração interna do PA (1 até o limite do PA na matriz).

## Perfis
admin, presidente, relator, membro, controle

## Matriz de permissões
Fonte no código: src/domain/permissoes.ts (teste garante que bate com esta tabela).
| Operação | Perfis |
|---|---|
| C1 cadastros (chamamentos, OSCs, propostas) | admin |
| C2 nível dos subcritérios da D1 | presidente, relator, membro |
| C3 experiências da D2 | presidente, relator |
| C5 homologar proposta | presidente |
| C6 dar e remover perfis | admin |
| Sessão: abrir e encerrar | presidente |
| Sessão: presentes, declarações de impedimento e foco | presidente, relator |
| Admissibilidade (Anexo III, item 28) | presidente, relator |
| Registrar decisão de desempate (RF-27) | presidente |
| Reabrir proposta homologada (RF-18) | presidente |
| Diligências (RF-28) | presidente, relator |
| Leitura da auditoria | admin, presidente, controle |
Empate de NF: o sistema só sinaliza (empatada) e não calcula desempate. Enquanto o Edital não parametrizar
o critério (RF-27), o presidente registra a decisão da Comissão com justificativa (api/desempate.ts, auditado).

## Convenções
- Código e nomes em português, sem acentos em identificadores (ex.: calcularD2, experiencias).
- Uma branch por etapa (ex.: feat/etapa-2-firebase), criada a partir da main; um PR por etapa.
- Todo PR com testes passando (npm run typecheck && npm test && npm run test:regras && npm run test:api).
- TDD: commit test: (vermelho) antes do feat:/fix: que o faz passar.
- Merge na main com merge commit (não squash), preservando o histórico do TDD.
- Commits no padrão: feat:, fix:, test:, chore:, docs:

## Comandos
npm run dev | npm run build | npm test | npm run typecheck
npm run test:regras | npm run test:api (emuladores, Java 21+) | npm run emuladores
npm run seed:matriz -- --projeto dev|prod | npm run set-role -- --projeto dev|prod --email X --perfil Y
