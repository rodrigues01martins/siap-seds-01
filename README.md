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
| `npm run tornar-admin -- --projeto dev --email ...` | Emergência: torna administrador uma conta (seção 4) |
| `npm run backup -- --projeto dev\|prod [--chamamento ID]` | Backup em JSON datado (seção 7) |
| `npm run restaurar -- --projeto dev --arquivo ...` | Restaura um backup **só no dev** (seção 7) |
| `npm run ensaio -- --projeto dev [--recriar\|--remover]` | Dados fictícios para ensaiar a sessão (seção 7) |
| `npm run remover-campos-correcao -- --projeto dev [--simular]` | Apaga índice de correção e data-base dos chamamentos antigos (seção 7) |

Primeira sessão real: [`docs/PRIMEIRA-SESSAO.md`](docs/PRIMEIRA-SESSAO.md). Dia da sessão: [`docs/ROTEIRO-SESSAO.md`](docs/ROTEIRO-SESSAO.md). Antes de usar em produção:
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

## 4. Usuários e acesso

Há dois perfis com login (decisão de 17/10/2026, Simplificação 1/4):

| Perfil | Pode |
|---|---|
| **Administrador** (`admin`) | tudo e a gestão de usuários e perfis na tela **Usuários** (`/usuarios`) |
| **Presidente** (`presidente`) | tudo, menos a gestão de usuários e perfis |

O acesso fica no documento `usuarios/{uid}` (`perfil` e `ativo`) e vale **na hora**: não é preciso sair e entrar,
nem mexer na Vercel. Cadastro do modelo anterior (permissões por área e papel relator/membro/controle, sem
`perfil`) fica **sem acesso** até o administrador dar um perfil: o login mostra "Seu acesso precisa ser atualizado
pelo administrador" e a página libera sozinha quando ele der o perfil. (Um administrador antigo, `admin: true`
sem `perfil`, continua administrador, para o projeto não ficar trancado.)

**Primeiro administrador** (uma vez por projeto, dev e prod):
1. O e-mail dele está no código, em [`api/_lib/adminsIniciais.ts`](api/_lib/adminsIniciais.ts).
2. Firebase Console → *Authentication* → *Users* → **Add user** com esse e-mail (e uma senha qualquer).
3. Entre no app com essa conta: ela vira administradora sozinha. Isso só acontece enquanto o projeto
   **não tiver nenhum administrador**; depois, novos administradores são definidos na tela Usuários.

**Novo usuário** (tela Usuários → **Novo usuário**): nome, e-mail e perfil (administrador ou presidente).
O app cria a conta no Authentication e o Firebase envia à pessoa o e-mail **"redefinir senha"**, com o link para
ela criar a própria senha. Na tela de login há também **"Primeiro acesso ou esqueci minha senha"**.
Personalize esse e-mail uma vez por projeto: Firebase Console → *Authentication* → *Templates* →
*Password reset* (ex.: assunto "SIAP SEDS — crie sua senha").

**Gerenciar** (tela Usuários → **Gerenciar**): mudar o perfil (administrador ou presidente; dar um perfil a um
cadastro antigo apaga os campos do modelo anterior), reenviar o e-mail de senha e **desativar** a conta (bloqueia o login e encerra as sessões). Ninguém tira o próprio acesso de administrador
nem desativa a própria conta.

**Opcional, pelo terminal** (exige Node.js 22, o repositório clonado e a chave do Admin SDK fora do repositório):
```powershell
$env:FIREBASE_SERVICE_ACCOUNT = Get-Content C:\chaves\siap-dev.json -Raw    # bash: export FIREBASE_SERVICE_ACCOUNT="$(cat ~/chaves/siap-dev.json)"
npm run tornar-admin -- --projeto dev --email pessoa@goias.gov.br          # emergência; prod: --projeto prod ... --confirmar
npm run seed:matriz -- --projeto dev                                           # registra a matriz em matrizes/2026
```
O app lê a matriz do código (`src/domain/matriz/matriz_2026.json`); `matrizes/2026` é só o registro publicado.

## 5. A `/api`: porta única de escrita

O navegador **nunca** grava no Firestore (as `firestore.rules` negam toda escrita de cliente). Toda gravação
passa por uma função `/api`, que:

1. confere o login (`Authorization: Bearer <ID token>`) → sem token ou token inválido/revogado: **401**;
2. confere o acesso em `usuarios/{uid}` (perfil admin ou presidente; conta ativa; gestão de usuários só admin) →
   sem acesso: **403** (cadastro antigo, sem perfil: "Seu acesso precisa ser atualizado pelo administrador.");
