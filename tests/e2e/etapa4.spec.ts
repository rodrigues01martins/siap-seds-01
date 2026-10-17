// Etapa 4 (telas operacionais): screenshots 1280/768 de cada tela em docs/auditoria-design/etapa-4/<fase>/.
// FASE_ETAPA4=antes só fotografa (estado anterior à migração); FASE_ETAPA4=depois (padrão) também exige
// axe (WCAG 2.2 AA) sem violações nas duas larguras e roda o fluxo completo pela interface, gravando pela /api
// nos emuladores: sessão → admissão → D1 (28 subcritérios) → D2 → classificação → conclusão, com o salvamento
// automático da tela /avaliar (Simplificação 3/4).
// Uso: npm run test:e2e:etapa4 (depois) | FASE_ETAPA4=antes npm run test:e2e:etapa4
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Browser, type Page } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { CHAMAMENTO_ENSAIO, montarEnsaio } from '../../scripts/lib/ensaio'
import { MATRIZ_2026 } from '../../src/domain/matriz'
import { esperarSalvo } from './apoio'
import { CHAMAMENTO_FLUXO, PERFIS_E2E, PROPOSTA_FLUXO, SENHA_E2E, SESSAO_ABERTA, propostaE2E } from './perfis'

const FASE = process.env.FASE_ETAPA4 === 'antes' ? 'antes' : 'depois'
const PASTA = join('docs', 'auditoria-design', 'etapa-4')
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const LARGURAS = [1280, 768] as const
const CH = `/chamamentos/${CHAMAMENTO_ENSAIO}`
const PROPOSTA = propostaE2E(montarEnsaio('2026-11-10').propostas)
const AVALIAR = `/avaliar/${PROPOSTA}?ch=${CHAMAMENTO_ENSAIO}`

/** Telas operacionais e quem as mede. */
const TELAS: { slug: string; caminho: string; perfis: string[] }[] = [
  { slug: 'sessao-nova', caminho: `${CH}/sessoes/nova`, perfis: ['administrador'] },
  { slug: 'sessao', caminho: `/sessao/${SESSAO_ABERTA}?ch=${CHAMAMENTO_ENSAIO}`, perfis: ['administrador', 'presidente'] },
  { slug: 'admissibilidade', caminho: `${AVALIAR}&aba=admissao`, perfis: ['administrador'] },
  { slug: 'd1', caminho: `${AVALIAR}&aba=d1`, perfis: ['administrador', 'presidente'] },
  { slug: 'd2', caminho: `${AVALIAR}&aba=d2`, perfis: ['administrador'] },
  { slug: 'resultado', caminho: `${AVALIAR}&aba=resultado`, perfis: ['administrador'] },
  { slug: 'classificacao', caminho: `${CH}/lotes/L1/classificacao`, perfis: ['administrador'] },
  { slug: 'ata', caminho: `${CH}/sessoes/${SESSAO_ABERTA}/ata`, perfis: ['administrador'] },
  { slug: 'projecao', caminho: `/projecao/${CHAMAMENTO_ENSAIO}/${SESSAO_ABERTA}`, perfis: ['administrador'] },
]

interface Resultado {
  perfil: string
  tela: string
  caminho: string
  violacoes: Record<number, string[]>
}
const resultados: Resultado[] = []

export async function entrar(pagina: Page, id: string) {
  const perfil = PERFIS_E2E.find((p) => p.id === id)!
  await pagina.goto('/login')
  await pagina.getByLabel('E-mail').fill(perfil.email)
  await pagina.getByLabel('Senha').fill(SENHA_E2E)
  await pagina.getByRole('button', { name: 'Entrar' }).click()
  await expect(pagina.getByRole('banner')).toContainText(perfil.nome, { timeout: 30_000 })
}

async function esperarTela(pagina: Page) {
  await expect(pagina.getByText('Carregando…', { exact: true })).toHaveCount(0, { timeout: 30_000 })
  await expect(pagina.locator('[role="status"][aria-label^="Carregando"]')).toHaveCount(0, { timeout: 30_000 })
  await pagina.waitForTimeout(800)
}

async function violacoesAxe(pagina: Page): Promise<string[]> {
  const { violations } = await new AxeBuilder({ page: pagina }).withTags(TAGS).analyze()
  return violations.map((v) => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)
}

async function medir(pagina: Page, perfil: string, tela: { slug: string; caminho: string }) {
  const violacoes: Record<number, string[]> = {}
  for (const largura of LARGURAS) {
    await pagina.setViewportSize({ width: largura, height: 900 })
    await pagina.waitForTimeout(400)
    await pagina.screenshot({ path: join(PASTA, FASE, `${perfil}--${tela.slug}--${largura}.jpg`), fullPage: true, type: 'jpeg', quality: 70 })
    violacoes[largura] = await violacoesAxe(pagina)
  }
  await pagina.setViewportSize({ width: 1280, height: 900 })
  resultados.push({ perfil, tela: tela.slug, caminho: tela.caminho, violacoes })
  if (FASE === 'depois') expect(violacoes, `axe em ${perfil} · ${tela.slug}`).toEqual({ 1280: [], 768: [] })
}

