// Testes de uso automatizados, um por perfil, como a Comissão trabalha na sessão — tudo pela interface,
// gravando pela /api nos emuladores (vite.e2e.config.ts). Cada fluxo é cronometrado por etapa e o resultado
// vai para docs/auditoria-design/depois/testes-de-uso.md.
// - relator: abre a sessão, registra a admissibilidade, avalia os 28 subcritérios e cadastra 3 experiências;
// - membro: registra níveis; não vê ações da D2 nem de homologação;
// - presidente: projeta, homologa, reabre com justificativa, gera a ata e o espelho;
// - controle: só leitura (e a trilha de auditoria, que hoje é só do administrador — ver pendencias.md);
// - telão: a projeção acompanha o foco sem recarregar a página.
// Uso: npm run test:e2e:uso
import { expect, test, type Page } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { MATRIZ_2026 } from '../../src/domain/matriz'
import { comoPerfil, esperarTela, violacoesAxe } from './apoio'
import { CHAMAMENTOS_USO, PROPOSTA_USO } from './perfis'

const PASTA = join('docs', 'auditoria-design', 'depois')
const SESSAO = 'uso-sessao'
const OSC = 'Associação Beta (ENSAIO)'
const ch = (fluxo: keyof typeof CHAMAMENTOS_USO) => `/chamamentos/${CHAMAMENTOS_USO[fluxo]}`
const proposta = (fluxo: keyof typeof CHAMAMENTOS_USO) => `${ch(fluxo)}/propostas/${PROPOSTA_USO}`

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

/** Botões que gravam algo: nenhum pode aparecer para quem só lê. */
const ESCRITA = /^(Nova experiência|Editar|Excluir|Desconsiderar|Homologar|Reabrir|Salvar|Registrar|Encerrar sessão|Definir foco|Abrir sessão$|Nova proposta|Editar chamamento|Nova diligência|Alterar presentes)/

async function botoesDeEscrita(pagina: Page): Promise<string[]> {
  const nomes = await pagina.getByRole('button').evaluateAll((botoes) => botoes.map((b) => (b.getAttribute('aria-label') ?? b.textContent ?? '').trim()))
  const links = await pagina.getByRole('link').evaluateAll((ls) => ls.map((l) => (l.getAttribute('aria-label') ?? l.textContent ?? '').trim()))
  return [...nomes, ...links].filter((n) => ESCRITA.test(n))
}

async function avaliarSubcriterio(pagina: Page, faltam: number) {
  const resumo = pagina.getByRole('region', { name: 'Resumo da D1' })
  await pagina.getByRole('radio', { name: 'Nível 3', exact: true }).check()
  await pagina.getByRole('radio', { name: 'Unanimidade' }).check()
  await pagina.getByRole('textbox', { name: /^Justificativa/ }).fill('Registro do teste de uso (E2E), nível 3 por unanimidade.')
  await pagina.getByRole('textbox', { name: 'Páginas citadas' }).fill('1')
  await resumo.getByRole('button', { name: /^Salvar avaliação/ }).click()
  await expect(resumo).toContainText(`Faltam ${faltam - 1} de`)
}

async function novaExperiencia(pagina: Page, n: number) {
  await pagina.getByRole('button', { name: 'Nova experiência' }).click()
  const painel = pagina.getByRole('dialog', { name: 'Nova experiência' })
  await painel.getByRole('textbox', { name: 'Descrição' }).fill(`Experiência ${n} do teste de uso (E2E)`)
  await painel.getByRole('checkbox', { name: n === 2 ? /^Categoria B —/ : /^Categoria A —/ }).check()
  await painel.getByLabel('Modalidade').selectOption(n === 2 ? 'acolhimento' : 'internacao')
  await painel.getByRole('checkbox', { name: /^Parceria regida pelo MROSC/ }).check()
  await painel.getByLabel('Início').fill(`201${n}-01-01`)
  await painel.getByRole('spinbutton', { name: 'Vagas' }).fill(String(20 * n))
  await painel.getByRole('button', { name: 'Adicionar documento' }).click()
  await painel.getByRole('textbox', { name: 'Tipo do documento 1' }).fill('Atestado de capacidade técnica')
  await painel.getByRole('textbox', { name: 'Nº SEI do documento 1' }).fill(`0000012${n}`)
  await painel.getByRole('checkbox', { name: /^Documento 1 comprova/ }).check()
  await painel.getByRole('checkbox', { name: /^Documento 1 aceito/ }).check()
  await painel.getByRole('button', { name: 'Salvar experiência' }).click()
  await expect(painel).toBeHidden()
}

test.beforeAll(() => mkdirSync(PASTA, { recursive: true }))

