# Roteiro de teste de usabilidade com usuários reais

Teste moderado, presencial ou por videochamada com tela compartilhada, com pessoas que vão usar o sistema na
sessão da Comissão de Seleção. O objetivo é **observar a pessoa usando**, não ensinar: quem modera não ajuda,
a não ser que a pessoa esteja travada há mais de 2 minutos (aí conta como "pedido de ajuda").

- **Planilha de resultados:** [`teste-usabilidade-resultados.xlsx`](teste-usabilidade-resultados.xlsx), com as abas
  Participantes, Tarefas, SUS (nota calculada) e Resumo (médias por tarefa e SUS médio).
  Para gerar de novo, em branco: `npx tsx scripts/planilha-usabilidade.ts`.
- As tarefas e as perguntas do SUS vêm de `scripts/lib/usabilidade.ts`; um teste confere que este roteiro bate com elas.

## 1. Preparação

1. **Quem:** 5 pessoas (com 5 participantes aparecem cerca de 85% dos problemas de uso), de preferência:
   presidente, relator(a) e membros da Comissão. Ninguém da equipe que construiu o sistema.
2. **Ambiente:** projeto **dev**, com os dados fictícios do ensaio, recriados antes de cada participante:
   `npm run ensaio -- --projeto dev --recriar`. Não use produção.
3. **Contas:** criadas na tela **Usuários** com o perfil **presidente** (o app tem só dois perfis, admin e
   presidente, e os dois fazem tudo; só o admin gerencia usuários). Uma conta para quem conduz, outra para quem
   registra e outra para o telão (computador ligado ao projetor). Na sessão, os presentes são só nomes.

4. **Material:** este roteiro impresso, a planilha aberta, um cronômetro e o telão (ou uma segunda janela).
5. **Consentimento:** explique o objetivo, que **o sistema está sendo testado, não a pessoa**, que ela pode parar
   quando quiser e, se for gravar a tela, peça autorização por escrito.

## 2. Roteiro da sessão (cerca de 40 minutos)

1. **Boas-vindas (3 min).** "Vou pedir algumas tarefas que a Comissão faz na sessão. Pense em voz alta: diga o que
   está procurando, o que espera que aconteça e o que achou estranho. Não existe resposta errada."
2. **Perfil (2 min).** Preencha a aba *Participantes*.
3. **Tarefas (25 min).** Leia a instrução de cada tarefa exatamente como está abaixo. Dispare o cronômetro quando
   terminar de ler e pare quando a pessoa disser "terminei" ou atingir o critério de sucesso.
4. **SUS (5 min).** Entregue o questionário (seção 4). A pessoa responde sozinha.
5. **Conversa final (5 min).** "O que foi mais fácil? O que foi mais difícil? O que mudaria antes da sessão real?"

### O que registrar em cada tarefa (aba *Tarefas*)

| Campo | Como preencher |
|---|---|
| Tempo (mm:ss) | do fim da leitura da instrução até concluir ou desistir |
| Sucesso | **sim** (cumpriu o critério sem ajuda), **parcial** (cumpriu com ajuda ou com erro corrigido) ou **não** |
| Erros (quantidade) | ações que desviam do caminho: clique na tela errada, campo errado, envio recusado pela validação |
| Pedidos de ajuda | vezes em que a pessoa perguntou ou que quem modera precisou intervir |
| Erros observados / Dúvidas | o que aconteceu, com as palavras da pessoa ("não achei onde...", "o que é página de corte?") |
| Severidade | **alta** (impede ou leva a registro errado), **média** (atrasa ou confunde), **baixa** (incômodo) |

## 3. Tarefas da sessão da Comissão

### T1 — Abrir a sessão da Comissão (presidente; tempo-alvo: 3 min)

- **Instrução ao participante:** "Hoje é a sessão de avaliação. Abra a sessão do chamamento de ensaio com a data de
  hoje e só o Lote L1 em pauta. Estão presentes: Ana Lima (presidente), Bruno Reis e Carla Dias (membros)."
- **Critério de sucesso:** sessão aberta com a data certa; só o Lote L1 em pauta; os três presentes com os papéis
  certos (exatamente um presidente).
- **Observe:** se a pessoa encontra "Adicionar pessoa", se escolhe o papel sem ajuda e se entende as mensagens
  de presidente único e de nome repetido.

### T2 — Registrar a admissibilidade de uma proposta (relator; tempo-alvo: 4 min)

- **Instrução:** "Registre a admissibilidade da proposta do Instituto Alfa: ela foi admitida. Os Planos de Ação
  começam na página 3 e vêm um depois do outro; o PA3 tem 2 páginas a mais do que o limite."
- **Critério de sucesso:** proposta registrada como **admitida** (sim); o excesso do PA3 notado pela pessoa (ela
  comenta ou aponta o alerta de atenção).