3. valida os dados (mensagens em português) → **400** `{ erro, campos }`; método errado → **405**;
4. grava numa transação; cada documento criado ou editado guarda só quem gravou por último e quando:
   `atualizadoPor: { nome, email }` e `atualizadoEm` (sem auditoria detalhada desde a Simplificação 2/4; os
   registros antigos de `auditoria/` ficam no Firestore, não são lidos pelo app e continuam no backup).
5. não há trava de homologação nem de exclusão: a proposta concluída aceita escrita, e alterar a avaliação desfaz
   a conclusão (`concluida = false`).

### Endpoints de cadastros e usuários

| Endpoint | Métodos | Corpo (JSON) | Permissão |
|---|---|---|---|
| `/api/chamamentos` | `POST` criar, `PATCH` editar | `{ numero, titulo, processoSei, dataLimitePropostas, justificativaMinima?, lotes: [{ codigo, descricao }] }` (`PATCH` com `id`) | admin ou presidente |
| `/api/oscs` | `POST` criar, `PATCH` editar | `{ cnpj, razaoSocial, nomeFantasia? }` — CNPJ numérico ou alfanumérico | admin ou presidente |
| `/api/propostas` | `POST` criar, `PATCH` editar | `{ chamamentoId, loteCodigo, oscCnpj, protocolo, numeroSEI, observacao? }` (`PATCH` com `propostaId`) | admin ou presidente |
| `/api/chamamentos`, `/api/oscs`, `/api/propostas` | `DELETE` excluir (em cascata) | `{ id }` (chamamento) · `{ id, lote }` (só o lote) · `{ cnpj }` · `{ chamamentoId, propostaId }` | admin ou presidente |
| `/api/chamamentos`, `/api/oscs`, `/api/propostas` | `GET` prévia da exclusão | os mesmos campos na URL + `simular=true` → `{ itens, total, resumo }` | admin ou presidente |
| `/api/usuarios` | `POST` novo usuário | `{ nome, email, perfil: 'admin' \| 'presidente' }` | administrador |
| `/api/usuarios` | `PATCH` alterar | `{ uid, nome?, perfil?, ativo? }` | administrador |
| `/api/usuarios` | `PUT` primeiro acesso | — | qualquer conta logada: cria o administrador inicial (seção 4); quem já tem cadastro recebe 200 |

> Os PDFs dos Cadernos **não** são carregados no app: a consulta é feita no SEI. O app guarda só o nº SEI
> (`numeroSEI`) e as páginas citadas.

- `dataLimitePropostas` (`AAAA-MM-DD`): referência da D2 (Anexo IV, 3.3.1, IV). Depois que alguma proposta do
  chamamento já tem totais calculados, não pode mais mudar → **409**.
- `justificativaMinima` (inteiro de 0 a 2.000, opcional): mínimo de caracteres da justificativa do nível (padrão 20).
- Não há índice de correção monetária nem data-base: os valores da D2 (2.3.3, valor anual) são informados pela
  Comissão **já atualizados conforme o Edital** (Anexo IV, 3.5.1, IV); a memória de cálculo e o espelho dizem isso.
  Enviar `indiceCorrecao` ou `dataBaseCorrecao` dá **400** ("Campo não permitido."). Para apagar esses campos de
  chamamentos antigos: `npm run remover-campos-correcao` (seção 7).

### Limpeza da base — começar do zero (só o admin)

`/api/admin/limpar-base` (tela **Administração → Limpar base**, `/admin/limpar-base`):

| Método | Corpo / consulta | O que faz |
|---|---|---|
| `GET` | `?simular=true` | prévia: documentos por coleção (subcoleções dos chamamentos somadas pelo nome), outros usuários, `projectId`, **ambiente** (`DEV` ou `PRODUÇÃO`) e se `matrizes/2026` está atual |
| `POST` | `{ acao: 'limpar', confirmacao: 'APAGAR TUDO', projectId, removerUsuarios? }` | apaga recursivamente todas as coleções da raiz (chamamentos com sessões, propostas e subcoleções; oscs; as obsoletas: auditoria, diligencias, permissoes…), **menos `matrizes/` e `usuarios/`**; com `removerUsuarios`, tira do Authentication e de `usuarios/` todos, menos o admin que executa; no fim, deixa a matriz atual. `projectId` diferente do servidor → **409** |
| `POST` | `{ acao: 'recarregar-matriz' }` | regrava `matrizes/2026` com `src/domain/matriz/matriz_2026.json` (assinatura SHA-256 em `origem.sha256`, a mesma do `seed:matriz`) |

- É a **única exclusão com digitação** (APAGAR TUDO), por apagar o sistema inteiro. A tela mostra o ambiente em
  destaque (PRODUÇÃO em vermelho). Faça backup antes (`npm run backup -- --projeto prod`).
