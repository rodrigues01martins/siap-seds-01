# Testes de uso automatizados — tempos por perfil

Gerado por `tests/e2e/uso.spec.ts` (Playwright, Chromium, app local com a `/api` nos emuladores). O tempo é o da
máquina de teste, com digitação instantânea: serve para comparar versões e achar lentidão do sistema, não
para estimar o tempo de uma pessoa (veja `docs/TESTE-USABILIDADE.md`).

| Perfil | Tarefa | Resultado | Tempo total |
|---|---|---|---|
| relator | sessão → admissibilidade → 28 subcritérios → 3 experiências | concluído | 35,3 s |
| membro | registrar 3 níveis e conferir o que não pode fazer | concluído | 6,0 s |
| presidente | projetar → homologar → reabrir → ata → espelho | concluído | 4,2 s |
| controle | percorrer painel, sessão, admissibilidade, D1, D2, memória, diligências e classificação | concluído | 18,2 s |
| telão | trocar o foco 3 vezes e ver o telão acompanhar | concluído | 2,0 s |

## Etapas

### relator

| Etapa | Tempo |
|---|---|
| abrir a sessão (assistente em 3 etapas) | 3,1 s |
| registrar a admissibilidade | 1,6 s |
| avaliar os 28 subcritérios da D1 | 16,7 s |
| cadastrar 3 experiências da D2 | 13,9 s |

### membro

| Etapa | Tempo |
|---|---|
| registrar 3 níveis na D1 | 2,2 s |
| D2 sem ações de escrita | 1,3 s |
| classificação sem homologar nem reabrir | 1,3 s |
| sessão sem foco, presentes nem encerrar | 1,2 s |

### presidente

| Etapa | Tempo |
|---|---|
| projetar o subcritério 1.1 no telão | 0,8 s |
| homologar (confirmação com NF e status) | 0,8 s |
| reabrir com justificativa obrigatória | 0,3 s |
| gerar a minuta de ata (PDF) | 1,3 s |
| gerar o espelho da proposta (PDF) | 1,0 s |

### controle

| Etapa | Tempo |
|---|---|
| ler 8 telas sem nenhum botão de escrita | 17,8 s |
| histórico de alterações: hoje só do administrador | 0,4 s |

### telão

| Etapa | Tempo |
|---|---|
| subcritério 1.1 aparece no telão | 1,6 s |
| resumo aparece no telão | 0,2 s |
| D2 aparece no telão | 0,2 s |
