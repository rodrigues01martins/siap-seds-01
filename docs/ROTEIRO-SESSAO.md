# Roteiro do dia da sessão da Comissão de Seleção

Passo a passo para a sessão de avaliação no SIAP (produção). Imprima ou deixe aberto em outra aba.
Quem faz cada passo está entre colchetes: **[presidente]**, **[relator]**, **[admin]**, **[telão]**.

---

## Véspera (D-1)

1. **[admin]** Rode o **backup antes da sessão** pelo terminal (`npm run backup -- --projeto prod --confirmar`,
   com `BACKUP_SENHA` definida). Confira a contagem e o SHA-256 na saída e guarde o arquivo na rede da SEDS
   (seção 7 do [checklist](CHECKLIST-PRODUCAO.md)).
2. **[admin]** Confira os perfis: em **Perfis de acesso** (`/perfis`), cada membro com o perfil certo
   (presidente, relator, membro) e o usuário do telão (ver passo 4).
3. **[admin]** Confira no painel do chamamento que todas as propostas da pauta existem, com **nº SEI** e
   **protocolo** corretos (o Caderno é consultado no SEI pelo nº; o app não guarda o PDF).
4. **[telão]** Teste o computador da sala: projetor, navegador atualizado (Chrome ou Edge), login do
   usuário do telão e a rota `/projecao/...` (passo 3 do "Dia").
5. **[todos]** Cada membro testa o próprio login (e-mail e senha). Esqueceu a senha: o admin redefine no
   Firebase Console (*Authentication → Users → ⋯ → Reset password*).

## Dia da sessão

### 1. Logins (antes de abrir)
- Cada membro entra em **https://<endereço de produção>** com o próprio e-mail. Ninguém usa o login de outro:
  toda gravação fica na auditoria com o e-mail de quem gravou.
- Se aparecer **"Acesso não autorizado"**, clique em **Verificar novamente** (o perfil vive no login e
  precisa ser renovado). Persistindo, o admin confere o perfil em `/perfis`.

### 2. Abrir a sessão — [presidente]
1. Painel do chamamento → **Abrir sessão** → data e **pauta** (propostas que serão analisadas hoje).
2. Na tela da sessão → **Presentes e declarações de impedimento**: marque quem está presente e registre
   a declaração de cada um (sem impedimento ou impedido, com o motivo). O relator também pode fazer isso.
3. Membro **impedido** em uma proposta não participa da deliberação dela; registre o motivo.

### 3. Ligar o telão — [telão]
1. No computador do projetor, entre com o **usuário do telão** (perfil **controle** recomendado: só lê).
2. Na tela da sessão, clique em **Abrir projeção (telão)** e depois em **Tela cheia** (F11 também serve).
3. O telão mostra o que o presidente ou o relator projetam. Sem foco, mostra a tela de espera.
4. **Nunca** use o computador do telão para registrar avaliações.

### 4. Ordem das telas para cada proposta — [relator] registra, [presidente] conduz
Siga as abas da proposta (cabeçalho com OSC, lote e **nº SEI com botão Copiar** para abrir o Caderno no SEI):

| # | Tela | O que fazer | Projetar no telão (botões e atalhos na tela da D1) |
|---|---|---|---|
| 1 | **Admissibilidade** | Requisitos 28.1, páginas inicial e final de cada PA, irregularidades formais, resultado. Não admitida ou desclassificada para aqui. | **Projetar admissibilidade** |
| 2 | **Dimensão 1** | Para cada subcritério: nível 0–4, decisão (unanimidade ou maioria; se maioria, o voto divergente), justificativa e páginas citadas (numeração interna do PA). Salvar leva ao próximo pendente. | Cada subcritério; **Alt+→ / Alt+←** navega, **Alt+R** mostra o resumo |
| 3 | **Dimensão 2** | Experiências da OSC: categorias, modalidade, período, porte, documentos (aceitos e se comprovam execução satisfatória), desconsiderações por critério com justificativa. | **Projetar D2** |
| 4 | **Memória da D2** | Conferir o cálculo passo a passo com a Comissão. | (já projetada no passo 3) |
| 5 | **Resumo** | PA1…PA6, D1, D2, NF e status. Conferir antes de passar para a próxima proposta. | **Alt+R** |
| 6 | **Diligências** (se preciso) | Objeto e prazo. Não admite conteúdo técnico novo (Anexo III, 29.3). Proposta com diligência aberta **não é homologada**. | — |

Rodapé da tela da D1: **D1 parcial**, quantos subcritérios **faltam** e os status prévio e oficial.
O status oficial é o calculado pelo servidor.

### 5. Fechar o lote — [presidente]
1. Painel do chamamento → **Classificação do lote**.
2. Enquanto houver selo **"Classificação não definitiva"**, há proposta pendente ou empate sem decisão.
3. **Empate**: o sistema não desempata. A Comissão decide e o presidente registra a ordem e a
   **justificativa** em **Registrar desempate** (RF-27).
4. **Homologar** cada proposta (confirmação dupla: conferir NF e status). Homologada fica **somente leitura**.
   Erro material depois da homologação: **Reabrir** com o motivo (RF-18), corrigir e homologar de novo.
5. **Quadro-resumo (PDF/XLSX)** do lote e **Espelho (PDF)** de cada proposta (botão no cabeçalho da proposta).
   Documento com proposta não homologada sai com a marca **MINUTA**.

### 6. Ata e encerramento — [relator] e [presidente]
1. **[relator]** Tela da sessão → **Minuta de ata**: o texto vem dos registros (presentes, impedimentos,
   propostas, decisões por maioria, desempates e diligências). Ajuste o texto e **Exportar PDF**.
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
- O login dura até a pessoa sair, mas pode cair (senha alterada, perfil removido, navegador limpo).
- Clique em **Entrar novamente**, faça login e volte à tela. Antes, copie o texto da justificativa
  (Ctrl+A, Ctrl+C no campo) para não perdê-lo.
- **"Acesso não autorizado"** depois de entrar: **Verificar novamente**. Se o perfil foi mudado, o
  admin confere em `/perfis`.

### A gravação foi recusada (mensagem vermelha)
- **"Operação não permitida"** (409) explica o motivo: nenhuma sessão aberta, proposta fora da pauta,
  proposta homologada, diligência em aberto, proposta não admitida. Corrija a causa e repita.
- **"Dados inválidos"** (400): o campo com problema fica destacado (justificativa curta, página acima do
  limite do PA, voto divergente sem maioria…).

### O telão parou de atualizar
- Recarregue a página do telão (F5) e volte para tela cheia. O registro não é afetado.

### Erro de registro já gravado
- Antes da homologação: corrija na própria tela (o novo registro substitui o anterior e a auditoria
  guarda os dois).
- Depois da homologação: **Reabrir** (presidente, com motivo), corrigir, homologar de novo.

### Algo grave (dados apagados ou corrompidos)
- Pare a sessão e chame o admin. Os backups ficam na rede da SEDS (arquivos `.json.cifrado`).
  A restauração é feita **primeiro no dev** para conferência (README, seção "Backup e restauração").
