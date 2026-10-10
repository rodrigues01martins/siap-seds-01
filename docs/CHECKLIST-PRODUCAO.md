# Checklist de produção

Marque cada item antes da primeira sessão real e repita os itens marcados com 🔁 em toda sessão.
Os passos detalhados estão no [README](../README.md) (seções 1 a 4).

## 1. Vercel — variáveis do ambiente **Production** (projeto prod `siap-seds-01`)

*Project → Settings → Environment Variables*, filtro **Production**:

- [ ] `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`,
      `VITE_FIREBASE_APP_ID` com os valores do app Web do projeto **prod** (e não os de dev).
- [ ] `FIREBASE_SERVICE_ACCOUNT` (tipo **Secret**) com o JSON da chave do Admin SDK do projeto **prod**.
- [ ] **Não existem** em Production: `VITE_USAR_EMULADORES`, `FIRESTORE_EMULATOR_HOST`,
      `FIREBASE_AUTH_EMULATOR_HOST`, `GCLOUD_PROJECT`. A `/api` se recusa a rodar com emuladores na Vercel,
      e o app ignora `VITE_USAR_EMULADORES` no build. Mesmo assim, apague-as se existirem.
- [ ] Nenhuma variável com segredo usa o prefixo `VITE_` (o que tem `VITE_` vai para o navegador).
- [ ] Depois de alterar variáveis: **Deployments → ⋯ → Redeploy** no deploy de produção.
- [ ] Abrir o endereço de produção: a tela de login aparece (sem a tela vermelha de configuração).
- [ ] Domínio de produção cadastrado no Firebase: *Authentication → Settings → Authorized domains*.

## 2. Firebase Authentication (prod)

- [ ] *Sign-in method*: **E-mail/senha** ativo; nenhum outro provedor.
- [ ] *Settings → User actions*: **desmarque "Enable create (sign-up)"**. Só o admin cria contas.
      Sem isso, qualquer pessoa com a chave pública cria uma conta (sem perfil ela não lê nada, mas
      não precisa existir).
- [ ] *Settings → User actions*: **"Email enumeration protection"** ativado.
- [ ] Remover usuários de teste (ex.: `teste@`, contas pessoais usadas no desenvolvimento).

## 3. Regras publicadas em prod (manual)

- [ ] Copiar `firestore.rules` para o console do Firebase: **primeiro no dev**, testar no Preview, **depois no
      prod** (README, seção 3). Repetir sempre que o arquivo mudar.
- [ ] Firebase Console (prod) → *Firestore → Regras*: o texto começa com
      `// Regras do Firestore — SIAP SEDS/GO 2026` e é igual ao da `main`.
- [ ] Nenhuma regra com `allow write: if true` ou `allow read: if true`: só leitura por perfil, escrita
      sempre negada (a escrita é só pela `/api`).

## 4. Matriz

- [ ] O app usa a matriz do código (`src/domain/matriz/matriz_2026.json`); nada a fazer no console.
- [ ] Opcional: registrar em `matrizes/2026` pelo terminal (`npm run seed:matriz -- --projeto prod --confirmar`).

## 5. Primeiro administrador, usuários e perfis reais

- [ ] **Primeiro admin** (README, seção 4): conta criada no *Authentication*, `ADMIN_INICIAL_EMAIL` na Vercel
      (Production) com esse e-mail, Redeploy, login e **Sou o administrador inicial**.
- [ ] Demais pessoas: *Authentication → Users → Add user* e depois, como admin, **Perfis de acesso** (`/perfis`).
- [ ] **admin**: quem cadastra chamamento, OSCs, propostas e perfis (de preferência não é membro da Comissão).
- [ ] **presidente**: 1 pessoa.
- [ ] **relator**: 1 pessoa (ou mais, conforme a portaria da Comissão).
- [ ] **membro**: demais membros da Comissão.
- [ ] **controle**: controle interno ou auditoria (só leitura, inclusive da trilha `/auditoria`).
- [ ] Conferir a lista em **Perfis de acesso** (`/perfis`) contra a portaria de designação da Comissão.
- [ ] Quem sai da Comissão: remover o perfil em **Perfis de acesso** (encerra as sessões abertas da pessoa).

## 6. Usuário do telão

- [ ] Criar um usuário só para o projetor (ex.: `telao.sessao@seds.go.gov.br`) com senha forte, guardada
      pela Comissão.
- [ ] Perfil **controle** (recomendado: lê tudo e não grava nada). O perfil **membro** também abre o telão,
      mas pode registrar níveis da D1 se alguém abrir a tela de avaliação com esse login.
- [ ] Testar no computador da sala: login → tela da sessão → **Abrir projeção (telão)** → **Tela cheia**.

## 7. Backup antes e depois de cada sessão 🔁

Pelo terminal, com a chave do Admin SDK do **prod** em `FIREBASE_SERVICE_ACCOUNT` (README, seção 7).

- [ ] Uma vez: escolher a **senha do backup** (20 ou mais caracteres aleatórios) e guardá-la no cofre de senhas
      da SEDS. Sem ela o backup não abre.
- [ ] 🔁 **Antes** da sessão: `$env:BACKUP_SENHA = '...'` e `npm run backup -- --projeto prod --confirmar`.
- [ ] 🔁 **Depois** da sessão: o mesmo comando.
- [ ] 🔁 Conferir a saída: contagem de documentos por coleção e o SHA-256.
- [ ] 🔁 Guardar o arquivo `backups/*.json.cifrado` em local institucional (rede da SEDS) e apagá-lo do computador.
- [ ] Uma vez, **antes da primeira sessão real**: testar a restauração no dev (README, "Restauração") e depois
      apagar do dev os dados restaurados.

## 8. Remoção de dados de teste 🔁

- [ ] **Prod**: nenhum chamamento, OSC ou proposta de teste. Em *Firestore → Data*, confira as coleções
      `chamamentos` e `oscs`. O script de ensaio **não roda em prod**; mesmo assim, procure ids `ensaio-` e
      nomes com `(ENSAIO)`. O app não exclui chamamentos nem propostas: se houver dado de teste em prod,
      apague-o **antes de cadastrar dados reais**, no Firebase Console (*Firestore → documento → Delete
      document*, marcando a exclusão das subcoleções). Exclusão pelo Console não entra na trilha de
      auditoria: registre-a no processo SEI e rode um backup em seguida.
- [ ] **Prod**: nenhum usuário de teste no Authentication (item 2).
- [ ] **Dev**: depois do ensaio, `npm run ensaio -- --projeto dev --remover`. Depois de testar uma restauração
      de prod no dev, apague o chamamento restaurado (o dev passa a ter dados reais).
- [ ] Nenhum arquivo de backup (`backups/`, `*.json.cifrado`) ou chave (`*.json` de conta de serviço) no
      repositório: o `.gitignore` já os bloqueia; confira com `git status` antes de cada commit.

## 9. Ensaio geral (no dev, antes da primeira sessão real)

- [ ] `npm run ensaio -- --projeto dev` (ou `--recriar`) e uma sessão simulada completa com o roteiro
      ([ROTEIRO-SESSAO.md](ROTEIRO-SESSAO.md)): abrir a sessão, avaliar a proposta pendente, registrar o
      desempate, homologar, gerar os PDFs, ata e encerramento.
- [ ] Simular a queda de internet (desligar o Wi-Fi) e a sessão expirada (sair e entrar) seguindo o roteiro.
- [ ] Remover o ensaio ao terminar.
