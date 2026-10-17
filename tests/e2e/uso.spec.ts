// Testes de uso automatizados, como a Comissão trabalha na sessão — tudo pela interface, gravando pela /api
// nos emuladores (vite.e2e.config.ts). Dois perfis com login: admin e presidente (os dois fazem tudo; só o
// admin gerencia usuários). Cada fluxo é cronometrado por etapa e o resultado vai para
// docs/auditoria-design/depois/testes-de-uso.md.
// - presidente (avaliação): abre a sessão (uma página) e avalia a proposta numa tela só (/avaliar, salvamento
//   automático): admissão, os 28 subcritérios e 3 experiências;
// - presidente (resultado): projeta (interruptor "Projetar"), conclui a proposta, desfaz a conclusão (sem justificativa), gera a ata e o espelho;
// - cadastro antigo: vê "Seu acesso precisa ser atualizado pelo administrador"; o admin dá o perfil e libera na hora;
// - telão: a projeção acompanha o foco sem recarregar a página.
// Uso: npm run test:e2e:uso
import { expect, test, type Page } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { MATRIZ_2026 } from '../../src/domain/matriz'
import { comoPerfil, esperarSalvo, esperarTela, violacoesAxe } from './apoio'
import { CHAMAMENTOS_USO, PROPOSTA_USO, SENHA_E2E } from './perfis'

const PASTA = join('docs', 'auditoria-design', 'depois')
const SESSAO = 'uso-sessao'
const OSC = 'Associação Beta (ENSAIO)'
const ch = (fluxo: keyof typeof CHAMAMENTOS_USO) => `/chamamentos/${CHAMAMENTOS_USO[fluxo]}`
const avaliar = (fluxo: keyof typeof CHAMAMENTOS_USO, aba: string) => `/avaliar/${PROPOSTA_USO}?ch=${CHAMAMENTOS_USO[fluxo]}&aba=${aba}`
const sessao = (fluxo: keyof typeof CHAMAMENTOS_USO) => `/sessao/${SESSAO}?ch=${CHAMAMENTOS_USO[fluxo]}`

interface Fluxo {
  perfil: string
  tarefa: string
  etapas: { nome: string; ms: number }[]
  ok: boolean
}
const fluxos: Fluxo[] = []

/** Cronômetro de um fluxo: cada etapa registra o tempo desde a anterior. */
function cronometro(perfil: string, tarefa: string) {
  const fluxo: Fluxo = { perfil, tarefa, etapas: [], ok: false }
  fluxos.push(fluxo)
  let marco = Date.now()
  return {
    async etapa<T>(nome: string, acao: () => Promise<T>): Promise<T> {
      const resultado = await acao()
      fluxo.etapas.push({ nome, ms: Date.now() - marco })
      marco = Date.now()
      return resultado
    },
    concluir() {
      fluxo.ok = true
    },
  }
}

const escapar = (codigo: string) => codigo.replace('.', '\\.')

/** Uma linha da D1: nível, justificativa e páginas, sem botão Salvar (salvamento automático). */
async function avaliarSubcriterio(pagina: Page, codigo: string) {
  const linha = pagina.getByRole('listitem', { name: new RegExp(`^${escapar(codigo)} — `) })
  await linha.getByRole('radio', { name: 'Nível 3', exact: true }).click()
  await linha.getByRole('textbox', { name: new RegExp(`^Justificativa do ${escapar(codigo)}`) }).fill('Registro do teste de uso (E2E), nível 3 decidido pela Comissão.')
  await linha.getByRole('textbox', { name: new RegExp(`^Páginas citadas do ${escapar(codigo)}`) }).fill('1')
}

