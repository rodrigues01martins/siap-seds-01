# Testes de uso automatizados — tempos por perfil

Gerado por `tests/e2e/uso.spec.ts` (Playwright, Chromium, app local com a `/api` nos emuladores). O tempo é o da
máquina de teste, com digitação instantânea: serve para comparar versões e achar lentidão do sistema, não
para estimar o tempo de uma pessoa (veja `docs/TESTE-USABILIDADE.md`).

| Perfil | Tarefa | Resultado | Tempo total |
|---|---|---|---|
| presidente | sessão → admissão → 28 subcritérios → 3 experiências (salvamento automático) | concluído | 29,5 s |
| presidente | projetar → concluir → desfazer conclusão → ata → espelho | concluído | 5,7 s |
| cadastro antigo | ver o aviso e ser liberado pelo admin (perfil presidente) | concluído | 4,0 s |
| telão | trocar o foco 3 vezes e ver o telão acompanhar | concluído | 4,4 s |

## Etapas

### presidente

| Etapa | Tempo |
|---|---|
| abrir a sessão (uma página: data, lote e presentes) | 2,7 s |
| registrar a admissão (sem botão Salvar) | 2,9 s |
| avaliar os 28 subcritérios da D1 (uma página, uma linha por subcritério) | 15,7 s |
| cadastrar 3 experiências da D2 (direto na tabela) | 8,2 s |

### presidente

| Etapa | Tempo |
|---|---|
| projetar o subcritério 1.1 no telão (interruptor "Projetar") | 1,9 s |
| concluir (confirmação com NF e status) | 0,8 s |
| desfazer a conclusão (sem justificativa) | 0,2 s |
| gerar a minuta de ata (PDF) | 1,6 s |
| gerar o espelho da proposta (PDF) | 1,1 s |

### cadastro antigo

| Etapa | Tempo |
|---|---|
| login mostra "Seu acesso precisa ser atualizado pelo administrador" | 1,7 s |
| admin dá o perfil presidente na tela Usuários | 2,3 s |
| a pessoa entra sem sair e entrar de novo | 0,0 s |

### telão

| Etapa | Tempo |
|---|---|
| subcritério 1.1 aparece no telão (a Comissão mexe na linha) | 2,6 s |
| resumo aparece no telão (aba Resultado) | 0,9 s |
| D2 aparece no telão (aba D2) | 0,9 s |
