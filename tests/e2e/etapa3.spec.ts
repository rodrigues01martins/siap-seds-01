// Etapa 3 (layout, navegação e templates): nas telas migradas, para cada perfil —
// screenshots 1280/768 em docs/auditoria-design/etapa-3/, axe (WCAG 2.2 AA) sem violações nas duas larguras
// e navegação completa só com teclado (primeiro Tab = "Pular para o conteúdo", todo elemento interativo
// alcançável, foco sempre visível). Também: login só com teclado, menu em gaveta (768) e painel lateral.
// Uso: npm run test:e2e:etapa3
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { CHAMAMENTO_ENSAIO, montarEnsaio } from '../../scripts/lib/ensaio'
import { PERFIS_E2E, SENHA_E2E, propostaE2E } from './perfis'

const PASTA = join('docs', 'auditoria-design', 'etapa-3')
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const LARGURAS = [1280, 768] as const
const CH = `/chamamentos/${CHAMAMENTO_ENSAIO}`
const PROPOSTA = propostaE2E(montarEnsaio('2026-11-10').propostas)

/** Telas migradas na Etapa 3 e quem as mede. */
const TELAS: { slug: string; caminho: string; perfis: string[] }[] = [
  { slug: 'inicio', caminho: '/', perfis: ['administrador', 'avaliador'] },
  { slug: 'painel-chamamento', caminho: CH, perfis: ['administrador', 'avaliador'] },
  { slug: 'chamamento-novo', caminho: '/chamamentos/novo', perfis: ['administrador'] },
  { slug: 'chamamento-editar', caminho: `${CH}/editar`, perfis: ['administrador'] },
  { slug: 'proposta-nova', caminho: `${CH}/propostas/nova`, perfis: ['administrador'] },
  { slug: 'proposta-editar', caminho: `${CH}/propostas/${PROPOSTA}/editar`, perfis: ['administrador'] },
  { slug: 'oscs', caminho: '/oscs', perfis: ['administrador'] },
  { slug: 'usuarios', caminho: '/usuarios', perfis: ['administrador'] },
  { slug: 'auditoria', caminho: '/auditoria', perfis: ['administrador'] },
  { slug: 'sem-permissao', caminho: '/oscs', perfis: ['avaliador'] },
]

interface Resultado {
  perfil: string
  tela: string
  caminho: string
  violacoes: Record<number, string[]>
  focaveis: number
  alcancados: number
  semFocoVisivel: string[]
  naoAlcancados: string[]
}
const resultados: Resultado[] = []