/** Experiência n direto na linha da tabela, com um documento aceito (linha expansível). */
async function novaExperiencia(pagina: Page, n: number) {
  await pagina.getByRole('button', { name: 'Adicionar experiência' }).click()
  await pagina.getByRole('textbox', { name: `Descrição da experiência ${n}` }).fill(`Experiência ${n} do teste de uso (E2E)`)
  await pagina.getByRole('checkbox', { name: `Categoria ${n === 2 ? 'B' : 'A'} da experiência ${n}` }).check()
  await pagina.getByRole('combobox', { name: `Modalidade da experiência ${n}` }).selectOption(n === 2 ? 'acolhimento' : 'internacao')
  await pagina.getByRole('checkbox', { name: `MROSC da experiência ${n}` }).check()
  await pagina.getByLabel(`Início da experiência ${n}`).fill(`201${n}-01-01`)
  await pagina.getByRole('spinbutton', { name: `Vagas da experiência ${n}` }).fill(String(20 * n))
  await esperarSalvo(pagina)
  await pagina.getByRole('button', { name: new RegExp(`^Detalhes e documentos \\(0\\) da experiência ${n}$`) }).click()
  await pagina.getByRole('button', { name: `Adicionar documento à experiência ${n}` }).click()
  await pagina.getByRole('textbox', { name: `Tipo do documento 1 da experiência ${n}` }).fill('Atestado de capacidade técnica')
  await pagina.getByRole('textbox', { name: `Nº SEI do documento 1 da experiência ${n}` }).fill(`0000012${n}`)
  await pagina.getByRole('checkbox', { name: `Comprova execução satisfatória (do documento 1 da experiência ${n})` }).check()
  await pagina.getByRole('checkbox', { name: `Aceito pela Comissão (do documento 1 da experiência ${n})` }).check()
  await esperarSalvo(pagina)
}

test.beforeAll(() => mkdirSync(PASTA, { recursive: true }))

test('presidente: abre a sessão e avalia a proposta numa tela só — admissão, 28 subcritérios e 3 experiências', async ({ browser, baseURL }) => {
  test.setTimeout(8 * 60_000)
  const pagina = await comoPerfil(browser, 'presidente', baseURL)
  const t = cronometro('presidente', 'sessão → admissão → 28 subcritérios → 3 experiências (salvamento automático)')

  await t.etapa('abrir a sessão (uma página: data, lote e presentes)', async () => {
    await pagina.goto(`${ch('avaliacao')}/sessoes/nova`)
    await pagina.getByLabel(/^Data da sessão/).fill('2026-11-10')
    await pagina.getByRole('checkbox', { name: /^Lote L1/ }).check()
    await pagina.getByRole('textbox', { name: /^Nome da pessoa 1/ }).fill('Presidência E2E')
    await pagina.getByRole('button', { name: 'Adicionar pessoa' }).click()
    await pagina.getByRole('textbox', { name: /^Nome da pessoa 2/ }).fill('Membro E2E A')
    await pagina.getByRole('button', { name: 'Abrir sessão' }).click()
    await expect(pagina.getByRole('heading', { level: 1, name: 'Sessão de 10/11/2026' })).toBeVisible()
  })

  await t.etapa('registrar a admissão (sem botão Salvar)', async () => {
    await pagina.goto(avaliar('avaliacao', 'admissao'))
    await pagina.getByRole('radio', { name: 'Sim, admitida' }).check()
    let inicio = 3
    for (const pa of MATRIZ_2026.dimensao1.planos) {
      await pagina.getByLabel(`Página inicial do ${pa.codigo}`).fill(String(inicio))
      await pagina.getByLabel(`Página final do ${pa.codigo}`).fill(String(inicio + pa.limitePaginas - 1))
      inicio += pa.limitePaginas
    }
    await esperarSalvo(pagina)
  })

  const cabecalho = pagina.getByRole('region', { name: 'Resumo da proposta' })
  await t.etapa('avaliar os 28 subcritérios da D1 (uma página, uma linha por subcritério)', async () => {
    await pagina.getByRole('tab', { name: /^D1/ }).click()
    await expect(cabecalho).toContainText('0 de 28 completos')
    for (const codigo of MATRIZ_2026.dimensao1.planos.flatMap((pa) => pa.subcriterios.map((s) => s.codigo))) await avaliarSubcriterio(pagina, codigo)
    await esperarSalvo(pagina)
    await expect(cabecalho).toContainText('28 de 28 completos')
    await expect(cabecalho).toContainText('D1 84 / 112')
  })

  await t.etapa('cadastrar 3 experiências da D2 (direto na tabela)', async () => {
    await pagina.getByRole('tab', { name: /^D2/ }).click()
    for (const n of [1, 2, 3]) await novaExperiencia(pagina, n)
    for (const n of [1, 2, 3]) await expect(pagina.getByRole('textbox', { name: `Descrição da experiência ${n}` })).toHaveValue(`Experiência ${n} do teste de uso (E2E)`)
    await expect(pagina.getByText(/D2 gravada: [1-9]/)).toBeVisible()
  })
  t.concluir()
})

