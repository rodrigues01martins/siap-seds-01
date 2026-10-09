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

## Perfis
admin, presidente, relator, membro, controle

## Convenções
- Código e nomes em português, sem acentos em identificadores (ex.: calcularD2, experiencias).
- Uma branch por etapa (ex.: feat/etapa-2-firebase), criada a partir da main; um PR por etapa.
- Todo PR com testes passando (npm run typecheck && npm test && npm run test:regras).
- TDD: commit test: (vermelho) antes do feat:/fix: que o faz passar.
- Merge na main com merge commit (não squash), preservando o histórico do TDD.
- Commits no padrão: feat:, fix:, test:, chore:, docs:

## Comandos
npm run dev | npm run build | npm test | npm run typecheck
npm run test:regras (emulador, Java 21+) | npm run emuladores
npm run seed:matriz -- --projeto dev|prod | npm run set-role -- --projeto dev|prod --email X --perfil Y
