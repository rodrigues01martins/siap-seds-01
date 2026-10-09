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
| `npm test` | Testes de domínio e de lógica (rápidos, sem emulador) |
| `npm run test:regras` | Testes das `firestore.rules` no emulador (exige **Java 21+**) |
| `npm run test:api` | Testes das funções `/api` nos emuladores de Auth e Firestore (exige **Java 21+**) |
| `npm run emuladores` | Emuladores de Auth e Firestore para desenvolvimento local |
| `npm run seed:matriz -- --projeto dev` | Grava a matriz em `matrizes/2026` |
| `npm run set-role -- --projeto dev --email ... --perfil ...` | Define o perfil de um usuário |

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

Como gerar cada chave: Firebase Console (do projeto) → *Configurações do projeto* → *Contas de serviço* →
**Gerar nova chave privada**. Abra o JSON no Bloco de Notas, copie tudo para o *Value* e apague o arquivo.
Depois, *Redeploy*. Sem a variável, toda chamada à `/api` que precise do Firebase responde 500 e o log da
função mostra `Defina FIREBASE_SERVICE_ACCOUNT ...`.

## 3. Secret no GitHub (publicação automática das regras em prod)

A cada push na `main`, o workflow de CI roda os testes e, se passarem, publica `firestore.rules` e
`firestore.indexes.json` no projeto **prod**.

1. Crie uma conta de serviço só para isso no projeto **prod**:
   [Google Cloud Console](https://console.cloud.google.com/iam-admin/serviceaccounts) (projeto prod) →
   *Criar conta de serviço* → nome `github-publicar-regras` → papéis:
   - **Firebase Rules Admin**
   - **Cloud Datastore Index Admin**
   - **Service Usage Consumer**

   Se o log do deploy acusar falta de permissão, acrescente o papel que ele indicar.
2. Na conta criada → *Chaves* → *Adicionar chave* → *JSON*. O arquivo é baixado.
3. No GitHub: **Settings → Secrets and variables → Actions → New repository secret**
   - Name: `FIREBASE_SERVICE_ACCOUNT_PROD`
   - Secret: cole **todo o conteúdo** do JSON.
4. Apague o arquivo JSON do seu computador.

Sem o secret, o job `publicar regras e índices (prod)` termina com um aviso e não publica nada.
Com o secret de outro projeto, o job falha antes de publicar.

Para publicar as regras em **dev** manualmente: `npx firebase login` e depois
`npx firebase deploy --only firestore:rules,firestore:indexes --project dev`.

## 4. Primeiro administrador e matriz

### 4.1 Pelo GitHub Actions (prod, sem instalar nada)

1. **Gerar a chave do Admin SDK:** Firebase Console (`siap-seds-01`) → *Configurações do projeto* →
   *Contas de serviço* → **Gerar nova chave privada**. Abra o JSON baixado no Bloco de Notas e copie tudo.
2. **Cadastrar o secret:** GitHub → repositório → **Settings → Secrets and variables → Actions** →
   *New repository secret* → Name `FIREBASE_SERVICE_ACCOUNT_ADMIN_PROD`, Secret: o JSON inteiro.
   Depois apague o arquivo baixado.
3. **Criar o usuário:** Firebase Console → *Authentication* → *Users* → **Add user** (e-mail e senha).
4. **Dar o perfil:** GitHub → **Actions** → *Administração (prod)* → **Run workflow** →
   ação `definir-perfil`, o e-mail e o perfil → *Run workflow*.
5. **Publicar a matriz:** mesmo caminho, ação `publicar-matriz` (marque *forcar* só para sobrescrever).
6. Entre no app. Se aparecer "Acesso não autorizado", clique em **Verificar novamente**.

O log de cada execução fica em *Actions*, e a auditoria registra `executor: github:<seu usuário>`.
O mesmo workflow serve para dar ou remover perfis dos membros da Comissão (`remover-perfil`).

### 4.2 Pelo terminal (exige Node.js 22 e o repositório clonado)

Os scripts usam o **Admin SDK** e leem a credencial da variável `FIREBASE_SERVICE_ACCOUNT`.

1. **Gerar a chave** (no projeto em que vai rodar): Firebase Console → *Configurações do projeto* →
   *Contas de serviço* → **Gerar nova chave privada**. Guarde o JSON **fora** do repositório.
2. **Criar o usuário:** *Authentication* → *Users* → **Add user** (e-mail e senha).
3. **Definir a variável** no terminal:
   - Linux/macOS (bash): `export FIREBASE_SERVICE_ACCOUNT="$(cat ~/chaves/siap-dev.json)"`
   - Windows (PowerShell): `$env:FIREBASE_SERVICE_ACCOUNT = Get-Content C:\chaves\siap-dev.json -Raw`
4. **Dar o perfil admin:**
   ```bash
   npm run set-role -- --projeto dev --email voce@seds.go.gov.br --perfil admin
   ```
5. **Publicar a matriz:**
   ```bash
   npm run seed:matriz -- --projeto dev
   ```
6. Entre no app. Se aparecer "Acesso não autorizado", clique em **Verificar novamente** (ou saia e
   entre de novo): o perfil vive no token de login, que precisa ser renovado.

Em **prod**, troque a chave pela do projeto prod e acrescente `--confirmar`:
```bash
npm run set-role -- --projeto prod --email voce@seds.go.gov.br --perfil admin --confirmar
npm run seed:matriz -- --projeto prod --confirmar
```

Outras opções:
- Perfis válidos: `admin`, `presidente`, `relator`, `membro`, `controle`.
- Remover o acesso: `npm run set-role -- --projeto dev --email pessoa@... --remover` (encerra as sessões).
- Republicar a matriz alterada: `npm run seed:matriz -- --projeto dev --forcar`.
- Cada execução registra um evento em `auditoria` (com quem executou); `set-role` também atualiza `usuarios/{uid}`.

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