test('presidente: projeta, conclui, desfaz a conclusão, gera a ata e o espelho', async ({ browser, baseURL }) => {
  test.setTimeout(5 * 60_000)
  const pagina = await comoPerfil(browser, 'presidente', baseURL)
  const t = cronometro('presidente', 'projetar → concluir → desfazer conclusão → ata → espelho')

  await t.etapa('projetar o subcritério 1.1 no telão (interruptor "Projetar")', async () => {
    await pagina.goto(avaliar('presidente', 'd1'))
    const projetado = pagina.waitForResponse((r) => r.url().includes('/api/sessao') && r.request().method() === 'PATCH')
    await pagina.getByRole('switch', { name: 'Projetar' }).click()
    await pagina.getByRole('listitem', { name: /^1\.1 — / }).getByRole('button', { name: /^Ver elementos/ }).click()
    expect((await projetado).ok()).toBe(true)
    await pagina.goto(sessao('presidente'))
    await expect(pagina.getByText(/subcritério 1\.1/)).toBeVisible()
  })

  const linha = pagina.getByRole('table', { name: 'Classificação do lote L1' }).getByRole('row').filter({ hasText: OSC })
  await t.etapa('concluir (confirmação com NF e status)', async () => {
    await pagina.goto(`${ch('presidente')}/lotes/L1/classificacao`)
    await linha.getByRole('button', { name: 'Concluir' }).click()
    const dialogo = pagina.getByRole('alertdialog', { name: /^Concluir/ })
    await expect(dialogo).toContainText('NF ')
    await dialogo.getByRole('button', { name: 'Concluir' }).click()
    await expect(dialogo).toBeHidden()
    await expect(linha).toContainText('Concluída')
  })

  await t.etapa('desfazer a conclusão (sem justificativa)', async () => {
    await linha.getByRole('button', { name: 'Desfazer conclusão' }).click()
    await expect(linha).not.toContainText('Concluída')
    await expect(linha.getByRole('button', { name: 'Concluir' })).toBeVisible()
  })

  await t.etapa('gerar a minuta de ata (PDF)', async () => {
    await pagina.goto(sessao('presidente'))
    await pagina.getByRole('link', { name: 'Minuta de ata' }).click()
    await expect(pagina.getByRole('textbox', { name: 'Texto da ata' })).not.toHaveValue('')
    const download = pagina.waitForEvent('download')
    await pagina.getByRole('button', { name: 'Exportar PDF' }).click()
    expect((await download).suggestedFilename()).toMatch(/^ata.*\.pdf$/)
  })

  await t.etapa('gerar o espelho da proposta (PDF)', async () => {
    await pagina.goto(avaliar('presidente', 'resultado'))
    const download = pagina.waitForEvent('download')
    await pagina.getByRole('button', { name: 'Gerar espelho' }).click()
    expect((await download).suggestedFilename()).toMatch(/^espelho.*\.pdf$/)
  })
  t.concluir()
})

test('cadastro antigo: acesso precisa ser atualizado; o admin dá o perfil e libera na hora', async ({ browser, baseURL }) => {
  const antigo = await (await browser.newContext({ baseURL, locale: 'pt-BR' })).newPage()
  const t = cronometro('cadastro antigo', 'ver o aviso e ser liberado pelo admin (perfil presidente)')

  await t.etapa('login mostra "Seu acesso precisa ser atualizado pelo administrador"', async () => {
    await antigo.goto('/login')
    await antigo.getByLabel('E-mail').fill('antigo@e2e.go.gov.br')
    await antigo.getByLabel('Senha').fill(SENHA_E2E)
    await antigo.getByRole('button', { name: 'Entrar' }).click()
    await expect(antigo.getByText(/Seu acesso precisa ser atualizado pelo administrador/)).toBeVisible({ timeout: 30_000 })
    expect(await violacoesAxe(antigo)).toEqual([])
  })

  const admin = await comoPerfil(browser, 'administrador', baseURL)
  await t.etapa('admin dá o perfil presidente na tela Usuários', async () => {
    await admin.goto('/usuarios')
    await esperarTela(admin)
    const linha = admin.getByRole('row').filter({ hasText: 'Cadastro antigo E2E' })
    await expect(linha).toContainText('Precisa de perfil')
    await linha.getByRole('button', { name: /^Gerenciar/ }).click()
    // O rádio reflete o cadastro gravado: marca quando a /api grava e o onSnapshot traz o perfil novo.
    const presidente = admin.getByRole('dialog', { name: 'Cadastro antigo E2E' }).getByRole('radio', { name: /^Presidente/ })
    await presidente.click()
    await expect(presidente).toBeChecked({ timeout: 30_000 })
    await expect(linha).toContainText('Presidente')
  })

  await t.etapa('a pessoa entra sem sair e entrar de novo', async () => {
    await expect(antigo.getByRole('banner')).toContainText('Cadastro antigo E2E', { timeout: 30_000 })
  })
  t.concluir()
})

