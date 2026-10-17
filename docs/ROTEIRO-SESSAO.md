# Roteiro do dia da sessão da Comissão de Seleção

Passo a passo para a sessão de avaliação no SIAP (produção). Imprima ou deixe aberto em outra aba.
Quem faz cada passo está entre colchetes: **[presidente]**, **[relator]**, **[admin]**, **[telão]** (papéis da
reunião). No app há só dois perfis com login, **admin** e **presidente**, e os dois fazem tudo (só o admin
gerencia usuários): quem conduz e quem registra entram com uma conta de perfil admin ou presidente.

---

## Véspera (D-1)

1. **[admin]** Rode o **backup antes da sessão** pelo terminal (`npm run backup -- --projeto prod --confirmar`,
   com `BACKUP_SENHA` definida). Confira a contagem e o SHA-256 na saída e guarde o arquivo na rede da SEDS
   (seção 7 do [checklist](CHECKLIST-PRODUCAO.md)).
2. **[admin]** Confira os usuários em **Usuários** (`/usuarios`): quem vai operar o app com perfil **admin** ou
   **presidente** e conta ativa; cadastro antigo aparece como "Precisa de perfil". Os demais membros não precisam
   de login: entram na sessão só pelo nome.
3. **[admin]** Confira no painel do chamamento que todas as propostas da pauta existem, com **nº SEI** e
   **protocolo** corretos (o Caderno é consultado no SEI pelo nº; o app não guarda o PDF).
4. **[telão]** Teste o computador da sala: projetor, navegador atualizado (Chrome ou Edge), login do
   usuário do telão e a rota `/projecao/...` (passo 3 do "Dia").
5. **[todos]** Cada membro testa o próprio login (e-mail e senha). Esqueceu a senha: **"Primeiro acesso ou
   esqueci minha senha"** na tela de login, ou o admin reenvia em **Usuários → Gerenciar**.

## Dia da sessão

### 1. Logins (antes de abrir)
- Cada membro entra em **https://<endereço de produção>** com o próprio e-mail. Ninguém usa o login de outro:
  cada documento gravado guarda quem gravou por último (atualizadoPor: nome e e-mail) e quando.
- Se aparecer **"Acesso não autorizado"** ou "Seu acesso precisa ser atualizado pelo administrador", o admin dá
  o perfil em **Usuários**: a tela da pessoa atualiza sozinha, sem sair e entrar.

### 2. Abrir a sessão — [presidente]
1. Painel do chamamento → **Abrir sessão**: numa página só, a **data**, o(s) **lote(s) em pauta** (as propostas
   desses lotes são as analisadas hoje) e os **presentes**: nome e papel (presidente ou membro) de cada pessoa,
   com **Adicionar pessoa** e **Remover**. Exatamente um presidente e sem nomes repetidos.
2. Chegou ou saiu alguém: tela da sessão → **Alterar presentes**.
3. Impedimento de membro não é registrado no app: se houver, conste no texto da ata (passo 6).

### 3. Ligar o telão — [telão]
1. No computador do projetor, entre com o **usuário do telão** (perfil presidente; a projeção não tem nenhum
   controle de escrita).
2. Na tela da sessão, clique em **Abrir projeção (telão)** e depois em **Tela cheia** (F11 também serve).
3. O telão mostra o que o presidente ou o relator projetam. Sem foco, mostra a tela de espera.
4. **Nunca** use o computador do telão para registrar avaliações.

### 4. Ordem das telas para cada proposta — [relator] registra, [presidente] conduz
Siga as abas da proposta (cabeçalho com OSC, lote e **nº SEI com botão Copiar** para abrir o Caderno no SEI):

| # | Tela | O que fazer | Projetar no telão (botões e atalhos na tela da D1) |
|---|---|---|---|
| 1 | **Admissibilidade** | Admitida (sim/não), motivo se não, e páginas inicial e final de cada PA (a tela mostra a página de corte). Não admitida para aqui. | **Projetar admissibilidade** |
| 2 | **Dimensão 1** | Para cada subcritério: nível 0–4, justificativa e páginas citadas (numeração interna do PA). Salvar leva ao próximo pendente. Registrou errado? A lixeira do nível apaga o registro. | Cada subcritério; **Alt+→ / Alt+←** navega, **Alt+R** mostra o resumo |
| 3 | **Dimensão 2** | Experiências da OSC: categorias, modalidade, período, porte, documentos (aceitos e se comprovam execução satisfatória), desconsiderações por critério com justificativa. | **Projetar D2** |
| 4 | **Memória da D2** | Conferir o cálculo passo a passo com a Comissão. | (já projetada no passo 3) |
| 5 | **Resumo** | PA1…PA6, D1, D2, NF e status. Conferir antes de passar para a próxima proposta. | **Alt+R** |