test('relator: abre a sessão, registra a admissibilidade, avalia os 28 subcritérios e cadastra 3 experiências', async ({ browser, baseURL }) => {
  test.setTimeout(8 * 60_000)
  const pagina = await comoPerfil(browser, 'relator', baseURL)
  const t = cronometro('relator', 'sessão → admissibilidade → 28 subcritérios → 3 experiências')

  await t.etapa('abrir a sessão (assistente em 3 etapas)', async () => {
    await pagina.goto(`${ch('relator')}/sessoes/nova`)
    await pagina.getByLabel(/^Data da sessão/).fill('2026-11-10')
    await pagina.getByRole('button', { name: 'Avançar' }).click()
    await pagina.getByRole('button', { name: 'Avançar' }).click()
    await pagina.getByRole('button', { name: 'Abrir sessão' }).click()
    await expect(pagina.getByRole('heading', { level: 1, name: 'Sessão de 10/11/2026' })).toBeVisible()
  })

  await t.etapa('registrar a admissibilidade', async () => {
    await pagina.goto(`${proposta('relator')}/admissibilidade`)
    for (const r of MATRIZ_2026.admissibilidade.requisitosEssenciais) {
      if (r.codigo !== MATRIZ_2026.admissibilidade.requisitoPlanos) await pagina.getByRole('checkbox', { name: `${r.codigo} — ${r.descricao}` }).check()
    }
    let inicio = 3
    for (const pa of MATRIZ_2026.dimensao1.planos) {
      await pagina.getByLabel(`Página inicial do ${pa.codigo}`).fill(String(inicio))
      await pagina.getByLabel(`Página final do ${pa.codigo}`).fill(String(inicio + pa.limitePaginas - 1))
      inicio += pa.limitePaginas
    }
    await pagina.getByRole('radio', { name: 'Admitida', exact: true }).check()
    await pagina.getByRole('button', { name: 'Registrar admissibilidade' }).click()
    await expect(pagina.getByRole('status').filter({ hasText: 'Situação registrada: Admitida' })).toBeVisible()
  })

  await t.etapa('avaliar os 28 subcritérios da D1', async () => {
    await pagina.goto(`${proposta('relator')}/d1`)
    await expect(pagina.getByRole('region', { name: 'Resumo da D1' })).toContainText('Faltam 28')
    for (let faltam = 28; faltam > 0; faltam--) await avaliarSubcriterio(pagina, faltam)
    await expect(pagina.getByRole('region', { name: 'Resumo da D1' })).toContainText('D1 parcial: 84')
  })

  await t.etapa('cadastrar 3 experiências da D2', async () => {
    await pagina.goto(`${proposta('relator')}/d2`)
    for (const n of [1, 2, 3]) await novaExperiencia(pagina, n)
    const tabela = pagina.getByRole('table', { name: 'Experiências da OSC' })
    for (const n of [1, 2, 3]) await expect(tabela).toContainText(`Experiência ${n} do teste de uso (E2E)`)
    await expect(pagina.getByText(/D2 gravada pela \/api: [1-9]/)).toBeVisible()
  })
  t.concluir()
})

test('membro: registra níveis; não vê ações da D2 nem de homologação', async ({ browser, baseURL }) => {
  const pagina = await comoPerfil(browser, 'membro', baseURL)
  const t = cronometro('membro', 'registrar 3 níveis e conferir o que não pode fazer')

  await t.etapa('registrar 3 níveis na D1', async () => {
    await pagina.goto(`${proposta('membro')}/d1`)
    await expect(pagina.getByRole('region', { name: 'Resumo da D1' })).toContainText('Faltam 28')
    for (const faltam of [28, 27, 26]) await avaliarSubcriterio(pagina, faltam)
  })

  await t.etapa('D2 sem ações de escrita', async () => {
    await pagina.goto(`${proposta('membro')}/d2`)
    await esperarTela(pagina)
    await expect(pagina.getByRole('status').filter({ hasText: 'Somente leitura' })).toBeVisible()
    expect(await botoesDeEscrita(pagina)).toEqual([])
  })

  await t.etapa('classificação sem homologar nem reabrir', async () => {
    await pagina.goto(`${ch('membro')}/lotes/L1/classificacao`)
    await esperarTela(pagina)
    await expect(pagina.getByRole('heading', { level: 1, name: 'Classificação — Lote L1' })).toBeVisible()
    expect(await botoesDeEscrita(pagina)).toEqual([])
  })

  await t.etapa('sessão sem foco, presentes nem encerrar', async () => {
    await pagina.goto(`${ch('membro')}/sessoes/${SESSAO}`)
    await esperarTela(pagina)
    expect(await botoesDeEscrita(pagina)).toEqual([])
  })
  t.concluir()
})

