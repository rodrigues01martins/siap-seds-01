# SIAP SEDS/GO 2026 — Avaliação de Planos de Ação

App web para a Comissão de Seleção avaliar os Cadernos de Proposta Técnica (Anexo III) conforme a
Matriz de Avaliação (Anexo IV). Regras de arquitetura e convenções: veja [`CLAUDE.md`](CLAUDE.md).

- **Front-end:** React 18 + TypeScript + Vite + Tailwind, hospedado na Vercel
- **Back-end:** Firebase Auth + Firestore (leitura no cliente; escrita só pela `/api`, a partir da Etapa 3)
- **Ambientes:** dois projetos Firebase, **dev** (Preview da Vercel) e **prod** (Production da Vercel)

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | App local em http://localhost:5173 |
| `npm run typecheck` | Checagem de tipos |
| `npm test` | Testes de domínio, telas e lógica (rápidos, **sem emulador**; rode antes de cada commit) |
| `npm run test:regras` | Testes das `firestore.rules` no emulador (exige **Java 21+**) |
| `npm run test:api` | Testes das funções `/api` nos emuladores de Auth e Firestore (exige **Java 21+**) |
| `npm run emuladores` | Emuladores de Auth e Firestore para desenvolvimento local |
| `npm run seed:matriz -- --projeto dev` | Grava a matriz em `matrizes/2026` |
| `npm run set-role -- --projeto dev --email ... --perfil ...` | Define o perfil de um usuário |
| `npm run backup -- --projeto dev\|prod [--chamamento ID]` | Backup em JSON datado (seção 7) |
| `npm run restaurar -- --projeto dev --arquivo ...` | Restaura um backup **só no dev** (seção 7) |
| `npm run ensaio -- --projeto dev [--recriar\|--remover]` | Dados fictícios para ensaiar a sessão (seção 7) |

Dia da sessão: [`docs/ROTEIRO-SESSAO.md`](docs/ROTEIRO-SESSAO.md). Antes de usar em produção:
[`docs/CHECKLIST-PRODUCAO.md`](docs/CHECKLIST-PRODUCAO.md).

## Fluxo de trabalho: `dev` → `main`

Só existem duas branches. Não há Pull Requests nem GitHub Actions.

| Branch | Para quê | Deploy na Vercel |
|---|---|---|
| `dev` | todo o trabalho e os commits | **Preview** (projeto Firebase **dev**) |
| `main` | o que está em produção | **Production** (projeto Firebase **prod**) |

1. Trabalhe e faça commit na `dev`. **Antes de cada commit:** `npm run typecheck && npm test`. Se falhar,
   corrija antes de commitar. Os testes de emulador (`npm run test:regras` e `npm run test:api`) exigem
   Java 21+; rode-os quando mexer em `firestore.rules` ou na `/api`.
2. `git push` da `dev` → a Vercel publica o Preview. Teste nele.
3. Quando estiver bom: merge da `dev` na `main` **com merge commit** e push:
   ```bash
   git checkout main && git pull && git merge --no-ff dev && git push && git checkout dev
   ```
   A Vercel publica a produção.
4. Se `firestore.rules` mudou: copie as regras para o console (seção 3), **primeiro no dev, depois no prod**.

---

## 1. Preparar os projetos no Firebase (uma vez por projeto: dev e prod)

