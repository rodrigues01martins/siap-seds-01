// Catálogo de componentes (/ui): só o administrador abre, e o axe (WCAG 2.2 AA) não acusa nenhuma violação
// na página e com os overlays abertos e os erros do formulário. Uso: npm run test:e2e:ui.
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { PERFIS_E2E, SENHA_E2E } from './perfis'

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

async function entrar(pagina: Page, id: string) {
  const perfil = PERFIS_E2E.find((p) => p.id === id)!
  await pagina.goto('/login')
  await pagina.getByLabel('E-mail').fill(perfil.email)
  await pagina.getByLabel('Senha').fill(SENHA_E2E)
  await pagina.getByRole('button', { name: 'Entrar' }).click()
  await expect(pagina.getByText(perfil.nome)).toBeVisible({ timeout: 30_000 })
}

async function semViolacoes(pagina: Page, onde: string) {
  const { violations, passes } = await new AxeBuilder({ page: pagina }).withTags(TAGS).analyze()
  const resumo = violations.map((v) => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)
  expect(resumo, `axe em ${onde}`).toEqual([])
  expect(passes.length, `axe analisou ${onde}`).toBeGreaterThan(15)
}

test('catálogo /ui sem violações do axe (página, formulário com erros e overlays)', async ({ page }) => {
  await entrar(page, 'administrador')
  await page.goto('/ui')
  await expect(page.getByRole('heading', { name: 'Catálogo de componentes', level: 1 })).toBeVisible({ timeout: 30_000 })
  await semViolacoes(page, '/ui')

  await page.getByRole('button', { name: 'Validar' }).click()
  await expect(page.getByText('Informe o nome da OSC (ao menos 3 letras).')).toBeVisible()
  await semViolacoes(page, '/ui com erros no formulário')

  for (const [botao, papel, nome] of [
    ['Abrir diálogo', 'dialog', 'Editar protocolo'],
    ['Confirmação destrutiva', 'alertdialog', 'Desativar conta?'],
    ['Abrir painel lateral', 'dialog', 'Gerenciar usuário'],
  ] as const) {
    const abrir = page.getByRole('button', { name: botao })
    await abrir.click()
    const overlay = page.getByRole(papel, { name: nome })
    await expect(overlay).toBeVisible()
    await semViolacoes(page, `/ui com "${nome}" aberto`)
    await page.keyboard.press('Escape')
    await expect(overlay).toBeHidden()
    await expect(abrir).toBeFocused() // o foco volta para quem abriu
  }
})

test('catálogo /ui é só do administrador', async ({ page }) => {
  await entrar(page, 'avaliador')
  await page.goto('/ui')
  await expect(page.getByRole('heading', { name: 'Acesso não autorizado' })).toBeVisible({ timeout: 30_000 })
})
