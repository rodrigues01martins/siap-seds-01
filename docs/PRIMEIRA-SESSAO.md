# Primeira sessão real — checklist

Use este roteiro **uma vez**, para sair dos dados de teste e fazer a primeira sessão real da Comissão.
Depois, para cada sessão, siga o [Roteiro da sessão](ROTEIRO-SESSAO.md). Itens de configuração (Vercel, Firebase,
regras) estão no [Checklist de produção](CHECKLIST-PRODUCAO.md).

Quem faz cada passo: **[admin]** (perfil administrador), **[presidente]**, **[relator]** (quem registra) e
**[telão]** (computador do projetor).

## 1. Uma semana antes — produção pronta [admin]

- [ ] [Checklist de produção](CHECKLIST-PRODUCAO.md) completo (variáveis da Vercel, Authentication, regras
      publicadas em prod, primeiro admin).
- [ ] Merge da `dev` na `main` com a versão que será usada e deploy de produção concluído.
- [ ] Backup do prod antes de qualquer limpeza: `npm run backup -- --projeto prod` (guarde o arquivo).

## 2. Começar do zero — Administração → Limpar base [admin]

- [ ] Entrar no endereço de **produção** com a conta de admin.
- [ ] **Administração → Limpar base**: conferir o destaque **Ambiente: PRODUÇÃO (siap-seds-01)**. Se aparecer
      DEV, você está no endereço errado.
- [ ] Ler a prévia (o que será apagado por coleção). Preservados: `matrizes/` e o seu cadastro.
- [ ] Remover os usuários de teste? Marque **Remover também os usuários** só se ninguém além de você deve
      continuar com acesso (todos os outros saem do Authentication e de `usuarios/`).
- [ ] Digitar **APAGAR TUDO** e clicar em **Limpar base**. Mensagem esperada: "Base limpa: … documentos apagados".
- [ ] Na mesma tela, **Matriz 2026: Atual** (se não, **Recarregar matriz**).
- [ ] A prévia agora mostra **Total 0**.

## 3. Cadastros reais [admin ou presidente]

- [ ] **Usuários → Novo usuário** para cada pessoa da Comissão (perfil **admin** ou **presidente**); cada uma
      recebe o e-mail para criar a senha. Pelo menos **dois administradores**.
- [ ] Usuário do **telão** (perfil presidente, senha guardada pela Comissão).
- [ ] **Novo chamamento**: número, título, processo SEI, **data limite das propostas** (usada na D2) e os lotes.
- [ ] **OSCs**: cada OSC com CNPJ válido.
- [ ] **Nova proposta** para cada Caderno: OSC, lote, protocolo e **nº SEI do Caderno**.
- [ ] Conferir no painel do chamamento: propostas por lote, todas "Pendente".

## 4. Ensaio rápido no dev (opcional, recomendado)

- [ ] `npm run ensaio -- --projeto dev`: dados fictícios no dev para o relator treinar a tela de avaliação
      (abas Admissão, D1, D2, Resultado; salvamento automático; "Projetar").
- [ ] Depois do ensaio, no **dev**: **Limpar base** (o destaque mostra DEV).

## 5. Dia da sessão — antes de abrir [presidente, relator, telão]

- [ ] Cada membro entra com o próprio e-mail (nada de login compartilhado).
- [ ] Computador do relator com internet estável e plano B (roteador do celular).
- [ ] Cadernos da pauta abertos no SEI (ou baixados) antes de começar.
- [ ] **[telão]** login do usuário do telão; o link do telão abre depois que a sessão for aberta.

## 6. Primeira sessão [presidente conduz, relator registra]

- [ ] **Início → Abrir sessão**: data, lote(s) em pauta e presentes (nome e papel; exatamente um presidente).
- [ ] Tela da sessão → **Abrir projeção (telão)** no computador do projetor (F11 para tela cheia).
- [ ] Para cada proposta da pauta, **Avaliar**:
  - [ ] Ligar **Projetar** no cabeçalho (o telão acompanha a aba e o subcritério).
  - [ ] **Admissão**: admitida sim/não, motivo (se não) e páginas de cada PA.
  - [ ] **D1**: os 28 subcritérios (nível, justificativa com o mínimo, páginas); "Ir para o próximo pendente".
  - [ ] **D2**: experiências direto na tabela, com os documentos.
  - [ ] Cabeçalho mostra **"Tudo salvo"** antes de passar para a próxima proposta.
  - [ ] **Resultado**: conferir D1, D2, NF, status e eliminatórias; **Concluir** quando não faltar nada.
- [ ] **Classificação** de cada lote: empate de NF resolvido pelos critérios do Edital; se persistir, registrar a
      decisão da Comissão com justificativa.

## 7. Encerramento [presidente]

- [ ] **Minuta de ata** (tela da sessão): conferir presentes, propostas e desempates; exportar o PDF.
- [ ] Espelho de cada proposta (aba Resultado → **Gerar espelho**) e quadro-resumo de cada lote.
- [ ] Documentos sem "MINUTA" só para propostas concluídas.
- [ ] **Encerrar sessão** e fazer o backup: `npm run backup -- --projeto prod`.
- [ ] Anotar problemas e sugestões em `docs/auditoria-design/pendencias.md`.