- Interrompida (tempo da função: `maxDuration` de 60 s em `vercel.json`), basta repetir: o que já foi apagado não
  volta. Primeira sessão real: [`docs/PRIMEIRA-SESSAO.md`](docs/PRIMEIRA-SESSAO.md).

### Exclusão livre (admin ou presidente)

Sem justificativa, sem identificador digitado, sem status "excluindo" e sem exigir sessão aberta
(`api/_lib/cascata.ts`, com `recursiveDelete`):

| O que | Endpoint e corpo | O que mais é apagado |
|---|---|---|
| Chamamento | `DELETE /api/chamamentos { id }` | lotes, sessões, propostas (e tudo dentro delas) e desempates |
| Lote | `DELETE /api/chamamentos { id, lote }` | propostas e desempates do lote; o lote sai do chamamento e da pauta das sessões |
| OSC | `DELETE /api/oscs { cnpj }` | as propostas da OSC em todos os chamamentos |
| Proposta | `DELETE /api/propostas { chamamentoId, propostaId }` | admissibilidade, avaliações, experiências (com documentos) e resultado da D2 |
| Sessão | `DELETE /api/sessao { chamamentoId, sessaoId }` | tudo o que foi registrado com o `sessaoId` dela: admissibilidade, níveis, experiências e desempates |
| Experiência | `DELETE /api/experiencia { chamamentoId, propostaId, id }` | seus documentos |
| Documento | `DELETE /api/experiencia { chamamentoId, propostaId, id, documento }` (índice na lista) | — |
| Nível | `DELETE /api/avaliacao { chamamentoId, propostaId, codigo }` | — |

Os totais (D1, D2, NF e status) das propostas afetadas são recalculados (`recalcular.ts`) e a conclusão é desfeita.
Prévia: `GET` com os mesmos campos na URL e `simular=true` → `{ itens, total, resumo }`, por exemplo
`resumo: "1 proposta, 28 avaliações, 4 experiências"`. Repetir uma exclusão interrompida termina o serviço.

Na tela, cada item tem o **ícone de lixeira** (chamamentos, lotes, OSCs, propostas e sessões no painel, nível na D1,
experiência e documento na D2); um único ConfirmDialog destrutivo mostra "Serão apagados: …" e o botão **Excluir**.

### Endpoint da Etapa 4a (sessão da Comissão)

| Endpoint | Métodos | Corpo (JSON) | Permissão |
|---|---|---|---|
| `/api/sessao` | `POST` abrir | `{ chamamentoId, data, lotes: [loteCodigo], presentes: [{ nome, papel: 'presidente' \| 'membro' }] }` | admin ou presidente |
| `/api/sessao` | `PATCH` com `acao` | `{ chamamentoId, sessaoId, acao: 'presentes' \| 'foco' \| 'encerrar', ... }` | admin ou presidente |
| `/api/sessao` | `DELETE` excluir (em cascata) | `{ chamamentoId, sessaoId }` | admin ou presidente |
| `/api/sessao` | `GET` prévia da exclusão | `?chamamentoId=…&sessaoId=…&simular=true` → `{ itens, total, resumo }` | admin ou presidente |

- Sessão em `chamamentos/{ch}/sessoes/{id}`; **uma sessão aberta por chamamento** (abrir outra → **409**).
- Pauta = **lote(s)**: as propostas dos lotes em `lotes` (cada lote precisa existir no chamamento → **404**).
- Presentes são **só nomes** (sem login e sem declaração de impedimento): `{ nome, papel }`, com **exatamente um
  presidente** e sem nomes repetidos (comparados sem acento, caixa e espaços extras) → senão **400**.
  `foco` = `{ tipo, propostaId, subcriterio? }` de proposta da pauta e da matriz (ou `null`).
- Sessão encerrada não aceita alteração (**409**) e **a avaliação (C2) só é aceita em sessão aberta** (**409**).
- Os esquemas zod ficam em `src/esquemas/` e são os mesmos na `/api` e nos formulários do app.

O reset da sessão saiu na Simplificação 2/4 (dependia da auditoria detalhada para saber o estado anterior de cada
registro): para descartar o que foi feito numa sessão, exclua a sessão (apaga tudo o que foi registrado com ela).

### Endpoints da Etapa 3b (avaliação)