test.beforeAll(() => mkdirSync(join(PASTA, FASE), { recursive: true }))

for (const id of ['administrador', 'presidente']) {
  test(`${id}: telas operacionais (screenshots ${FASE} e axe)`, async ({ page }) => {
    test.setTimeout(10 * 60_000)
    await entrar(page, id)
    for (const tela of TELAS.filter((t) => t.perfis.includes(id))) {
      await page.goto(tela.caminho)
      await esperarTela(page)
      await medir(page, id, tela)
    }
  })
}

async function semViolacoes(pagina: Page, onde: string) {
  expect(await violacoesAxe(pagina), `axe: ${onde}`).toEqual([])
}

async function comoPerfil(navegador: Browser, id: string): Promise<Page> {
  const contexto = await navegador.newContext({ viewport: { width: 1280, height: 900 }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', baseURL: test.info().project.use.baseURL })
  const pagina = await contexto.newPage()
  pagina.setDefaultTimeout(30_000)
  await entrar(pagina, id)
  return pagina
}

test('fluxo completo pela interface: sessão → admissibilidade → D1 → D2 → classificação → conclusão', async ({ browser }) => {
  test.skip(FASE === 'antes', 'só depois da migração')
  test.setTimeout(10 * 60_000)
  const CHF = `/chamamentos/${CHAMAMENTO_FLUXO}`

  // 1. Sessão (administrador): uma página só — data, lote(s) em pauta e presentes (nome e papel).
  const admin = await comoPerfil(browser, 'administrador')
  await admin.goto(`${CHF}/sessoes/nova`)
  await expect(admin.getByRole('button', { name: 'Abrir sessão' })).toBeVisible({ timeout: 30_000 })
  await admin.getByLabel(/^Data da sessão/).fill('2026-11-10')
  await admin.getByRole('checkbox', { name: /^Lote F1/ }).check()
  await admin.getByRole('textbox', { name: /^Nome da pessoa 1/ }).fill('Presidência E2E')
  await admin.getByRole('button', { name: 'Adicionar pessoa' }).click()
  await admin.getByRole('textbox', { name: /^Nome da pessoa 2/ }).fill('Membro E2E A')
  await semViolacoes(admin, 'abertura da sessão')
  await admin.getByRole('button', { name: 'Abrir sessão' }).click()
  await expect(admin.getByRole('heading', { level: 1, name: 'Sessão de 10/11/2026' })).toBeVisible({ timeout: 30_000 })

  // 2. Admissão (presidente), na tela de avaliação: admitida (sim) e páginas dentro do limite; grava sozinho.
  const presidente = await comoPerfil(browser, 'presidente')
  const AF = `/avaliar/${PROPOSTA_FLUXO}?ch=${CHAMAMENTO_FLUXO}`
  await presidente.goto(`${AF}&aba=admissao`)
  await presidente.getByRole('radio', { name: 'Sim, admitida' }).check({ timeout: 30_000 })
  let pagina = 3
  for (const pa of MATRIZ_2026.dimensao1.planos) {
    await presidente.getByLabel(`Página inicial do ${pa.codigo}`).fill(String(pagina))
    await presidente.getByLabel(`Página final do ${pa.codigo}`).fill(String(pagina + pa.limitePaginas - 1))
    pagina += pa.limitePaginas
  }
  await esperarSalvo(presidente)
  await semViolacoes(presidente, 'admissão preenchida')

  // 3. D1 numa página só: os 28 subcritérios, cada um na sua linha (nível, justificativa e páginas), sem Salvar.
  await presidente.getByRole('tab', { name: /^D1/ }).click()
  const cabecalho = presidente.getByRole('region', { name: 'Resumo da proposta' })
  await expect(cabecalho).toContainText('0 de 28 completos', { timeout: 30_000 })
  for (const codigo of MATRIZ_2026.dimensao1.planos.flatMap((pa) => pa.subcriterios.map((s) => s.codigo))) {
    const linhaSub = presidente.getByRole('listitem', { name: new RegExp(`^${codigo.replace('.', '\\.')} — `) })
    await linhaSub.getByRole('radio', { name: 'Nível 3', exact: true }).click()
    await linhaSub.getByRole('textbox', { name: new RegExp(`^Justificativa do ${codigo.replace('.', '\\.')}`) }).fill('Registro do teste de fluxo completo (E2E), nível 3.')
    await linhaSub.getByRole('textbox', { name: new RegExp(`^Páginas citadas do ${codigo.replace('.', '\\.')}`) }).fill('1')
    if (codigo === '1.1') await semViolacoes(presidente, 'D1 em linha')
  }
  await esperarSalvo(presidente)
  await expect(cabecalho).toContainText('28 de 28 completos')
  await expect(cabecalho).toContainText('D1 84 / 112')
  await expect(cabecalho.getByText('Apta').first()).toBeVisible()

  // 4. D2: experiência com documento aceito, editada direto na linha da tabela.
  await presidente.getByRole('tab', { name: /^D2/ }).click()
  await presidente.getByRole('button', { name: 'Adicionar experiência' }).click()
  await presidente.getByRole('textbox', { name: 'Descrição da experiência 1' }).fill('Internação socioeducativa (E2E)')
  await presidente.getByRole('checkbox', { name: 'Categoria A da experiência 1' }).check()
  await presidente.getByRole('combobox', { name: 'Modalidade da experiência 1' }).selectOption('internacao')
  await presidente.getByRole('checkbox', { name: 'MROSC da experiência 1' }).check()
  await presidente.getByLabel('Início da experiência 1').fill('2018-01-01')
  await presidente.getByRole('spinbutton', { name: 'Vagas da experiência 1' }).fill('60')
  await esperarSalvo(presidente)
  await presidente.getByRole('button', { name: /^Detalhes e documentos \(0\) da experiência 1/ }).click()
  await presidente.getByRole('button', { name: 'Adicionar documento à experiência 1' }).click()
  await presidente.getByRole('textbox', { name: 'Tipo do documento 1 da experiência 1' }).fill('Atestado de capacidade técnica')
  await presidente.getByRole('textbox', { name: 'Nº SEI do documento 1 da experiência 1' }).fill('00000123')
  await presidente.getByRole('checkbox', { name: /^Comprova execução satisfatória \(do documento 1/ }).check()
  await presidente.getByRole('checkbox', { name: /^Aceito pela Comissão \(do documento 1/ }).check()
  await esperarSalvo(presidente)
  await semViolacoes(presidente, 'D2 na linha')
  await expect(presidente.getByText(/D2 gravada: [1-9]/)).toBeVisible({ timeout: 30_000 })

  // 5. Classificação e 6. conclusão (administrador): ConfirmDialog com NF e status; reversível.
  await admin.goto(`${CHF}/lotes/F1/classificacao`)
  const ranking = admin.getByRole('table', { name: 'Classificação do lote F1' })
  const linha = ranking.getByRole('row').filter({ hasText: 'Instituto Alfa (ENSAIO)' })
  await expect(linha).toContainText('1º', { timeout: 30_000 })
  await expect(linha).toContainText('Apta')
  await linha.getByRole('button', { name: 'Concluir' }).click()
  const confirmacao = admin.getByRole('alertdialog', { name: /^Concluir Instituto Alfa/ })
  await expect(confirmacao).toContainText('NF ')
  await expect(confirmacao.getByRole('button', { name: 'Cancelar' })).toBeFocused()
  await semViolacoes(admin, 'ConfirmDialog de conclusão')
  await confirmacao.getByRole('button', { name: 'Concluir' }).click()
  await expect(confirmacao).toBeHidden({ timeout: 30_000 })
  await expect(linha).toContainText('Concluída', { timeout: 30_000 })
  await expect(linha.getByRole('button', { name: 'Desfazer conclusão' })).toBeVisible()
  await admin.screenshot({ path: join(PASTA, FASE, 'fluxo--concluida--1280.jpg'), fullPage: true, type: 'jpeg', quality: 70 })

  // Sem trava: a avaliação continua editável (alterar desfaz a conclusão).
  await presidente.goto(`${AF}&aba=d1`)
  await expect(presidente.getByRole('region', { name: 'Resumo da proposta' }).getByText('Concluída')).toBeVisible({ timeout: 30_000 })
  await expect(presidente.getByRole('listitem', { name: /^1\.1 — / }).getByRole('radio', { name: 'Nível 3', exact: true })).toBeEnabled()

  // Desfazer conclusão, sem justificativa.
  await linha.getByRole('button', { name: 'Desfazer conclusão' }).click()
  await expect(linha.getByRole('button', { name: 'Concluir' })).toBeVisible({ timeout: 30_000 })
})

test.afterAll(() => {
  const linhas = [
    `# Auditoria de design — Etapa 4 (telas operacionais) — ${FASE}`,
    '',
    'Gerado por `tests/e2e/etapa4.spec.ts` (Playwright + axe-core, WCAG 2.2 AA) com os emuladores e os dados de ensaio.',
    `Screenshots nesta pasta (${LARGURAS.join(' e ')} px, página inteira).`,
    '',
    '| Perfil | Tela | Rota | axe 1280 | axe 768 |',
    '|---|---|---|---|---|',
    ...resultados.map((r) => `| ${r.perfil} | ${r.tela} | \`${r.caminho}\` | ${r.violacoes[1280]?.length ?? '—'} | ${r.violacoes[768]?.length ?? '—'} |`),
    '',
    ...resultados.flatMap((r) => [...(r.violacoes[1280] ?? []), ...(r.violacoes[768] ?? [])].map((v) => `- ${r.perfil} · ${r.tela}: ${v}`)),
    '',
  ]
  writeFileSync(join(PASTA, FASE, 'relatorio.md'), linhas.join('\n'))
})
