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
3. **Contas:** um usuário por papel, criado na tela **Usuários**, com as permissões do papel:

   | Papel | Permissões |
   |---|---|
   | Presidente | Consulta; Sessão (abrir/encerrar, conduzir); Homologar; Reabrir; Desempate |
   | Relator(a) | Consulta; Admissibilidade; Níveis da D1; Experiências da D2; Diligências; Conduzir sessão |
   | Telão | só Consulta (computador ligado ao projetor) |

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
  hoje. Todos estão presentes, mas um dos membros declarou impedimento por parentesco com dirigente de uma OSC.
  Deixe na pauta só as propostas do Lote L1."
- **Critério de sucesso:** sessão aberta com a data certa; todos presentes; o membro impedido com o motivo
  registrado; pauta só com as propostas do Lote L1.
- **Observe:** se a pessoa entende as 3 etapas do assistente, se encontra onde declarar o impedimento e se confere
  o resumo antes de abrir.

### T2 — Registrar a admissibilidade de uma proposta (relator; tempo-alvo: 4 min)

- **Instrução:** "Registre a admissibilidade da proposta do Instituto Alfa. Todos os requisitos foram atendidos. Os
  Planos de Ação começam na página 3 e vêm um depois do outro; o PA3 tem 2 páginas a mais do que o limite."
- **Critério de sucesso:** proposta registrada como **admitida**; o excesso do PA3 notado pela pessoa (ela comenta
  ou aponta o alerta de atenção).
- **Observe:** se o alerta de páginas acima do limite é percebido e entendido ("página de corte"), e se a pessoa
  sabe que o 28.1.VII é marcado sozinho pela tabela.

### T3 — Avaliar um subcritério da D1 e projetá-lo no telão (relator e presidente; tempo-alvo: 3 min)

- **Instrução:** "Na Dimensão 1 da mesma proposta, registre o subcritério 1.1 com nível 3, decidido por maioria,
  com o voto divergente de um membro que daria nível 2. Cite as páginas 2 e 5. Depois, mostre esse subcritério no
  telão."
- **Critério de sucesso:** registro salvo (nível 3, maioria, voto divergente, justificativa com o mínimo de
  caracteres e páginas 2 e 5) e o telão mostrando o 1.1 com o nível registrado destacado.
- **Observe:** se o descritor dos níveis é lido, se o botão **Salvar** do rodapé é encontrado, se a pessoa percebe
  que o sistema avançou para o próximo subcritério e se usa **Projetar** ou os atalhos.

### T4 — Cadastrar uma experiência da D2 e conferir a memória de cálculo (relator; tempo-alvo: 5 min)

- **Instrução:** "A OSC comprovou uma experiência de internação socioeducativa (categoria A), em parceria pelo
  MROSC, desde janeiro de 2019, com 60 vagas e um atestado de capacidade técnica aceito pela Comissão. Cadastre a
  experiência e diga quantos pontos ela rendeu no critério C2.1."
- **Critério de sucesso:** experiência cadastrada com o documento aceito, e a pessoa encontra na **Memória da D2**
  os pontos do C2.1.
- **Observe:** se o painel lateral é entendido, se "comprova execução satisfatória" e "aceito" ficam claros e se a
  linha do tempo e a memória são encontradas.

### T5 — Homologar a proposta e gerar a minuta da ata (presidente; tempo-alvo: 3 min)

- **Instrução:** "A Comissão concluiu a avaliação da Associação Beta. Homologue a proposta e gere a minuta da ata
  da sessão em PDF."
- **Critério de sucesso:** proposta **homologada** (selo "Homologada" na classificação) depois de conferir NF e
  status na confirmação, e o PDF da ata baixado.
- **Observe:** se a pessoa lê a NF e o status antes de confirmar, se entende que a homologação deixa tudo somente
  leitura e se encontra a ata a partir da sessão.

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
