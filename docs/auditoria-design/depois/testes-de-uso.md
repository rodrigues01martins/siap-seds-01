# Testes de uso automatizados — tempos por perfil

Gerado por `tests/e2e/uso.spec.ts` (Playwright, Chromium, app local com a `/api` nos emuladores). O tempo é o da
máquina de teste, com digitação instantânea: serve para comparar versões e achar lentidão do sistema, não
para estimar o tempo de uma pessoa (veja `docs/TESTE-USABILIDADE.md`).

| Perfil | Tarefa | Resultado | Tempo total |
|---|---|---|---|
| presidente | sessão → admissibilidade → 28 subcritérios → 3 experiências | concluído | 35,2 s |
| presidente | projetar → homologar → reabrir → ata → espelho | concluído | 4,7 s |
| cadastro antigo | ver o aviso e ser liberado pelo admin (perfil presidente) | concluído | 3,3 s |
| telão | trocar o foco 3 vezes e ver o telão acompanhar | concluído | 1,5 s |

## Etapas

### presidente

| Etapa | Tempo |
|---|---|
| abrir a sessão (uma página: data, lote e presentes) | 2,7 s |
| registrar a admissibilidade | 1,6 s |
| avaliar os 28 subcritérios da D1 | 17,1 s |
| cadastrar 3 experiências da D2 | 13,9 s |

### presidente

| Etapa | Tempo |
|---|---|
| projetar o subcritério 1.1 no telão | 1,0 s |
| homologar (confirmação com NF e status) | 0,8 s |
| reabrir com justificativa obrigatória | 0,3 s |
| gerar a minuta de ata (PDF) | 1,6 s |
| gerar o espelho da proposta (PDF) | 1,0 s |

### cadastro antigo

| Etapa | Tempo |
|---|---|
| login mostra "Seu acesso precisa ser atualizado pelo administrador" | 1,2 s |
| admin dá o perfil presidente na tela Usuários | 2,1 s |
| a pessoa entra sem sair e entrar de novo | 0,0 s |

### telão

| Etapa | Tempo |
|---|---|
| subcritério 1.1 aparece no telão | 1,2 s |
| resumo aparece no telão | 0,2 s |
| D2 aparece no telão | 0,2 s |