| Endpoint | Métodos | Corpo (JSON) | Permissão |
|---|---|---|---|
| `/api/avaliacao` | `PUT` registrar/alterar (salvamento automático: só o que mudou) | `{ chamamentoId, propostaId, sessaoId, codigo, nivel?: 0–4 \| null, justificativa?, paginas? }` | admin ou presidente |
| `/api/experiencia` | `POST` criar, `PATCH` editar | `{ chamamentoId, propostaId, sessaoId, descricao, categorias, modalidade, orgaoParceiro?, instrumento?, mrosc?, inicio, fim?, vagas?, unidades?, trabalhadores?, valorAnualCentavos?, documentos?: [{ tipo, numeroSEI, comprovaExecucaoSatisfatoria, aceito }], desconsideracoes?: [{ criterio, justificativa }] }` (`PATCH` com `id`) | admin ou presidente |
| `/api/concluir` | `POST` | `{ chamamentoId, propostaId, acao: 'concluir' \| 'desfazer' }` | admin ou presidente |

> **Sessão obrigatória:** nível da D1, admissibilidade, experiências da D2 e desempate só são aceitos com o
> `sessaoId` de uma sessão **aberta** do chamamento (e, exceto no desempate, com a proposta de um lote em pauta); senão **409**.
> O `sessaoId` fica no documento (base da exclusão da sessão em cascata). Exclusões não exigem sessão.

- **C2 — nível** (`.../propostas/{p}/avaliacoes/{codigo}`): `codigo` precisa existir na matriz; `nivel` inteiro
  de 0 a 4 (`null` desmarca); `paginas` (numeração interna do PA) não podem passar da página de corte do PA
  (Anexo III, 7.1); sem decisão (unanimidade/maioria) nem voto divergente (campos recusados: **400**).
  **Salvamento automático (Simplificação 3/4):** o `PUT` grava só o que vier (nível, justificativa e/ou páginas),
  mesclado ao que já está gravado; rascunho vale (justificativa curta é pendência, conferida ao concluir).
  Exige sessão aberta com o lote da proposta em pauta (**409**). Salvar **não** mexe no foco do telão.
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
- **C5 — conclusão** ("Homologar" virou "Concluir"): reversível e sem justificativa. Conclui só com a admissibilidade
  completa (motivo de 10+ caracteres, se não admitida; páginas dos 6 PAs, se admitida) e, se admitida, os 28 níveis
  e as 28 justificativas com o mínimo do chamamento (`src/domain/conclusao.ts`); senão **409** com o que falta. Não admitida conclui só com a admissibilidade. Grava `concluida`; qualquer alteração posterior na
  avaliação (C2, C3, admissibilidade, exclusões) volta a `concluida = false`.

As funções da Vercel rodam como ESM no Node, sem bundler: imports relativos em `api/` e `src/domain/` usam
a extensão `.js` (`'./d1.js'`, `'./matriz/index.js'`) e o JSON usa `with { type: 'json' }`. O teste
`api/_lib/esm.test.ts` falha se alguém esquecer.

No app, use `chamarApi` de `src/lib/api.ts`: ele anexa o ID token e devolve `ErroApi` com `status`, mensagem
e `campos` em português.

### Perfis e permissões

| Perfil | Pode |
|---|---|
| `admin` | tudo: cadastros, avaliação, sessão, resultado, exclusão **e** gestão de usuários e perfis |
| `presidente` | tudo, menos a gestão de usuários e perfis |

Os dois leem os dados (firestore.rules); ninguém escreve direto no Firestore. A fonte única no código é
`src/domain/permissoes.ts` (um teste garante que ela bate com esta tabela).

### Telas (Etapa 4a)

| Rota | Quem usa | O que faz |
|---|---|---|
| `/` | todos com acesso | sessão aberta em destaque (**Continuar**) ou **Abrir sessão**; abaixo, os chamamentos |
| `/chamamentos/:ch` | todos com acesso | painel: propostas por lote com status (pendente, apta, inapta, desclassificada, não admitida) e o selo "Concluída", sessões; lixeira em cada item |
| `/chamamentos/novo`, `/chamamentos/:ch/editar` | admin ou presidente | chamamento e lotes |
| `/chamamentos/:ch/propostas/nova`, `.../:p/editar` | admin ou presidente | proposta (OSC, lote, protocolo, nº SEI) |
| `/oscs` | admin ou presidente | OSCs, com máscara e validação de CNPJ |
| `/usuarios` | administrador | usuários, perfil (admin ou presidente), e-mail de senha e desativação |
| `/chamamentos/:ch/sessoes/nova` | admin ou presidente | abertura numa página só: data, lote(s) em pauta e presentes (nome e papel, "Adicionar pessoa", remoção com um clique) |
| `/sessao/:id?ch=` | admin ou presidente | presentes (alterar), pauta com o progresso de cada proposta ("D1 18/28 · D2 ok"), status e **Avaliar**; encerrar (com confirmação); o antigo `/chamamentos/:ch/sessoes/:s` redireciona |

