// Apoio dos testes de navegador: login por perfil, espera da tela, axe (WCAG 2.2 AA) e percurso só com Tab
// (alcance de todo elemento interativo e anel de foco visível).
import AxeBuilder from '@axe-core/playwright'
import { expect, type Browser, type Page } from '@playwright/test'
import { PERFIS_E2E, PERFIS_USO, SENHA_E2E } from './perfis'

export const TAGS_AXE = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

export async function entrar(pagina: Page, id: string) {
  const perfil = [...PERFIS_E2E, ...PERFIS_USO].find((p) => p.id === id)!
  await pagina.goto('/login')
  await pagina.getByLabel('E-mail').fill(perfil.email)
  await pagina.getByLabel('Senha').fill(SENHA_E2E)
  await pagina.getByRole('button', { name: 'Entrar' }).click()
  await expect(pagina.getByRole('banner')).toContainText(perfil.nome, { timeout: 30_000 })
}

/** Página nova (contexto próprio, para o axe) já logada com o perfil. */
export async function comoPerfil(navegador: Browser, id: string, baseURL: string | undefined, largura = 1280): Promise<Page> {
  const contexto = await navegador.newContext({ viewport: { width: largura, height: 900 }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', baseURL, acceptDownloads: true })
  const pagina = await contexto.newPage()
  pagina.setDefaultTimeout(30_000)
  await entrar(pagina, id)
  return pagina
}

export async function esperarTela(pagina: Page) {
  await expect(pagina.getByText('Carregando…', { exact: true })).toHaveCount(0, { timeout: 30_000 })
  await expect(pagina.locator('[role="status"][aria-label^="Carregando"]')).toHaveCount(0, { timeout: 30_000 })
  await pagina.waitForTimeout(800)
}

export async function violacoesAxe(pagina: Page): Promise<string[]> {
  const { violations } = await new AxeBuilder({ page: pagina }).withTags(TAGS_AXE).analyze()
  return violations.map((v) => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)
}

/** Coloca o ponto de partida do Tab no início do documento, como quem acabou de abrir a página. */
export async function focarInicio(pagina: Page) {
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
export async function percorrerComTeclado(pagina: Page) {
  const focaveis = await pagina.evaluate(() => {
    for (const el of document.querySelectorAll<HTMLElement>('[data-e2e-focavel], [data-e2e-visitado]')) {
      delete el.dataset.e2eFocavel
      delete el.dataset.e2eVisitado
    }
    const seletor = 'a[href], button, input:not([type="hidden"]), select, textarea, [tabindex]'
    const vistos = new Set<string>()
    let n = 0
    for (const el of document.querySelectorAll<HTMLElement>(seletor)) {
      const estilo = getComputedStyle(el)
      const visivel = el.getClientRects().length > 0 && estilo.visibility !== 'hidden'
      if (!visivel || el.tabIndex < 0 || (el as HTMLButtonElement).disabled || el.closest('[inert]')) continue
      if (el instanceof HTMLInputElement && el.type === 'radio') {
        // Grupo de rádios = uma parada do Tab: a opção marcada ou, sem marcada, a primeira.
        if (vistos.has(el.name)) continue
        const marcada = document.querySelector<HTMLInputElement>(`input[type="radio"][name="${CSS.escape(el.name)}"]:checked`)
        if (marcada && marcada !== el) {
          vistos.add(el.name)
          marcada.dataset.e2eFocavel = String(n++)
          continue
        }
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
      const nome = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('name') || el.id || el.tagName).trim().slice(0, 40)
      const tipo = el instanceof HTMLInputElement ? `[${el.type}]` : ''
      return { nome: `${el.tagName.toLowerCase()}${tipo} "${nome}"`, visivel, volta }
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