- **Observe:** se o alerta de páginas acima do limite é percebido e entendido ("página de corte") e se a pessoa
  confia no salvamento automático (indicador "Tudo salvo" no cabeçalho, sem botão Salvar).

### T3 — Avaliar um subcritério da D1 e projetá-lo no telão (relator e presidente; tempo-alvo: 3 min)

- **Instrução:** "Na Dimensão 1 da mesma proposta, registre o subcritério 1.1 com nível 3 e uma justificativa.
  Cite as páginas 2 e 5. Depois, mostre esse subcritério no telão."
- **Critério de sucesso:** registro salvo (nível 3, justificativa com o mínimo de caracteres e páginas 2 e 5) e o
  telão mostrando o 1.1 com o nível registrado destacado.
- **Observe:** se o descritor do nível escolhido é lido, se a pessoa percebe que não há botão Salvar (grava
  sozinho), se usa as teclas 0–4, "Ir para o próximo pendente" e o interruptor **Projetar**.

### T4 — Cadastrar uma experiência da D2 e conferir a memória de cálculo (relator; tempo-alvo: 5 min)

- **Instrução:** "A OSC comprovou uma experiência de internação socioeducativa (categoria A), em parceria pelo
  MROSC, desde janeiro de 2019, com 60 vagas e um atestado de capacidade técnica aceito pela Comissão. Cadastre a
  experiência e diga quantos pontos ela rendeu no critério C2.1."
- **Critério de sucesso:** experiência cadastrada na tabela com o documento aceito, e a pessoa encontra na aba
  **Resultado** os pontos do C2.1.
- **Observe:** se a edição direta na linha é entendida (e a linha expansível dos documentos), se "comprova execução
  satisfatória" e "aceito" ficam claros e se a linha do tempo e a memória são encontradas.

### T5 — Concluir a proposta e gerar a minuta da ata (presidente; tempo-alvo: 3 min)

- **Instrução:** "A Comissão terminou a avaliação da Associação Beta. Conclua a proposta e gere a minuta da ata
  da sessão em PDF."
- **Critério de sucesso:** proposta **concluída** (selo "Concluída" no cabeçalho da avaliação ou na classificação)
  depois de conferir NF e status, e o PDF da ata baixado.
- **Observe:** se a pessoa lê a NF e o status antes de confirmar, se entende que a conclusão pode ser desfeita (e
  que alterar a avaliação a desfaz) e se encontra a ata a partir da sessão.

## 4. Questionário SUS (System Usability Scale)

Responda de 1 a 5: **1 = discordo totalmente**, 2 = discordo, 3 = neutro, 4 = concordo, **5 = concordo totalmente**.

| # | Afirmação | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|---|
| 1 | Eu acho que gostaria de usar este sistema com frequência. | ☐ | ☐ | ☐ | ☐ | ☐ |
| 2 | Eu acho o sistema desnecessariamente complexo. | ☐ | ☐ | ☐ | ☐ | ☐ |
| 3 | Eu achei o sistema fácil de usar. | ☐ | ☐ | ☐ | ☐ | ☐ |
| 4 | Eu acho que precisaria de ajuda de uma pessoa com conhecimentos técnicos para usar o sistema. | ☐ | ☐ | ☐ | ☐ | ☐ |
| 5 | Eu acho que as várias funções do sistema estão muito bem integradas. | ☐ | ☐ | ☐ | ☐ | ☐ |
| 6 | Eu acho que o sistema apresenta muita inconsistência. | ☐ | ☐ | ☐ | ☐ | ☐ |
| 7 | Eu imagino que as pessoas aprenderão a usar este sistema rapidamente. | ☐ | ☐ | ☐ | ☐ | ☐ |
| 8 | Eu achei o sistema atrapalhado de usar. | ☐ | ☐ | ☐ | ☐ | ☐ |
| 9 | Eu me senti confiante ao usar o sistema. | ☐ | ☐ | ☐ | ☐ | ☐ |
| 10 | Eu precisei aprender várias coisas novas antes de conseguir usar o sistema. | ☐ | ☐ | ☐ | ☐ | ☐ |

**Cálculo (feito pela planilha):** perguntas ímpares valem *resposta − 1*; pares valem *5 − resposta*; a soma ×
2,5 dá a nota de 0 a 100. **Referência:** 68 é a média de mercado; acima de 80 é muito bom; abaixo de 50 indica
problemas sérios de uso.

## 5. Depois dos testes

1. Preencha a aba *Resumo* (as médias são automáticas) e leia as dúvidas de todos os participantes juntas.
2. Junte problemas parecidos e classifique pela severidade (alta, média, baixa).
3. Problemas de severidade **alta** são corrigidos antes da sessão real; os demais vão para
   [`auditoria-design/pendencias.md`](auditoria-design/pendencias.md).
4. **Meta para liberar o uso na sessão real:** taxa de sucesso ≥ 80% em cada tarefa, nenhum problema de severidade
   alta em aberto e SUS médio ≥ 68.