### Admissibilidade (Anexo III, item 28)

| Endpoint | Método | Corpo (JSON) | Permissão |
|---|---|---|---|
| `/api/admissibilidade` | `PUT` | `{ chamamentoId, propostaId, sessaoId, admitida: boolean, motivo?, planos: [{ codigo, paginaInicial, paginaFinal }] }` | admin ou presidente |

- Simplificada (Simplificação 2/4): sem checklist 28.1 nem de formatação (28.5). **Admitida** (sim/não); **motivo**
  (10+ caracteres) se não admitida; páginas inicial/final de cada PA (se admitida). Com o salvamento automático
  (Simplificação 3/4) motivo e páginas em branco são gravados; a **conclusão** é que os exige.
- Página de corte de cada PA = página inicial + limite do PA (Anexo III, 7.1) − 1 (`apurarPlano`, `src/domain`);
  a tela alerta quando excede.
- Grava `propostas/{p}.admissibilidade = { admitida, motivo?, planos (com limite, páginas, página de corte e
  excedente), situacao: 'admitida' | 'nao_admitida', sessaoId }` e desfaz a conclusão.
  Proposta **não admitida não segue para avaliação**: C2 e C3 → **409**.

### Avaliação numa tela só (Simplificação 3/4)

| Rota | Escrita | O que faz |
|---|---|---|
| `/avaliar/:propostaId?ch=&aba=` | admin ou presidente (com sessão aberta e o lote da proposta em pauta) | a proposta inteira: abas **Admissão** \| **D1** \| **D2** \| **Resultado**; cabeçalho fixo com OSC, lote, nº SEI, progresso "x de 28", D1 e NF parciais, status, alerta de eliminatória, **Proposta anterior / próxima** da pauta e o interruptor **Projetar** |

- **Admissão:** admitida sim/não, motivo e uma linha por PA (página inicial e final, páginas, página de corte e excesso).
- **D1 (uma página):** seções recolhíveis PA1…PA6 com subtotal e progresso; cada subcritério numa linha — escala
  0–4 em botões (teclas **0–4** com o foco na escala), descritor do nível escolhido, **Ver elementos**, justificativa
  que cresce e páginas citadas; pendência por linha (nível ou justificativa) e **Ir para o próximo pendente**;
  lixeira do nível registrado.
- **D2:** tabela com edição direta na linha (adicionar, editar, excluir, desconsiderar por critério), documentos e
  demais campos na linha expansível; linha do tempo A/B.
- **Resultado:** totais por PA, D1, critérios da D2 com a memória resumida, NF, status, eliminatórias,
  **Concluir / Desfazer conclusão** (com o que falta) e **Gerar espelho**.
- **Salvamento automático:** sem botão Salvar. A tela muda na hora e grava em seguida (textos 800 ms depois da última
  tecla; níveis e caixas na hora), uma gravação por vez, com nova tentativa automática em falha de rede. Indicador
  no cabeçalho: "Salvando…", "Tudo salvo", "Erro ao salvar — Tentar de novo" ou "Não salvo: …" (campo incompleto,
  como experiência sem início ou página acima do corte). Aviso do navegador ao sair com gravação pendente.
- O chamamento vai na consulta (`?ch=`): o Firestore lê pelo caminho completo. Os endereços antigos
  (`…/propostas/:p/admissibilidade`, `/d1`, `/d2`, `/d2/memoria`) redirecionam para a aba correspondente.

Sem sessão aberta (ou com o lote fora da pauta), a tela fica só para consulta (as lixeiras continuam: exclusão livre).
Proposta concluída continua editável; a faixa da proposta avisa que alterar a avaliação desfaz a conclusão.

Leitura em tempo real (`onSnapshot`, `src/lib/firestore.ts`); escrita só por `chamarApi` (`src/lib/api.ts`).
O componente `FormularioApi` (`src/components/ui`) valida com o mesmo esquema da `/api` e põe os erros 400 da
`/api` nos mesmos campos (cadastros e sessão); a avaliação usa o salvamento automático.

### Resultado: classificação, desempate e conclusão (Etapa 6a)

| Endpoint | Método | Corpo (JSON) | Permissão |
|---|---|---|---|
| `/api/desempate` | `PUT` | `{ chamamentoId, sessaoId, loteCodigo, ordem: [propostaId, ...], justificativa }` | admin ou presidente |
| `/api/concluir` | `POST` | `{ chamamentoId, propostaId, acao: 'concluir' \| 'desfazer' }` | admin ou presidente |

