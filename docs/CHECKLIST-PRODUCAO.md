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

## 3. Regras e índices publicados em prod

- [ ] Secret `FIREBASE_SERVICE_ACCOUNT_PROD` cadastrado no GitHub (README, seção 3).
- [ ] Último push na `main`: job **publicar regras e índices (prod)** em verde (*Actions → CI*).
- [ ] Firebase Console (prod) → *Firestore → Rules*: a data de publicação é a do último merge e o texto
      começa com `// Regras do Firestore — SIAP SEDS/GO 2026`.
- [ ] Nenhuma regra com `allow write: if true` ou `allow read: if true`: só leitura por perfil, escrita
      sempre negada (a escrita é só pela `/api`).

## 4. Matriz semeada em prod

- [ ] *Actions → Administração (prod) → Run workflow* → `publicar-matriz`.
- [ ] Firestore (prod) → `matrizes/2026` existe; o campo `origem.sha256` confere com o log do workflow.
- [ ] Se a matriz mudar depois: republicar com *forcar* **antes** de qualquer avaliação.

## 5. Usuários e perfis reais

Para cada pessoa: *Authentication → Users → Add user* e depois *Actions → Administração (prod)* →
`definir-perfil`.

- [ ] **admin**: quem cadastra chamamento, OSCs, propostas e perfis (de preferência não é membro da Comissão).
- [ ] **presidente**: 1 pessoa.
- [ ] **relator**: 1 pessoa (ou mais, conforme a portaria da Comissão).
- [ ] **membro**: demais membros da Comissão.
- [ ] **controle**: controle interno ou auditoria (só leitura, inclusive da trilha `/auditoria`).
- [ ] Conferir a lista em **Perfis de acesso** (`/perfis`) contra a portaria de designação da Comissão.
- [ ] Quem sai da Comissão: `remover-perfil` (encerra as sessões abertas da pessoa).

## 6. Usuário do telão

- [ ] Criar um usuário só para o projetor (ex.: `telao.sessao@seds.go.gov.br`) com senha forte, guardada
      pela Comissão.
- [ ] Perfil **controle** (recomendado: lê tudo e não grava nada). O perfil **membro** também abre o telão,
      mas pode registrar níveis da D1 se alguém abrir a tela de avaliação com esse login.
- [ ] Testar no computador da sala: login → tela da sessão → **Abrir projeção (telão)** → **Tela cheia**.

## 7. Backup antes e depois de cada sessão 🔁

O repositório é **público**, então o backup só sai **cifrado**.

- [ ] Uma vez: secret **`BACKUP_SENHA`** no GitHub (*Settings → Secrets and variables → Actions*), com
      **20 ou mais caracteres** aleatórios. Guarde a senha também fora do GitHub (cofre de senhas da SEDS):
      sem ela o backup não abre.
- [ ] 🔁 **Antes** da sessão: *Actions → Backup do Firestore (prod) → Run workflow* → momento `antes-da-sessao`.
- [ ] 🔁 **Depois** da sessão: o mesmo workflow, com momento `depois-da-sessao`.
- [ ] 🔁 Conferir o log de cada execução: contagem de documentos por coleção e o SHA-256.
- [ ] 🔁 Baixar o artifact (`.zip` com o arquivo `.json.cifrado`) e guardar em local institucional
      (rede da SEDS), porque o GitHub apaga o artifact após o prazo de retenção (até 90 dias).
- [ ] Uma vez, **antes da primeira sessão real**: testar a restauração no dev (README, "Backup e
      restauração") e depois apagar do dev os dados restaurados.

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