Rodapé da tela da D1: **D1 parcial**, quantos subcritérios **faltam** e os status prévio e oficial.
O status oficial é o calculado pelo servidor.

### 5. Fechar o lote — [presidente]
1. Painel do chamamento → **Classificação do lote**.
2. Enquanto houver selo **"Classificação não definitiva"**, há proposta pendente ou empate sem decisão.
3. **Empate de NF**: o sistema aplica os critérios do Edital (I D1, II PA1, III PA2, IV PA5, V C2.1, VI C2.3)
   e mostra o selo **"Desempate pelo Edital (critério N)"**. Só se o empate persistir em todos eles a Comissão
   decide e o presidente registra a ordem e a **justificativa** em **Registrar desempate** (RF-27).
4. **Concluir** cada proposta (confirmação mostrando NF e status). Só conclui com a admissibilidade e, se admitida,
   os 28 níveis e justificativas. A conclusão pode ser desfeita (**Desfazer conclusão**, sem motivo), e qualquer
   alteração na avaliação também a desfaz: depois de corrigir, conclua de novo.
5. **Quadro-resumo (PDF/XLSX)** do lote e **Espelho (PDF)** de cada proposta (botão no cabeçalho da proposta).
   Documento com proposta não concluída sai com a marca **MINUTA**.

### 6. Ata e encerramento — [relator] e [presidente]
1. **[relator]** Tela da sessão → **Minuta de ata**: o texto vem dos registros (lotes, presentes com os papéis,
   propostas com a situação e a conclusão, desempates). Ajuste o texto e **Exportar PDF**.
   A edição não fica gravada no sistema: exporte antes de sair da página.
2. **[presidente]** **Encerrar sessão** (depois disso não se registram avaliações nela).
3. **[admin]** Rode o **backup depois da sessão** (o mesmo comando) e guarde o arquivo na rede da SEDS.
4. Guarde os PDFs (ata, espelhos, quadro) no processo SEI do chamamento.

---

## Se algo der errado

### Caiu a internet
- **O que acontece:** as telas continuam mostrando os últimos dados carregados, mas **nada é gravado**.
  Ao salvar, aparece **"Sem conexão com o servidor"**. O texto digitado continua no formulário.
- **O que fazer:**
  1. Não feche a aba nem recarregue a página (você perderia o que digitou).
  2. Anote em papel o subcritério, o nível, a decisão e a justificativa combinados.
  3. Quando a conexão voltar, clique em **Salvar** de novo e confira que o item ficou **preenchido** (●).
  4. Recarregue a página (F5) para ter certeza de que a tela mostra o que está gravado no servidor.
- **Plano B:** roteador do celular (hotspot) no computador do relator. O telão pode ficar parado:
  o que vale é o registro do relator.
- O SEI também depende da internet: tenha os Cadernos da pauta já abertos em abas, ou baixados no
  computador do relator, antes de começar.

### A sessão de login expirou ("Sessão expirada", "Faça login para continuar")
- O login dura até a pessoa sair, mas pode cair (senha alterada, conta desativada, navegador limpo).
- Clique em **Entrar novamente**, faça login e volte à tela. Antes, copie o texto da justificativa
  (Ctrl+A, Ctrl+C no campo) para não perdê-lo.
- **"Acesso não autorizado"** depois de entrar: o admin confere a pessoa em **Usuários** (perfil e conta
  ativa). A mudança vale na hora.

### A gravação foi recusada (mensagem vermelha)
- **"Operação não permitida"** (409) explica o motivo: nenhuma sessão aberta, proposta de lote fora da pauta,
  proposta não admitida, falta algo para concluir (admissibilidade, níveis ou justificativas). Corrija a causa e repita.
- **"Dados inválidos"** (400): o campo com problema fica destacado (justificativa curta, página acima do
  limite do PA, motivo da não admissão em branco…).

### O telão parou de atualizar
- Recarregue a página do telão (F5) e volte para tela cheia. O registro não é afetado.

### Erro de registro já gravado
- Corrija na própria tela: o novo registro substitui o anterior (o app guarda só quem alterou por último e
  quando). Se a proposta estava concluída, a alteração desfaz a conclusão: conclua de novo.
- Registro que não deveria existir: use a **lixeira** (nível, experiência, documento, proposta). Para descartar
  tudo o que foi feito numa sessão, exclua a sessão no painel do chamamento (a prévia mostra o que será apagado).

### Algo grave (dados apagados ou corrompidos)
- Pare a sessão e chame o admin. Os backups ficam na rede da SEDS (arquivos `.json.cifrado`).
  A restauração é feita **primeiro no dev** para conferência (README, seção "Backup e restauração").
