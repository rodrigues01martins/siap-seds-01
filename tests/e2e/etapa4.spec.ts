// Etapa 4 (telas operacionais): screenshots 1280/768 de cada tela em docs/auditoria-design/etapa-4/<fase>/.
// FASE_ETAPA4=antes só fotografa (estado anterior à migração); FASE_ETAPA4=depois (padrão) também exige
// axe (WCAG 2.2 AA) sem violações nas duas larguras.
// Uso: npm run test:e2e:etapa4 (depois) | FASE_ETAPA4=antes npm run test:e2e:etapa4
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { CHAMAMENTO_ENSAIO, montarEnsaio } from '../../scripts/lib/ensaio'
import { PERFIS_E2E, SENHA_E2E, SESSAO_ABERTA, propostaE2E } from './perfis'

const FASE = process.env.FASE_ETAPA4 === 'antes' ? 'antes' : 'depois'
const PASTA = join('docs', 'auditoria-design', 'etapa-4')
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const LARGURAS = [1280, 768] as const
const CH = `/chamamentos/${CHAMAMENTO_ENSAIO}`
const PROPOSTA = propostaE2E(montarEnsaio('2026-11-10').propostas)
const P = `${CH}/propostas/${PROPOSTA}`

/** Telas operacionais e quem as mede. */
const TELAS: { slug: string; caminho: string; perfis: string[] }[] = [
  { slug: 'sessao-nova', caminho: `${CH}/sessoes/nova`, perfis: ['administrador'] },
  { slug: 'sessao', caminho: `${CH}/sessoes/${SESSAO_ABERTA}`, perfis: ['administrador', 'avaliador'] },
  { slug: 'admissibilidade', caminho: `${P}/admissibilidade`, perfis: ['administrador'] },
  { slug: 'd1', caminho: `${P}/d1`, perfis: ['administrador', 'avaliador'] },
  { slug: 'd2', caminho: `${P}/d2`, perfis: ['administrador'] },
  { slug: 'd2-memoria', caminho: `${P}/d2/memoria`, perfis: ['administrador'] },
  { slug: 'diligencias', caminho: `${P}/diligencias`, perfis: ['administrador'] },
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

for (const id of ['administrador', 'avaliador']) {
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