1. Crie os dois projetos no [Firebase Console](https://console.firebase.google.com/).
2. **Authentication** → *Sign-in method* → ative **E-mail/senha**.
3. **Firestore Database** → *Criar banco de dados* (modo produção; região `southamerica-east1`, São Paulo).
4. **Configurações do projeto** → *Seus apps* → adicione um app **Web**. Anote `apiKey`,
   `authDomain`, `projectId` e `appId`; eles alimentam as variáveis da seção 2.
5. Confira os IDs no arquivo [`.firebaserc`](.firebaserc). Se os seus projetos tiverem outros IDs,
   ajuste `dev` e `prod` nesse arquivo e faça um commit. Os scripts e o deploy **se recusam a
   rodar** se o ID do `.firebaserc` não bater com o da credencial.

## 2. Variáveis na Vercel

Na Vercel: **Project → Settings → Environment Variables**. Cadastre as 4 variáveis **duas vezes**,
uma por ambiente:

| Variável | Environment **Preview** (projeto dev) | Environment **Production** (projeto prod) |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | `apiKey` do app Web de dev | `apiKey` do app Web de prod |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` de dev | `authDomain` de prod |
| `VITE_FIREBASE_PROJECT_ID` | `projectId` de dev | `projectId` de prod |
| `VITE_FIREBASE_APP_ID` | `appId` de dev | `appId` de prod |

Passo a passo para cada linha:
1. *Add New* → informe o **Key** (ex.: `VITE_FIREBASE_API_KEY`) e o **Value** do projeto dev.
2. Em *Environments*, marque **somente Preview** → *Save*.
3. *Add New* de novo com o mesmo Key e o valor do projeto prod; marque **somente Production** → *Save*.
4. Depois de cadastrar tudo: **Deployments** → no último deploy, *⋯ → Redeploy*. O Vite grava as
   variáveis **no momento do build**, então um deploy antigo não as enxerga.

Se faltar alguma variável, o app mostra uma tela vermelha com o nome exato das que faltam.

> **Por que o prefixo `VITE_` aqui é seguro?** Essas 4 informações só identificam o projeto e
> vão para o navegador de qualquer forma; quem protege os dados são as `firestore.rules`.
> **Não** cadastre `VITE_USAR_EMULADORES` na Vercel.

### 2.1 Credencial do servidor da `/api`: `FIREBASE_SERVICE_ACCOUNT`

As funções `/api` gravam no Firestore com o Admin SDK. Elas leem a chave da conta de serviço de
`FIREBASE_SERVICE_ACCOUNT`, que **só existe no servidor** (sem prefixo `VITE_`, nunca vai para o navegador).

| Key | Type | Environment | Value |
|---|---|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | **Secret** | **Production** | JSON inteiro da chave do Admin SDK do projeto **prod** (`siap-seds-01`) |
| `FIREBASE_SERVICE_ACCOUNT` | **Secret** | **Preview** | JSON inteiro da chave do Admin SDK do projeto **dev** (`siap-web-dev`) |
| `ADMIN_INICIAL_EMAIL` | Plain | **Production** | E-mail do primeiro administrador de prod (seção 4) |
| `ADMIN_INICIAL_EMAIL` | Plain | **Preview** | E-mail do primeiro administrador de dev (seção 4) |

Como gerar cada chave: Firebase Console (do projeto) → *Configurações do projeto* → *Contas de serviço* →
**Gerar nova chave privada**. Abra o JSON no Bloco de Notas, copie tudo para o *Value* e apague o arquivo.
Depois, *Redeploy*. Sem a variável, toda chamada à `/api` que precise do Firebase responde 500 e o log da
função mostra `Defina FIREBASE_SERVICE_ACCOUNT ...`.

## 3. Regras do Firestore: copiar para o console

Não há publicação automática. Sempre que `firestore.rules` mudar (o assistente avisa no fim do trabalho):

1. Abra o arquivo [`firestore.rules`](firestore.rules) no GitHub (branch `dev`) e copie **todo** o conteúdo.
2. Firebase Console → projeto **siap-web-dev** → **Firestore Database** → aba **Regras** → apague o texto,
   cole o novo → **Publicar**. Teste no Preview.
3. Depois do merge na `main`, repita no projeto **siap-seds-01** (prod).

Se a tela de regras acusar erro de sintaxe, não publique: o texto foi copiado pela metade.
Índices: hoje o app só usa índices simples (criados automaticamente); `firestore.indexes.json` está vazio.

## 4. Primeiro administrador (sem terminal)

Uma vez por projeto (dev e prod):

1. **Criar a conta:** Firebase Console → *Authentication* → *Users* → **Add user** (e-mail e senha).
   Crie a conta **antes** do passo 2, para que ninguém registre esse e-mail no seu lugar.
2. **Vercel:** cadastre `ADMIN_INICIAL_EMAIL` com esse e-mail (Production para prod, Preview para dev) e faça
   **Redeploy** do ambiente.
3. **No app:** entre com essa conta. Na tela "Acesso não autorizado", clique em **Sou o administrador inicial**.
   O `PUT /api/perfis` confere o e-mail, dá o perfil `admin`, registra em `usuarios/{uid}` e na auditoria.
4. Pronto: os demais perfis (presidente, relator, membro, controle) são dados pelo admin na tela
   **Perfis de acesso** (`/perfis`). Cada pessoa precisa ter a conta criada no *Authentication* antes.

O `PUT /api/perfis` só funciona enquanto **não existir nenhum admin** no projeto; depois responde 409.
Sem a variável, ou com outro e-mail, responde 403.

**Opcional, pelo terminal** (exige Node.js 22, o repositório clonado e a chave do Admin SDK fora do repositório):
```powershell
$env:FIREBASE_SERVICE_ACCOUNT = Get-Content C:\chaves\siap-dev.json -Raw    # bash: export FIREBASE_SERVICE_ACCOUNT="$(cat ~/chaves/siap-dev.json)"
npm run set-role -- --projeto dev --email pessoa@go.gov.br --perfil membro    # prod: --projeto prod ... --confirmar
npm run seed:matriz -- --projeto dev                                           # registra a matriz em matrizes/2026
```
O app lê a matriz do código (`src/domain/matriz/matriz_2026.json`); `matrizes/2026` é só o registro publicado.

## 5. A `/api`: porta única de escrita

O navegador **nunca** grava no Firestore (as `firestore.rules` negam toda escrita de cliente). Toda gravação
passa por uma função `/api`, que:

1. confere o login (`Authorization: Bearer <ID token>`) → sem token ou token inválido/revogado: **401**;
2. confere o perfil do usuário contra a matriz de permissões → perfil sem permissão: **403**;
3. valida os dados (mensagens em português) → **400** `{ erro, campos }`; método errado → **405**;
4. grava numa transação junto com um registro em `auditoria/{id}`
   `{ caminho, acao, antes, depois, uid, perfil, dataHora }`;
5. recusa qualquer escrita em proposta homologada (`bloqueada = true`) ou em suas subcoleções → **409**.

### Endpoints da Etapa 3a (cadastros e perfis)

| Endpoint | Métodos | Corpo (JSON) | Perfil |
|---|---|---|---|
| `/api/chamamentos` | `POST` criar, `PATCH` editar | `{ numero, titulo, processoSei, dataLimitePropostas, indiceCorrecao?, dataBaseCorrecao?, justificativaMinima?, lotes: [{ codigo, descricao }] }` (`PATCH` com `id`) | admin |
| `/api/oscs` | `POST` criar, `PATCH` editar | `{ cnpj, razaoSocial, nomeFantasia? }` — CNPJ numérico ou alfanumérico | admin |
| `/api/propostas` | `POST` criar, `PATCH` editar | `{ chamamentoId, loteCodigo, oscCnpj, protocolo, numeroSEI, observacao? }` (`PATCH` com `propostaId`) | admin |

> Os PDFs dos Cadernos **não** são carregados no app: a consulta é feita no SEI. O app guarda só o nº SEI
> (`numeroSEI`) e as páginas citadas.
| `/api/perfis` | `POST` dar/trocar, `DELETE` remover | `{ email, perfil }` / `{ email }` | admin |
| `/api/perfis` | `PUT` primeiro admin | — | qualquer conta logada com o e-mail de `ADMIN_INICIAL_EMAIL`, só enquanto não houver admin (seção 4) |

- `dataLimitePropostas` (`AAAA-MM-DD`): referência da D2 (Anexo IV, 3.3.1, IV). Depois que alguma proposta do
  chamamento já tem totais calculados, não pode mais mudar → **409**.
- `justificativaMinima` (inteiro de 0 a 2.000, opcional): mínimo de caracteres da justificativa do nível (padrão 20).
- `indiceCorrecao` e `dataBaseCorrecao` (opcionais, sempre juntos): correção monetária dos valores da D2.

### Endpoint da Etapa 4a (sessão da Comissão)

| Endpoint | Métodos | Corpo (JSON) | Perfil |
|---|---|---|---|
| `/api/sessao` | `POST` abrir | `{ chamamentoId, data, pauta: [propostaId], presentes?: [uid], declaracoes?: [{ uid, semImpedimento, motivo? }] }` | presidente |
| `/api/sessao` | `PATCH` com `acao` | `{ chamamentoId, sessaoId, acao: 'presentes' \| 'declaracoes' \| 'foco' \| 'encerrar', ... }` | presidente e relator (`encerrar`: só presidente) |

- Sessão em `chamamentos/{ch}/sessoes/{id}`; **uma sessão aberta por chamamento** (abrir outra → **409**).
- Presentes precisam ter perfil da Comissão (presidente, relator, membro); só presente declara; impedimento
  exige motivo. `foco` = `{ propostaId, subcriterio }` da pauta e da matriz (ou `null`).
- Sessão encerrada não aceita alteração (**409**) e **a avaliação (C2) só é aceita em sessão aberta** (**409**).
- Os esquemas zod ficam em `src/esquemas/` e são os mesmos na `/api` e nos formulários do app.

### Endpoints da Etapa 3b (avaliação)

| Endpoint | Métodos | Corpo (JSON) | Perfil |
|---|---|---|---|
| `/api/avaliacao` | `PUT` registrar/alterar nível | `{ chamamentoId, propostaId, codigo, nivel, justificativa, paginas?, decisao, votoDivergente?, sessaoId }` | presidente, relator, membro |
| `/api/experiencia` | `POST` criar, `PATCH` editar, `DELETE` excluir | `{ chamamentoId, propostaId, descricao, categorias, modalidade, orgaoParceiro?, instrumento?, mrosc?, inicio, fim?, vagas?, unidades?, trabalhadores?, valorAnualCentavos?, documentos?: [{ tipo, numeroSEI, comprovaExecucaoSatisfatoria, aceito }], desconsideracoes?: [{ criterio, justificativa }] }` (`PATCH`/`DELETE` com `id`) | presidente, relator |
| `/api/homologar` | `POST` | `{ chamamentoId, propostaId }` | presidente |

- **C2 — nível** (`.../propostas/{p}/avaliacoes/{codigo}`): `codigo` precisa existir na matriz; `nivel` inteiro
  de 0 a 4; `paginas` (numeração interna do PA) não podem passar da página de corte do PA (Anexo III, 7.1);
  `decisao` é `unanimidade` ou `maioria`, e `votoDivergente` só vale com `maioria`. Registrar de novo o mesmo
  subcritério edita (a auditoria guarda antes e depois). Exige sessão aberta com a proposta na pauta (**409**)
  e, na mesma transação, define o subcritério como **foco da sessão**.
- **C3 — experiências** (`.../propostas/{p}/experiencias/{id}`): categorias A–D, sem A e B juntas
  (Anexo IV, 3.2.1, III); categoria D exige `mrosc` (Lei 13.019/2014); `fim ≥ inicio` (`fim` nulo = em
  execução); campos de porte inteiros não negativos (`valorAnualCentavos` em centavos). O `PATCH` valida o
  documento final (o que já existe + a alteração).
  - Derivados pelo servidor (Etapa 4b): **internação** (2.3.1) = `modalidade: 'internacao'`; **execução
    satisfatória** (C2.4) = algum documento `aceito` que `comprovaExecucaoSatisfatoria`.
  - `desconsideracoes`: a Comissão desconsidera a experiência **em critérios específicos** (C2.1 a C2.4),
    com justificativa obrigatória (Anexo IV, 3.8.5); a memória registra o motivo.
- **C4 — recálculo**: na **mesma transação** de C2 e C3, o servidor relê níveis e experiências e chama
  `consolidarProposta` (`src/domain/proposta.ts`). Grava `propostas/{p}.totais`
  `{ totaisPorPA, d1, d2, nf, status, completa, pendentes, motivos }` e a memória de cálculo da D2 em
  `.../resultadoD2/atual`. `status`: `pendente` (faltam subcritérios), `apta`, `inapta` (D1 < 67,2) ou
  `desclassificada` (nível 0 em 1.1 ou 1.2). As regras ficam só em `src/domain`; um teste confere que o
  gravado é idêntico ao resultado do domínio.
- **C5 — homologação**: só sem status `pendente` (→ **409**). Grava `bloqueada = true`, `homologadaPor`
  `{ uid, email }` e `homologadaEm`, com auditoria. Depois disso, C2 e C3 nessa proposta → **409**.

As funções da Vercel rodam como ESM no Node, sem bundler: imports relativos em `api/` e `src/domain/` usam
a extensão `.js` (`'./d1.js'`, `'./matriz/index.js'`) e o JSON usa `with { type: 'json' }`. O teste
`api/_lib/esm.test.ts` falha se alguém esquecer.

No app, use `chamarApi` de `src/lib/api.ts`: ele anexa o ID token e devolve `ErroApi` com `status`, mensagem
e `campos` em português.

### Matriz de permissões

| Operação | Perfis |
|---|---|
| C1 — cadastros (chamamentos, OSCs, propostas) | admin |
| C2 — nível dos subcritérios da D1 | presidente, relator, membro |
| C3 — experiências da D2 | presidente, relator |
| C5 — homologar proposta | presidente |
| C6 — dar e remover perfis | admin |
| Sessão: abrir e encerrar | presidente |
| Sessão: presentes, declarações de impedimento e foco | presidente, relator |
| Admissibilidade (Anexo III, item 28) | presidente, relator |
| Registrar decisão de desempate (RF-27) | presidente |
| Reabrir proposta homologada (RF-18) | presidente |
| Diligências (RF-28) | presidente, relator |
| Leitura da auditoria | admin, presidente, controle |

A fonte única no código é `src/domain/permissoes.ts` (um teste garante que ela bate com esta tabela).

### Telas (Etapa 4a)

| Rota | Quem usa | O que faz |
|---|---|---|
| `/` | Comissão e admin | lista de chamamentos |
| `/chamamentos/:ch` | Comissão e admin | painel: propostas por lote com status (pendente, apta, inapta, desclassificada, homologada) e sessões |
| `/chamamentos/novo`, `/chamamentos/:ch/editar` | admin | chamamento e lotes |
| `/chamamentos/:ch/propostas/nova`, `.../:p/editar` | admin | proposta (OSC, lote, protocolo, nº SEI) |
| `/oscs` | admin | OSCs, com máscara e validação de CNPJ |
| `/perfis` | admin | dar, trocar e remover perfis (o admin não remove o próprio) |
| `/chamamentos/:ch/sessoes/nova` | presidente | abertura: data, presentes, declarações, pauta |
| `/chamamentos/:ch/sessoes/:s` | Comissão (escrita: presidente e relator) | foco, presentes e declarações, encerrar |

### Admissibilidade (Anexo III, item 28)

| Endpoint | Método | Corpo (JSON) | Perfil |
|---|---|---|---|
| `/api/admissibilidade` | `PUT` | `{ chamamentoId, propostaId, requisitos: { '28.1.I': true, ... }, irregularidadesFormais?: ['28.5.II'], observacaoIrregularidades?, planos: [{ codigo, ausente, paginaInicial, paginaFinal }], resultado: 'admitida' \| 'nao_admitida', motivacao? }` | presidente, relator |

- Textos do 28.1 (10 requisitos), 28.2 a 28.5 ficam em `matriz_2026.json` (`admissibilidade`).
- Página de corte de cada PA = página inicial + limite do PA (Anexo III, 7.1) − 1; a tela alerta quando excede.
- O 28.1.VII (6 PAs) é apurado pela tabela; **PA ausente → desclassificada** (28.2). Admitida exige todos os
  requisitos; não admitida exige motivação. Irregularidade meramente formal não desclassifica (28.4).
- Grava `propostas/{p}.admissibilidade` (com `situacao`, `motivos`, `registradaPor`, `registradaEm`), auditado.
  Proposta **não admitida ou desclassificada não segue para avaliação**: C2 e C3 → **409**.

### Telas (Etapa 4b)

| Rota | Escrita | O que faz |
|---|---|---|
| `/chamamentos/:ch/propostas/:p/admissibilidade` | presidente, relator | checklist 28.1, páginas por PA com página de corte e alerta, irregularidades formais (28.5), resultado e motivação |
| `/chamamentos/:ch/propostas/:p/d1` | presidente, relator, membro (com sessão aberta e a proposta na pauta) | navegação PA1…PA6, painel do subcritério (escala com descritores, elementos como apoio, decisão, voto divergente, justificativa com contador, páginas com aviso de corte), alerta de nível 0 em 1.1/1.2 e rodapé com a prévia (src/domain) e o status oficial |
| `/chamamentos/:ch/propostas/:p/d2` | presidente, relator | experiências e documentos, desconsiderar por critério (3.8.5) e linha do tempo A/B |
| `/chamamentos/:ch/propostas/:p/d2/memoria` | — | memória de cálculo da D2 (`resultadoD2/atual`) |

Quem não pode escrever vê a tela sem os botões; proposta homologada fica somente leitura. O perfil
**controle** lê chamamentos, propostas e avaliações (firestore.rules), sem escrever.

Leitura em tempo real (`onSnapshot`, `src/lib/firestore.ts`); escrita só por `chamarApi` (`src/lib/api.ts`).
O componente `Formulario` valida com o mesmo esquema da `/api` e põe os erros 400 da `/api` nos mesmos campos.

### Resultado: classificação, homologação, reabertura e diligências (Etapa 6a)

| Endpoint | Método | Corpo (JSON) | Perfil |
|---|---|---|---|
| `/api/desempate` | `PUT` | `{ chamamentoId, loteCodigo, ordem: [propostaId, ...], justificativa }` | presidente |
| `/api/reabrir` | `POST` | `{ chamamentoId, propostaId, motivo }` | presidente |
| `/api/diligencias` | `POST` criar; `PATCH` com `acao` | `{ chamamentoId, propostaId, objeto, prazo }`; `{ ..., id, acao: 'responder', resposta }` ou `{ ..., id, acao: 'encerrar', conclusao }` | presidente, relator |

- **Classificação** (`/chamamentos/:ch/lotes/:lote/classificacao`): `classificarLote` (src/domain/classificacao.ts)
  aplica `classificar()` aos totais gravados. Ranking por NF entre aptas e completas, com PA1…PA6, D1, D2, NF e
  status; inaptas, desclassificadas, não admitidas e pendentes ficam abaixo, sem posição, com o motivo do domínio.
  Selo **"classificação não definitiva"** enquanto houver pendente ou empate sem decisão.
- **Desempate (RF-27)**: empates de NF no mesmo lote são resolvidos pelos critérios do Edital, aplicados
  sucessivamente (maior valor vence): **I** D1 · **II** PA1 · **III** PA2 · **IV** PA5 · **V** Critério 2.1 ·
  **VI** Critério 2.3. A ordem e a fonte ficam em `matriz_2026.json` (`desempate`, `fonteDesempate`). A tela e o
  quadro-resumo mostram o selo **"Desempate pelo Edital (critério N)"**. Os totais gravados trazem `d2PorCriterio`
  (pontos de C2.1…C2.4); proposta com totais anteriores ao RF-27 não usa os critérios V e VI até o próximo recálculo.
- **Decisão da Comissão**: só quando os seis critérios não resolvem. O presidente registra a ordem com justificativa
  (mín. 20 caracteres) em `chamamentos/{ch}/desempates/{id}`. A /api confere que as propostas formam exatamente um
  empate **residual** do lote (senão **409**); se o grupo ou a NF mudar depois, a decisão deixa de valer.
- **Homologação na tela**: botão do presidente com confirmação dupla (mostra NF e status e pede "conferi").
  Proposta com **diligência em aberto** (aberta ou respondida) não é homologada (**409**).
- **Reabertura (RF-18)**: só proposta homologada (senão **409**); motivo obrigatório (mín. 20); grava
  `bloqueada = false`, `reabertoPor`, `reabertoEm`, `motivoReabertura` e limpa `homologadaPor/Em` (o histórico fica
  na auditoria). É a única escrita aceita em proposta homologada.
- **Diligências (RF-28)** (`/chamamentos/:ch/propostas/:p/diligencias`): aberta → respondida → encerrada; encerrada
  não muda (**409**); prazo não pode ser anterior a hoje. Aviso fixo: *"Diligência não admite inclusão de conteúdo
  técnico novo (Anexo III, 29.3)"*.

### Relatórios e trilha de auditoria (Etapa 6b)

Gerados **no navegador** (pdfmake e exceljs, carregados só ao clicar); nada é enviado a servidor e nada é gravado.
Os dados são lidos uma vez no momento de gerar, e o documento é montado por código puro em `src/relatorios/`.

| Documento | Onde | Formato |
|---|---|---|
| Espelho de avaliação da proposta | botão **Espelho (PDF)** no cabeçalho da proposta | PDF |
| Quadro-resumo do lote (a mesma tabela da classificação) | tela de classificação do lote | PDF e XLSX |
| Minuta de ata da sessão (texto editável antes de exportar) | **Minuta de ata** na tela da sessão (`/chamamentos/:ch/sessoes/:s/ata`) | PDF |
| Trilha de auditoria | menu **Auditoria** (`/auditoria`) — admin, presidente, controle | tela e XLSX |

- **Espelho**: identificação (OSC, CNPJ, lote, nº SEI, protocolo), admissibilidade, os **28 subcritérios** com nível,
  decisão, voto divergente, justificativa e páginas citadas ("Não avaliado" quando falta), totais por PA, D1,
  memória da D2, NF e status.
- **Ata**: data, presentes, declarações de impedimento, propostas da pauta, decisões **por maioria** registradas na
  sessão (com voto divergente), desempates e diligências das propostas da pauta. O relator ajusta o texto; a edição
  não é gravada.
- **Rodapé de todos os documentos**: gerado em (data e hora de Brasília), por quem (e-mail), versão da matriz e
  **código de verificação** = SHA-256 da serialização canônica (chaves em ordem alfabética, datas em ISO) dos dados
  usados. Mesmos dados → mesmo código; na ata, o texto final faz parte dos dados.
- **Marca d'água "MINUTA"**: em todo documento com proposta não homologada (o espelho da proposta, o quadro do lote
  ou a ata da pauta).
- **Auditoria**: filtros por proposta, usuário (e-mail ou uid), ação (criar, editar, excluir) e período (padrão:
  últimos 30 dias; até 2.000 registros por consulta); "Ver antes/depois" mostra os campos alterados. A partir desta
  etapa o registro de auditoria guarda também o **e-mail** de quem escreveu; registros anteriores mostram o uid.

### Modo projeção — telão da sala (Etapa 5)

- Rota **`/projecao/:ch/:sessaoId`** (o link "Abrir telão" aparece na tela da D1 e na tela da sessão).
  Somente leitura, sem menu e sem botões de escrita; fonte grande, alto contraste e botão **Tela cheia**.
- Acompanha em tempo real (`onSnapshot`) o **foco da sessão** e mostra, conforme o tipo:
  `admissibilidade` (checklist 28.1 e páginas por PA com excessos), `subcriterio` (escala com o nível
  registrado destacado, decisão, justificativa, páginas), `d2` (pontos por critério e memória resumida) ou
  `resumo` (PA1…PA6, D1, D2, NF e status). Sem foco: tela de espera com o nome do chamamento.
- Foco = `{ tipo: 'admissibilidade' | 'subcriterio' | 'd2' | 'resumo', propostaId, subcriterio? }`, alterado
  por **presidente e relator** (`PATCH /api/sessao`, `acao: 'foco'`) e, ao salvar um nível, pela própria avaliação.
- Na tela da D1, presidente e relator controlam o telão: **Projetar** (subcritério, admissibilidade, D2,
  resumo) e atalhos **Alt+→** / **Alt+←** (próximo/anterior subcritério) e **Alt+R** (resumo). O indicador
  "No telão" mostra o que está sendo projetado.

**Login do telão.** O computador ligado ao projetor usa um usuário próprio, só para isso:
1. No Firebase Authentication (projeto dev ou prod), crie um usuário, por exemplo `telao@seds.go.gov.br`.
2. Em `/perfis`, dê a ele o perfil **membro**. Ele não muda o foco, mas **pode registrar níveis da D1** se alguém
   abrir a tela de avaliação com esse login: use-o só no computador do telão e com senha guardada pela Comissão.
   Alternativa sem nenhuma escrita: perfil **controle** (lê tudo, não grava nada; também lê a auditoria). **Recomendado em produção** (Etapa 7).
3. No computador da sala, entre com esse usuário e abra o link do telão.
Qualquer perfil logado consegue abrir a projeção; nenhum vê controles de escrita nela.

### Testar a `/api` localmente

```bash
npm run test:api     # sobe Auth + Firestore emulados, roda tests/api/** e derruba tudo
```
Os testes criam usuários com cada perfil no emulador, chamam as funções como a Vercel faria
(`Request` → `Response`) e conferem status, documento gravado e registro de auditoria.
Nenhum dado real é tocado: com `FIRESTORE_EMULATOR_HOST` e `FIREBASE_AUTH_EMULATOR_HOST` definidas, o
Admin SDK usa os emuladores (definir só uma das duas é recusado, para não misturar com produção).

## 6. Desenvolvimento local com emuladores

```bash
npm run emuladores            # terminal 1 (exige Java 21+)
npm run dev                   # terminal 2, com VITE_USAR_EMULADORES=true no .env.local
```
O `.env.local` (copie de `.env.example`) usa os dados do projeto dev. Com os emuladores, os scripts
gravam neles, e não na nuvem, se você definir antes:
`FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` e `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`.

Em `npm run dev`, a variável `VITE_USAR_EMULADORES=true` liga os emuladores. No build (produção e preview da
Vercel) ela é ignorada, e a `/api` se recusa a usar emuladores quando roda na Vercel.

## 7. Produção: backup, restauração e ensaio (Etapa 7)

### Backup (sem plano Blaze)
`scripts/backup-firestore.ts` lê com o Admin SDK, documento a documento (o export gerenciado do Firestore exige o
plano Blaze). O arquivo `backups/backup-<projeto>-<chamamento|todos>-<data e hora UTC>.json` traz:
- a árvore completa de cada chamamento (propostas, avaliações, experiências, memória da D2, diligências,
  sessões, desempates), as OSCs das propostas, a matriz e os registros de auditoria desses documentos;
- Timestamps preservados (`{"__tipo": "timestamp", ...}`), contagem por coleção e **SHA-256** do conteúdo.

**Pelo terminal** (exige a chave do Admin SDK do projeto em `FIREBASE_SERVICE_ACCOUNT`):
```powershell
$env:BACKUP_SENHA = 'senha longa guardada no cofre da SEDS'      # 16+ caracteres; o arquivo sai cifrado
npm run backup -- --projeto prod --confirmar                     # --chamamento ID para um só
```
Com `BACKUP_SENHA` (ou `--cifrar`) o arquivo sai cifrado (`.json.cifrado`, AES-256-GCM, chave derivada da senha
por scrypt): sem a senha ninguém o abre. Sem a senha, sai em claro, com dados das propostas: guarde em local
restrito. A pasta `backups/` está no `.gitignore`. Guarde cada arquivo na rede da SEDS. O backup só **lê**:
consome leituras da cota gratuita do Firestore (uma por documento, mais as listagens de subcoleções).

### Restauração (só no dev)
```bash
# a senha vem da variável, nunca do comando
export BACKUP_SENHA='...'                     # PowerShell: $env:BACKUP_SENHA = '...'
export FIREBASE_SERVICE_ACCOUNT="$(cat ~/chaves/siap-dev.json)"
npm run restaurar -- --projeto dev --arquivo backup-....json.cifrado                 # simulação: confere e mostra
npm run restaurar -- --projeto dev --arquivo backup-....json.cifrado --confirmar     # grava
npm run restaurar -- --projeto dev --arquivo ... --confirmar --substituir            # apaga o chamamento do dev antes
```
O script recusa `--projeto prod`, confere o formato e o SHA-256 e não sobrescreve um chamamento existente sem
`--substituir`. A restauração entra na auditoria do dev (`backup.restaurado`). Restaurar prod no dev copia dados
reais: apague-os ao terminar o teste.

### Ensaio (dados fictícios no dev)
`npm run ensaio -- --projeto dev` grava o chamamento `ensaio-2026` (*ENSAIO-001/2026*), 2 lotes, 3 OSCs com CNPJ
alfanumérico fictício (`ENSAIO…`) e 6 propostas no formato que a `/api` grava (totais e memória da D2 calculados por
`src/domain`), com uma sessão encerrada:

| Lote | Proposta | Situação |
|---|---|---|
| L1 | `ensaio-l1-alfa` (Instituto Alfa) | **pendente**: faltam 6.2, 6.3 e 6.4; ao completar com nível 4, passa ao 1º lugar |
| L1 | `ensaio-l1-beta` (Associação Beta) | **apta**, **empatada** com Gama (mesma NF) |
| L1 | `ensaio-l1-gama` (Centro Gama) | **apta**, **empatada** com Beta |
| L2 | `ensaio-l2-alfa` | **inapta** (D1 = 56 < 67,2) |
| L2 | `ensaio-l2-beta` | **desclassificada** (nível 0 em 1.1) |
| L2 | `ensaio-l2-gama` | **não admitida** (requisito 28.1.IV) |

`--recriar` apaga e grava de novo; `--remover` só apaga (o chamamento e as OSCs com `ensaio: true`). O script
recusa `--projeto prod`.