async function entrar(pagina: Page, id: string) {
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

/** Coloca o ponto de partida do Tab no início do documento, como quem acabou de abrir a página. */
async function focarInicio(pagina: Page) {
  await pagina.evaluate(() => {
    document.getElementById('e2e-inicio')?.remove()
    const marco = document.createElement('span')
    marco.id = 'e2e-inicio'
    marco.tabIndex = -1
    document.body.prepend(marco)
    marco.focus()
  })
}

/** Percorre a página só com Tab e confere alcance e foco visível de todo elemento interativo. */
async function percorrerComTeclado(pagina: Page) {
  const focaveis = await pagina.evaluate(() => {
    const seletor = 'a[href], button, input:not([type="hidden"]), select, textarea, [tabindex]'
    const vistos = new Set<string>()
    let n = 0
    for (const el of document.querySelectorAll<HTMLElement>(seletor)) {
      const estilo = getComputedStyle(el)
      const visivel = el.getClientRects().length > 0 && estilo.visibility !== 'hidden'
      if (!visivel || el.tabIndex < 0 || (el as HTMLButtonElement).disabled || el.closest('[inert]')) continue
      if (el instanceof HTMLInputElement && el.type === 'radio') {
        if (vistos.has(el.name)) continue
        vistos.add(el.name)
      }
      el.dataset.e2eFocavel = String(n++)
    }
    return n
  })
  await focarInicio(pagina)
  const semFocoVisivel: string[] = []
  let primeiro = ''
  // Campos de data consomem vários Tabs (dia, mês, ano): anda até o foco dar a volta na página.
  for (let i = 0; i < focaveis * 4 + 10; i++) {
    await pagina.keyboard.press('Tab')
    const info = await pagina.evaluate(() => {
      const el = document.activeElement as HTMLElement | null
      if (!el || el === document.body) return { nome: '', visivel: true, volta: false }
      const volta = el.dataset.e2eVisitado === 'sim' && el.getAttribute('href') === '#conteudo'
      el.dataset.e2eVisitado = 'sim'
      const estilo = getComputedStyle(el)
      const visivel = estilo.outlineStyle !== 'none' && parseFloat(estilo.outlineWidth) >= 2
      const nome = (el.getAttribute('aria-label') ?? el.textContent ?? el.getAttribute('name') ?? el.tagName).trim().slice(0, 40)
      return { nome: `${el.tagName.toLowerCase()} "${nome}"`, visivel, volta }
    })
    if (info.volta) break
    if (!info.nome) continue
    if (!primeiro) primeiro = info.nome
    if (!info.visivel) semFocoVisivel.push(info.nome)
  }
  const naoAlcancados = await pagina.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('[data-e2e-focavel]:not([data-e2e-visitado])')].map(
      (el) => `${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 40)}"`,
    ),
  )
  return { focaveis, primeiro, semFocoVisivel: [...new Set(semFocoVisivel)], naoAlcancados }
}

async function medir(pagina: Page, perfil: string, tela: { slug: string; caminho: string }) {
  const violacoes: Record<number, string[]> = {}
  for (const largura of LARGURAS) {
    await pagina.setViewportSize({ width: largura, height: 900 })
    await pagina.waitForTimeout(300)
    await pagina.screenshot({ path: join(PASTA, 'telas', `${perfil}--${tela.slug}--${largura}.jpg`), fullPage: true, type: 'jpeg', quality: 70 })
    violacoes[largura] = await violacoesAxe(pagina)
  }
  await pagina.setViewportSize({ width: 1280, height: 900 })
  const teclado = await percorrerComTeclado(pagina)
  resultados.push({
    perfil,
    tela: tela.slug,
    caminho: tela.caminho,
    violacoes,
    focaveis: teclado.focaveis,
    alcancados: teclado.focaveis - teclado.naoAlcancados.length,
    semFocoVisivel: teclado.semFocoVisivel,
    naoAlcancados: teclado.naoAlcancados,
  })
  expect(teclado.primeiro, `${tela.slug}: o primeiro Tab vai para o link de pular`).toContain('Pular para o conteúdo')
  expect(violacoes, `axe em ${perfil} · ${tela.slug}`).toEqual({ 1280: [], 768: [] })
  expect(teclado.naoAlcancados, `${tela.slug}: elementos que o Tab não alcança`).toEqual([])
  expect(teclado.semFocoVisivel, `${tela.slug}: foco sem anel visível`).toEqual([])
}

test.beforeAll(() => mkdirSync(join(PASTA, 'telas'), { recursive: true }))

test('login: só com teclado, sem violações do axe', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
  await medir(page, 'anonimo', { slug: 'login', caminho: '/login' })
  const perfil = PERFIS_E2E[0]!
  await focarInicio(page)
  await page.keyboard.press('Tab') // pular para o conteúdo
  await page.keyboard.press('Tab')
  await expect(page.getByRole('textbox', { name: 'E-mail' })).toBeFocused()
  await page.keyboard.type(perfil.email)
  await page.keyboard.press('Tab')
  await page.keyboard.type(SENHA_E2E)
  await page.keyboard.press('Enter')
  await expect(page.getByRole('banner')).toContainText(perfil.nome, { timeout: 30_000 })
})

