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
> **Não** cadastre `VITE_USAR_EMULADORES` na Vercel. A credencial do servidor
> (`FIREBASE_SERVICE_ACCOUNT`, **sem** `VITE_`) só entra na Vercel na Etapa 3, junto com a `/api`.

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

### 4.2 Pelo terminal (exige Node.js 20+ e o repositório clonado)

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

## 5. Desenvolvimento local com emuladores

```bash
npm run emuladores            # terminal 1 (exige Java 21+)
npm run dev                   # terminal 2, com VITE_USAR_EMULADORES=true no .env.local
```
O `.env.local` (copie de `.env.example`) usa os dados do projeto dev. Com os emuladores, os scripts
gravam neles, e não na nuvem, se você definir antes:
`FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` e `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`.