- **Classificação** (`/chamamentos/:ch/lotes/:lote/classificacao`): `classificarLote` (src/domain/classificacao.ts)
  aplica `classificar()` aos totais gravados. Ranking por NF entre aptas e completas, com PA1…PA6, D1, D2, NF e
  status; inaptas, desclassificadas, não admitidas e pendentes ficam abaixo, sem posição, com o motivo do domínio.
  Selo **"classificação não definitiva"** enquanto houver pendente ou empate sem decisão.
- **Desempate (RF-27)**: empates de NF no mesmo lote são resolvidos pelos critérios do Edital, aplicados
  sucessivamente (maior valor vence): **I** D1 · **II** PA1 · **III** PA2 · **IV** PA5 · **V** Critério 2.1 ·
  **VI** Critério 2.3. A ordem e a fonte ficam em `matriz_2026.json` (`desempate`, `fonteDesempate`). A tela e o
  quadro-resumo mostram o selo **"Desempate pelo Edital (critério N)"**. Os totais gravados trazem `d2PorCriterio`
  (pontos de C2.1…C2.4); proposta com totais anteriores ao RF-27 não usa os critérios V e VI até o próximo recálculo.
- **Decisão da Comissão**: só quando os seis critérios não resolvem. A Comissão registra a ordem com justificativa
  (mín. 20 caracteres) em `chamamentos/{ch}/desempates/{id}`. A /api confere que as propostas formam exatamente um
  empate **residual** do lote (senão **409**); se o grupo ou a NF mudar depois, a decisão deixa de valer.
- **Concluir / Desfazer conclusão** na tela: "Concluir" abre um ConfirmDialog com NF e status (sem justificativa);
  o 409 da /api mostra o que falta (admissibilidade, níveis ou justificativas). "Desfazer conclusão" é direto.
  Concluída aparece com o selo **Concluída**; a reabertura com motivo, a trava de homologação e as diligências
  saíram na Simplificação 2/4.

### Relatórios (Etapa 6b)

Gerados **no navegador** (pdfmake e exceljs, carregados só ao clicar); nada é enviado a servidor e nada é gravado.
Os dados são lidos uma vez no momento de gerar, e o documento é montado por código puro em `src/relatorios/`.

| Documento | Onde | Formato |
|---|---|---|
| Espelho de avaliação da proposta | botão **Espelho (PDF)** no cabeçalho da proposta | PDF |
| Quadro-resumo do lote (a mesma tabela da classificação) | tela de classificação do lote | PDF e XLSX |
| Minuta de ata da sessão (texto editável antes de exportar) | **Minuta de ata** na tela da sessão (`/chamamentos/:ch/sessoes/:s/ata`) | PDF |

- **Espelho**: identificação (OSC, CNPJ, lote, nº SEI, protocolo, situação e se a avaliação está concluída),
  admissibilidade (admitida, motivo e páginas por PA com página de corte), os **28 subcritérios** com nível,
  justificativa e páginas citadas ("Não avaliado" quando falta), totais por PA, D1, memória da D2, NF e status.
- **Ata**: data, lote(s) em pauta, presentes com os papéis (presidente ou membro), propostas da pauta (com a
  situação e "(concluída)") e desempates; as assinaturas trazem nome e papel de cada presente. Quem gera ajusta o
  texto; a edição não é gravada.
- **Rodapé de todos os documentos**: gerado em (data e hora de Brasília), por quem (e-mail), versão da matriz e
  **código de verificação** = SHA-256 da serialização canônica (chaves em ordem alfabética, datas em ISO) dos dados
  usados. Mesmos dados → mesmo código; na ata, o texto final faz parte dos dados.
- **Marca d'água "MINUTA"**: em todo documento com proposta **não concluída** (o espelho da proposta, o quadro do
  lote ou a ata da pauta); proposta concluída sai como final.

### Modo projeção — telão da sala (Etapa 5)

- Rota **`/projecao/:ch/:sessaoId`** (o link "Abrir projeção (telão)" fica na tela da sessão).
  Somente leitura, sem menu e sem nenhuma ação; tema próprio de alto contraste (fundo branco, texto quase preto,
  nível registrado em azul de ação com o rótulo "Nível registrado"), tipografia display para leitura a 6 m e
  troca de foco com fade curto (desligado em "reduzir movimento"). Tela cheia: **F11** no navegador.
- Acompanha em tempo real (`onSnapshot`) o **foco da sessão** e mostra, conforme o tipo:
  `admissibilidade` (admitida, motivo e páginas por PA com excessos), `subcriterio` (escala com o nível
  registrado destacado, justificativa, páginas), `d2` (pontos por critério e memória resumida) ou
  `resumo` (PA1…PA6, D1, D2, NF e status). Sem foco: tela de espera com o nome do chamamento.