test('presidente: projeta, homologa, reabre com justificativa, gera a ata e o espelho', async ({ browser, baseURL }) => {
  test.setTimeout(5 * 60_000)
  const pagina = await comoPerfil(browser, 'presidente', baseURL)
  const t = cronometro('presidente', 'projetar → homologar → reabrir → ata → espelho')

  await t.etapa('projetar o subcritério 1.1 no telão', async () => {
    await pagina.goto(`${proposta('presidente')}/d1`)
    await pagina.getByRole('button', { name: 'Projetar 1.1' }).click()
    await expect(pagina.getByRole('status', { name: 'Projetando agora' })).toContainText('Subcritério 1.1')
  })

  const linha = pagina.getByRole('table', { name: 'Classificação do lote L1' }).getByRole('row').filter({ hasText: OSC })
  await t.etapa('homologar (confirmação com NF e status)', async () => {
    await pagina.goto(`${ch('presidente')}/lotes/L1/classificacao`)
    await linha.getByRole('button', { name: 'Homologar' }).click()
    const dialogo = pagina.getByRole('alertdialog', { name: /^Homologar/ })
    await expect(dialogo).toContainText('NF ')
    await dialogo.getByRole('checkbox', { name: /Conferi a NF e o status/ }).check()
    await dialogo.getByRole('button', { name: 'Confirmar homologação' }).click()
    await expect(linha).toContainText('Homologada')
  })

  await t.etapa('reabrir com justificativa obrigatória', async () => {
    await linha.getByRole('button', { name: 'Reabrir' }).click()
    const dialogo = pagina.getByRole('alertdialog', { name: /^Reabrir/ })
    await dialogo.getByRole('button', { name: 'Confirmar reabertura' }).click()
    await expect(dialogo).toContainText('Informe o motivo da reabertura')
    await dialogo.getByRole('textbox', { name: /^Motivo/ }).fill('Erro material no registro do subcritério 3.1 (teste de uso).')
    await dialogo.getByRole('button', { name: 'Confirmar reabertura' }).click()
    await expect(dialogo).toBeHidden()
    await expect(linha).not.toContainText('Homologada')
    await expect(linha.getByRole('button', { name: 'Homologar' })).toBeVisible()
  })

  await t.etapa('gerar a minuta de ata (PDF)', async () => {
    await pagina.goto(`${ch('presidente')}/sessoes/${SESSAO}`)
    await pagina.getByRole('link', { name: 'Minuta de ata' }).click()
    await expect(pagina.getByRole('textbox', { name: 'Texto da ata' })).not.toHaveValue('')
    const download = pagina.waitForEvent('download')
    await pagina.getByRole('button', { name: 'Exportar PDF' }).click()
    expect((await download).suggestedFilename()).toMatch(/^ata.*\.pdf$/)
  })

  await t.etapa('gerar o espelho da proposta (PDF)', async () => {
    await pagina.goto(`${proposta('presidente')}/d2/memoria`)
    const download = pagina.waitForEvent('download')
    await pagina.getByRole('button', { name: 'Espelho (PDF)' }).click()
    expect((await download).suggestedFilename()).toMatch(/^espelho.*\.pdf$/)
  })
  t.concluir()
})

test('controle: só leitura em todas as telas da proposta e do resultado', async ({ browser, baseURL }) => {
  const pagina = await comoPerfil(browser, 'controle', baseURL)
  const t = cronometro('controle', 'percorrer painel, sessão, admissibilidade, D1, D2, memória, diligências e classificação')
  const telas = [
    ch('presidente'),
    `${ch('presidente')}/sessoes/${SESSAO}`,
    `${proposta('presidente')}/admissibilidade`,
    `${proposta('presidente')}/d1`,
    `${proposta('presidente')}/d2`,
    `${proposta('presidente')}/d2/memoria`,
    `${proposta('presidente')}/diligencias`,
    `${ch('presidente')}/lotes/L1/classificacao`,
  ]
  await t.etapa(`ler ${telas.length} telas sem nenhum botão de escrita`, async () => {
    for (const caminho of telas) {
      await pagina.goto(caminho)
      await esperarTela(pagina)
      expect(await botoesDeEscrita(pagina), caminho).toEqual([])
      expect(await violacoesAxe(pagina), caminho).toEqual([])
    }
  })
  await t.etapa('histórico de alterações: hoje só do administrador', async () => {
    await pagina.goto('/auditoria')
    await expect(pagina.getByRole('heading', { level: 1 })).toContainText('Acesso não autorizado')
  })
  t.concluir()
})

test('telão: a projeção acompanha o foco sem recarregar a página', async ({ browser, baseURL }) => {
  const telao = await comoPerfil(browser, 'consulta', baseURL)
  const presidente = await comoPerfil(browser, 'presidente', baseURL)
  const t = cronometro('telão', 'trocar o foco 3 vezes e ver o telão acompanhar')

  await telao.goto(`/projecao/${CHAMAMENTOS_USO.telao}/${SESSAO}`)
  await expect(telao.getByText('Aguardando a Comissão definir o item em discussão')).toBeVisible()
  await telao.evaluate(() => ((window as unknown as { marcoE2E: string }).marcoE2E = 'sem recarregar'))
  await presidente.goto(`${proposta('telao')}/d1`)

  await t.etapa('subcritério 1.1 aparece no telão', async () => {
    await presidente.getByRole('button', { name: 'Projetar 1.1' }).click()
    await expect(telao.getByRole('heading', { level: 2 })).toContainText('1.1 —')
  })
  await t.etapa('resumo aparece no telão', async () => {
    await presidente.getByRole('button', { name: 'Projetar resumo' }).click()
    await expect(telao.getByRole('heading', { level: 2, name: 'Resumo da proposta' })).toBeVisible()
  })
  await t.etapa('D2 aparece no telão', async () => {
    await presidente.getByRole('button', { name: 'Projetar D2' }).click()
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