for (const id of ['administrador', 'avaliador']) {
  test(`${id}: telas migradas (screenshots, axe e teclado)`, async ({ page }) => {
    test.setTimeout(10 * 60_000)
    await entrar(page, id)
    for (const tela of TELAS.filter((t) => t.perfis.includes(id))) {
      await page.goto(tela.caminho)
      await esperarTela(page)
      await medir(page, id, tela)
    }
  })
}

test('"Pular para o conteúdo" leva o foco ao main', async ({ page }) => {
  await entrar(page, 'administrador')
  await page.goto('/oscs')
  await esperarTela(page)
  await focarInicio(page)
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Pular para o conteúdo' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('main#conteudo')).toBeFocused()
  await page.keyboard.press('Tab')
  expect(await page.evaluate(() => document.querySelector('main')!.contains(document.activeElement))).toBe(true)
})

test('768 px: a sidebar vira menu em gaveta, operável pelo teclado', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 })
  await entrar(page, 'administrador')
  await page.goto(CH)
  await esperarTela(page)
  const menu = page.getByRole('button', { name: 'Menu' })
  await menu.focus()
  await page.keyboard.press('Enter')
  const gaveta = page.getByRole('dialog', { name: 'Menu' })
  await expect(gaveta.getByRole('link', { name: 'Propostas do chamamento' })).toHaveAttribute('aria-current', 'page')
  expect(await new AxeBuilder({ page }).withTags(TAGS).analyze().then((r) => r.violations.map((v) => v.id))).toEqual([])
  await page.keyboard.press('Escape')
  await expect(gaveta).toBeHidden()
  await expect(menu).toBeFocused()
})

test('OSCs: "Nova OSC" pelo teclado abre o painel com foco no primeiro campo; Esc fecha e devolve o foco', async ({ page }) => {
  await entrar(page, 'administrador')
  await page.goto('/oscs')
  await esperarTela(page)
  const nova = page.getByRole('button', { name: 'Nova OSC' })
  await nova.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('textbox', { name: 'CNPJ' })).toBeFocused()
  expect(await new AxeBuilder({ page }).withTags(TAGS).analyze().then((r) => r.violations.map((v) => v.id))).toEqual([])
  await page.keyboard.press('Escape')
  await expect(nova).toBeFocused()
})

test.afterAll(() => {
  const linhas = [
    '# Auditoria de design — Etapa 3 (layout, navegação e templates)',
    '',
    'Gerado por `tests/e2e/etapa3.spec.ts` (Playwright + axe-core, WCAG 2.2 AA) com os emuladores e os dados de ensaio.',
    `Screenshots em \`telas/\` (${LARGURAS.join(' e ')} px, página inteira).`,
    '',
    '| Perfil | Tela | Rota | axe 1280 | axe 768 | Teclado (alcançados/focáveis) | Foco sem anel |',
    '|---|---|---|---|---|---|---|',
    ...resultados.map(
      (r) =>
        `| ${r.perfil} | ${r.tela} | \`${r.caminho}\` | ${r.violacoes[1280]?.length ?? '—'} | ${r.violacoes[768]?.length ?? '—'} | ${r.alcancados}/${r.focaveis} | ${r.semFocoVisivel.length} |`,
    ),
    '',
    ...resultados.flatMap((r) => [
      ...[...(r.violacoes[1280] ?? []), ...(r.violacoes[768] ?? [])].map((v) => `- ${r.perfil} · ${r.tela}: ${v}`),
      ...r.naoAlcancados.map((v) => `- ${r.perfil} · ${r.tela}: não alcançado pelo Tab: ${v}`),
      ...r.semFocoVisivel.map((v) => `- ${r.perfil} · ${r.tela}: foco sem anel visível: ${v}`),
    ]),
    '',
  ]
  writeFileSync(join(PASTA, 'relatorio.md'), linhas.join('\n'))
})