- Foco = `{ tipo: 'admissibilidade' | 'subcriterio' | 'd2' | 'resumo', propostaId, subcriterio? }`, alterado
  por admin ou presidente (`PATCH /api/sessao`, `acao: 'foco'`).
- Na tela de avaliação, com sessão aberta, o interruptor **Projetar** (cabeçalho) faz o telão acompanhar: o
  subcritério em que a Comissão mexe e a aba (Admissão → admissibilidade, D1 → subcritério, D2 → D2, Resultado →
  resumo). Desligado, nada muda no telão. A tela da sessão mostra "No telão".

**Login do telão.** O computador ligado ao projetor usa um usuário próprio, só para isso:
1. Na tela **Usuários → Novo usuário**, cadastre um usuário só para isso, por exemplo `telao@seds.go.gov.br`.
2. Dê o perfil **presidente** (não há perfil só de leitura). A projeção não tem nenhum controle de escrita;
   a senha fica guardada pela Comissão e o computador do telão só abre o link da projeção.
3. No computador da sala, entre com esse usuário e abra o link do telão.
Qualquer usuário com acesso consegue abrir a projeção; ninguém vê controles de escrita nela.

### Testar a `/api` localmente

```bash
npm run test:api     # sobe Auth + Firestore emulados, roda tests/api/** e derruba tudo
```
Os testes criam usuários com cada combinação de acesso no emulador, chamam as funções como a Vercel faria
(`Request` → `Response`) e conferem status, documento gravado (com `atualizadoPor`) e a cascata das exclusões.
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
- a árvore completa de cada chamamento (propostas, avaliações, experiências, memória da D2, sessões, desempates e,
  se houver, diligências antigas), as OSCs das propostas, a matriz e os registros antigos de auditoria desses
  documentos (o app não grava mais auditoria detalhada);
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
`--substituir`. Restaurar prod no dev copia dados
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

### Limpeza dos campos de correção monetária (Manutenção 1)

O chamamento não tem mais índice de correção nem data-base. Chamamentos gravados antes guardam esses campos;
eles não aparecem em nenhuma tela, mas podem ser apagados (os valores antigos são listados no terminal):

```bash
FIREBASE_SERVICE_ACCOUNT='{...}' npm run remover-campos-correcao -- --projeto dev --simular   # só lista
FIREBASE_SERVICE_ACCOUNT='{...}' npm run remover-campos-correcao -- --projeto dev             # apaga
FIREBASE_SERVICE_ACCOUNT='{...}' npm run remover-campos-correcao -- --projeto prod --simular  # conferir prod
FIREBASE_SERVICE_ACCOUNT='{...}' npm run remover-campos-correcao -- --projeto prod --confirmar
```

## 8. Interface: Sistema de Design SEDS

Fonte de verdade: [`docs/DESIGN-SYSTEM-SEDS.md`](docs/DESIGN-SYSTEM-SEDS.md). Componentes só usam tokens semânticos (nunca HEX).

| Peça | Onde |
|---|---|
| Tokens (primitivos, semânticos, componentes) | `src/styles/tokens.css`; tema do Tailwind em `src/index.css` |
| Componentes (botões, campos, feedback, overlays, DataTable, ícones, Brand, PageHeader) | `src/components/ui` (testes de cada componente ao lado) |
| Templates (AppShell, AuthPage, ListPage, FormPage, DetailPage, WizardPage, DashboardPage) | `src/components/templates` |
| Navegação por domínio (Sessão, Avaliação, Resultado, Cadastros, Administração) | `src/components/templates/navegacao.ts` |

### Mapa de telas

| Rota | Template | Tela |
|---|---|---|
| `/login` | AuthPage | entrada (e-mail e senha) |
| `/` | ListPage | início: sessão aberta em destaque (Continuar) ou Abrir sessão; chamamentos (busca e ordenação) |
| `/chamamentos/novo`, `/chamamentos/:ch/editar` | FormPage | chamamento e lotes |
| `/chamamentos/:ch` | DetailPage | painel: resumo, propostas por lote com status, sessões |
| `/chamamentos/:ch/propostas/nova`, `…/:p/editar` | FormPage | proposta (OSC, lote, protocolo, nº SEI) |
| `/chamamentos/:ch/sessoes/nova` | FormPage | abertura da sessão numa página: data, lote(s) e presentes |
| `/sessao/:id?ch=` | DetailPage | sessão: presentes (nome e papel), pauta com progresso, status e Avaliar, encerrar |
| `/chamamentos/:ch/sessoes/:s/ata` | FormPage | minuta de ata editável e PDF |
| `/avaliar/:propostaId?ch=&aba=` | DetailPage | proposta inteira: abas Admissão, D1 (uma página), D2 (edição na linha), Resultado; cabeçalho fixo; salvamento automático |
| `/chamamentos/:ch/lotes/:lote/classificacao` | ListPage | ranking, empates, concluir e desfazer conclusão, quadro-resumo PDF/XLSX |
| `/projecao/:ch/:s` | (layout próprio) | telão: alto contraste, sem menu nem ações |
| `/oscs` | ListPage | OSCs (painel lateral para cadastrar e editar) |
| `/usuarios` | ListPage | usuários e perfis (admin ou presidente) |
| `/admin/limpar-base` | DetailPage | limpar a base (só o admin): ambiente em destaque, prévia, remover usuários, APAGAR TUDO, recarregar matriz |
| qualquer outro endereço (ex.: `/ui`) | DetailPage | página "não encontrado", com o endereço pedido e o link para o início |