test('telão: a projeção acompanha o foco sem recarregar a página', async ({ browser, baseURL }) => {
  const telao = await comoPerfil(browser, 'presidente', baseURL)
  const presidente = await comoPerfil(browser, 'administrador', baseURL)
  const t = cronometro('telão', 'trocar o foco 3 vezes e ver o telão acompanhar')

  await telao.goto(`/projecao/${CHAMAMENTOS_USO.telao}/${SESSAO}`)
  await expect(telao.getByText('Aguardando a Comissão definir o item em discussão')).toBeVisible()
  await telao.evaluate(() => ((window as unknown as { marcoE2E: string }).marcoE2E = 'sem recarregar'))
  await presidente.goto(avaliar('telao', 'd1'))
  await presidente.getByRole('switch', { name: 'Projetar' }).click()

  await t.etapa('subcritério 1.1 aparece no telão (a Comissão mexe na linha)', async () => {
    await presidente.getByRole('listitem', { name: /^1\.1 — / }).getByRole('button', { name: /^Ver elementos/ }).click()
    await expect(telao.getByRole('heading', { level: 2 })).toContainText('1.1 —')
  })
  await t.etapa('resumo aparece no telão (aba Resultado)', async () => {
    await presidente.getByRole('tab', { name: 'Resultado' }).click()
    await expect(telao.getByRole('heading', { level: 2, name: 'Resumo da proposta' })).toBeVisible()
  })
  await t.etapa('D2 aparece no telão (aba D2)', async () => {
    await presidente.getByRole('tab', { name: /^D2/ }).click()
    await expect(telao.getByRole('heading', { level: 2, name: /^Dimensão 2/ })).toBeVisible()
  })
  expect(await telao.evaluate(() => (window as unknown as { marcoE2E?: string }).marcoE2E)).toBe('sem recarregar')
  expect(await telao.evaluate(() => performance.getEntriesByType('navigation').length)).toBe(1)
  expect(await violacoesAxe(telao)).toEqual([])
  t.concluir()
})

const segundos = (ms: number) => `${(ms / 1000).toFixed(1).replace('.', ',')} s`

test.afterAll(() => {
  const linhas = [
    '# Testes de uso automatizados — tempos por perfil',
    '',
    'Gerado por `tests/e2e/uso.spec.ts` (Playwright, Chromium, app local com a `/api` nos emuladores). O tempo é o da',
    'máquina de teste, com digitação instantânea: serve para comparar versões e achar lentidão do sistema, não',
    'para estimar o tempo de uma pessoa (veja `docs/TESTE-USABILIDADE.md`).',
    '',
    '| Perfil | Tarefa | Resultado | Tempo total |',
    '|---|---|---|---|',
    ...fluxos.map((f) => `| ${f.perfil} | ${f.tarefa} | ${f.ok ? 'concluído' : '**falhou**'} | ${segundos(f.etapas.reduce((s, e) => s + e.ms, 0))} |`),
    '',
    '## Etapas',
    '',
    ...fluxos.flatMap((f) => [`### ${f.perfil}`, '', '| Etapa | Tempo |', '|---|---|', ...f.etapas.map((e) => `| ${e.nome} | ${segundos(e.ms)} |`), '']),
  ]
  writeFileSync(join(PASTA, 'testes-de-uso.md'), linhas.join('\n'))
})