O catálogo de componentes (`/ui`) foi removido (Manutenção 2): a documentação de componentes fica fora do
repositório. Os componentes de `src/components/ui` continuam, com os testes de cada um (Testing Library), e a
referência visual é `docs/DESIGN-SYSTEM-SEDS.md`.

Testes de navegador (emuladores + Playwright + axe, WCAG 2.2 AA):

```bash
npm run test:e2e:baseline   # medição de todas as rotas (docs/auditoria-design/antes/)
npm run test:e2e:etapa3     # telas migradas: teclado, axe e screenshots (docs/auditoria-design/etapa-3/)
npm run test:e2e:etapa4     # telas operacionais: axe + screenshots e o fluxo completo (docs/auditoria-design/etapa-4/)
FASE_ETAPA4=antes npm run test:e2e:etapa4   # só screenshots, para comparar antes/depois
FASE_AUDITORIA=depois npm run test:e2e:baseline   # medição depois + comparativo com o antes (docs/auditoria-design/depois/)
npm run test:e2e:uso        # testes de uso por perfil (presidente, cadastro antigo, telão), com tempos
npm run test:e2e:acessibilidade   # teclado, foco visível, zoom 200% e erros anunciados em todas as rotas
npm run test:e2e:exclusao   # exclusão livre: lixeira, prévia, cascata (inclusive a sessão) e axe (docs/auditoria-design/exclusao/)
```

Resultados e decisões: [`docs/auditoria-design/README.md`](docs/auditoria-design/README.md) (antes × depois),
[`pendencias.md`](docs/auditoria-design/pendencias.md) (backlog por prioridade) e o roteiro de teste com usuários
reais em [`docs/TESTE-USABILIDADE.md`](docs/TESTE-USABILIDADE.md) (planilha: `docs/teste-usabilidade-resultados.xlsx`).

O fluxo completo (sessão → admissibilidade → D1 → D2 → classificação → conclusão) grava de verdade pela
`/api` nos emuladores: só nos testes de navegador, `vite.e2e.config.ts` monta as funções de `api/` no servidor
do Vite (`tests/e2e/apiNoVite.ts`). Nada disso entra no build nem na Vercel.

### Relatórios (PDF e XLSX)

Cabeçalho em toda página com a marca na hierarquia do Kit (Secretaria → Governo de Goiás) e o sistema; títulos
em azul institucional; tabelas com cabeçalho neutral.200 e linhas alternadas em neutral.100; rodapé com o código
de verificação. As cores (`CORES_DOCUMENTO`, `src/relatorios/documento.ts`) são lidas de `src/styles/tokens.css`:
nenhum HEX fora dos tokens (teste `tests/design/hex.test.ts`).
Fonte: Roboto embutida do pdfmake. **Gotham** só com os arquivos licenciados em `public/fonts/` (registrar em
`src/relatorios/pdf.ts` e trocar `FONTE_PDF`); nunca de fonte externa.

### Marcas (TODO)

O app só usa **arquivos oficiais** das marcas (Kit de Divulgação). Enquanto eles não existirem, a marca aparece
**em texto** ("SEDS | Governo de Goiás"; no login e no rodapé, "Secretaria de Estado de Desenvolvimento Social |
Governo de Goiás"), respeitando a hierarquia do Kit (… → Secretarias → Governo de Goiás).

- [ ] Colocar em `public/brand/` os arquivos oficiais da assinatura SEDS + Governo de Goiás, de preferência SVG:
      versão para fundo claro (`light`), para fundo escuro (`dark`) e monocromática (`monochrome`).
- [ ] Preencher `MARCAS` em `src/components/ui/Brand.tsx` com os caminhos (ex.: `light: '/brand/seds-governo-light.svg'`).
- [ ] Validar com a Comunicação da SEDS as cores derivadas do DS (§2 e §8).
