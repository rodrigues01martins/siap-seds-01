// Medição de design e acessibilidade (baseline): login com cada perfil de acesso, screenshots de todas
// as rotas em 1280px e 768px e axe (WCAG 2.2 AA). Grava em docs/auditoria-design/<fase>/ as imagens e
// o relatorio.md (violações por rota, HEX soltos, classes de paleta e fontes).
// Uso: npm run test:e2e:baseline (fase "antes"); FASE_AUDITORIA=depois para medir de novo.
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { montarEnsaio } from '../../scripts/lib/ensaio'
import { classesDePaleta, declaracoesDeFonte, hexSoltos } from './inventario'
import { PERFIS_E2E, SENHA_E2E, propostaE2E, rotasE2E, type PerfilE2E, type RotaE2E } from './perfis'

const FASE = process.env.FASE_AUDITORIA ?? 'antes'
const PASTA = join('docs', 'auditoria-design', FASE)
const LARGURAS = [1280, 768] as const
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const ROTAS = rotasE2E(propostaE2E(montarEnsaio('2026-11-10').propostas))

interface Violacao {
  id: string
  impacto: string
  descricao: string
  nos: number
  exemplo: string
}
interface Medicao {
  perfil: string
  rota: string
  caminho: string
  acessivel: boolean
  violacoes: Violacao[]
  /** Regras do axe aprovadas e as que ele não conseguiu decidir sozinho (revisar à mão). */
  aprovadas: number
  revisar: { id: string; descricao: string; nos: number }[]
  fonteBody: string
  fontesCarregadas: string[]
}
const medicoes: Medicao[] = []

const podeAcessar = (perfil: PerfilE2E, rota: RotaE2E) =>
  perfil.admin || rota.exige === null || (rota.exige !== 'admin' && perfil.permissoes.includes(rota.exige))

async function esperarTela(pagina: Page) {
  await expect(pagina.getByText('Carregando…', { exact: true })).toHaveCount(0, { timeout: 30_000 })
  await pagina.waitForTimeout(1200) // listeners do Firestore entregam os dados
}

async function medir(pagina: Page, perfil: string, rota: Pick<RotaE2E, 'slug' | 'caminho'>, acessivel: boolean) {
  for (const largura of LARGURAS) {
    await pagina.setViewportSize({ width: largura, height: 900 })
    await pagina.waitForTimeout(300)
    await pagina.screenshot({ path: join(PASTA, 'telas', `${perfil}--${rota.slug}--${largura}.jpg`), fullPage: true, type: 'jpeg', quality: 70 })
  }
  await pagina.setViewportSize({ width: 1280, height: 900 })
  const axe = await new AxeBuilder({ page: pagina }).withTags(TAGS).analyze()
  const fontes = await pagina.evaluate(() => ({
    body: getComputedStyle(document.body).fontFamily,
    carregadas: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.weight}`),
  }))
  medicoes.push({
    perfil,
    rota: rota.slug,
    caminho: rota.caminho,
    acessivel,
    violacoes: axe.violations.map((v) => ({
      id: v.id,
      impacto: v.impact ?? '—',
      descricao: v.help,
      nos: v.nodes.length,
      exemplo: v.nodes[0]?.target.join(' ') ?? '',
    })),
    aprovadas: axe.passes.length,
    revisar: axe.incomplete.map((v) => ({ id: v.id, descricao: v.help, nos: v.nodes.length })),
    fonteBody: fontes.body,
    fontesCarregadas: fontes.carregadas,
  })
}

test.beforeAll(() => mkdirSync(join(PASTA, 'telas'), { recursive: true }))

test('tela de login (sem sessão)', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
  await medir(page, 'anonimo', { slug: 'login', caminho: '/login' }, true)
})

for (const perfil of PERFIS_E2E) {
  test(`perfil ${perfil.id}: todas as rotas`, async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('E-mail').fill(perfil.email)
    await page.getByLabel('Senha').fill(SENHA_E2E)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page.getByText(perfil.nome)).toBeVisible({ timeout: 30_000 })

    for (const rota of ROTAS) {
      const acessivel = podeAcessar(perfil, rota)
      // Rota sem permissão: só o administrador percorre todas; os demais registram só as que acessam.
      if (!acessivel && perfil.id !== 'administrador') continue
      await page.goto(rota.caminho)
      await esperarTela(page)
      await medir(page, perfil.id, rota, acessivel)
    }
  })
}

test.afterAll(() => {
  writeFileSync(join(PASTA, 'medicoes.json'), JSON.stringify(medicoes, null, 2))
  writeFileSync(join(PASTA, 'relatorio.md'), relatorio())
})

function relatorio(): string {
  const linhas: string[] = []
  const total = medicoes.reduce((s, m) => s + m.violacoes.length, 0)
  const porRegra = new Map<string, { impacto: string; descricao: string; telas: number; nos: number }>()
  for (const m of medicoes)
    for (const v of m.violacoes) {
      const atual = porRegra.get(v.id) ?? { impacto: v.impacto, descricao: v.descricao, telas: 0, nos: 0 }
      atual.telas += 1
      atual.nos += v.nos
      porRegra.set(v.id, atual)
    }

  linhas.push(`# Auditoria de design e acessibilidade — ${FASE}`, '')
  linhas.push(`Gerado por \`tests/e2e/baseline.spec.ts\` (Playwright + axe-core, WCAG 2.2 AA: ${TAGS.join(', ')}).`)
  linhas.push('App local com os emuladores e os dados de ensaio (`scripts/lib/ensaio.ts`).', '')
  linhas.push('## Resumo', '')
  linhas.push(`- Telas medidas: ${medicoes.length} (perfis: anônimo, ${PERFIS_E2E.map((p) => p.id).join(', ')}).`)
  linhas.push(`- Screenshots: ${medicoes.length * LARGURAS.length} em \`telas/\` (${LARGURAS.join(' e ')} px, página inteira).`)
  linhas.push(`- Violações axe (regra × tela): ${total}.`)
  const aprovadas = medicoes.map((m) => m.aprovadas)
  linhas.push(`- Regras aprovadas por tela: de ${Math.min(...aprovadas)} a ${Math.max(...aprovadas)} (prova de que o axe analisou cada tela).`)
  linhas.push(
    '- O axe detecta só parte dos critérios WCAG (contraste, nomes, estrutura). Teclado, foco visível, ordem de leitura e',
    '  reflow em 320 px pedem revisão manual nas próximas etapas.',
    '',
  )
  linhas.push('### Violações por regra', '', '| Regra | Impacto | Telas | Elementos | O que é |', '|---|---|---|---|---|')
  for (const [id, r] of [...porRegra].sort((a, b) => b[1].telas - a[1].telas)) {
    linhas.push(`| \`${id}\` | ${r.impacto} | ${r.telas} | ${r.nos} | ${r.descricao} |`)
  }
  const revisar = new Map<string, { descricao: string; telas: number; nos: number }>()
  for (const m of medicoes)
    for (const r of m.revisar) {
      const atual = revisar.get(r.id) ?? { descricao: r.descricao, telas: 0, nos: 0 }
      atual.telas += 1
      atual.nos += r.nos
      revisar.set(r.id, atual)
    }
  linhas.push('', '### Itens que o axe pede para revisar à mão (incomplete)', '')
  if (revisar.size === 0) linhas.push('Nenhum.')
  else {
    linhas.push('| Regra | Telas | Elementos | O que é |', '|---|---|---|---|')
    for (const [id, r] of [...revisar].sort((a, b) => b[1].telas - a[1].telas)) linhas.push(`| \`${id}\` | ${r.telas} | ${r.nos} | ${r.descricao} |`)
  }
  linhas.push('', '## Violações por rota', '')
  for (const m of medicoes) {
    const titulo = `### ${m.perfil} · ${m.rota} (\`${m.caminho}\`)${m.acessivel ? '' : ' — sem permissão (tela "Acesso não autorizado")'}`
    linhas.push(titulo, '')
    if (m.violacoes.length === 0) linhas.push('Nenhuma violação.', '')
    else {
      linhas.push('| Regra | Impacto | Elementos | Exemplo |', '|---|---|---|---|')
      for (const v of m.violacoes) linhas.push(`| \`${v.id}\` | ${v.impacto} | ${v.nos} | \`${v.exemplo.replace(/\|/g, '\\|')}\` |`)
      linhas.push('')
    }
  }

  const hex = hexSoltos()
  linhas.push('## Cores HEX soltas no código (src/, index.html; sem testes)', '')
  linhas.push(`Total: ${hex.length}.`, '', '| Arquivo:linha | Valor | Trecho |', '|---|---|---|')
  for (const o of hex) linhas.push(`| ${o.arquivo}:${o.linha} | \`${o.valor}\` | \`${o.trecho.replace(/\|/g, '\\|')}\` |`)

  const paleta = classesDePaleta()
  const porArquivo = new Map<string, Map<string, number>>()
  for (const o of paleta) {
    const mapa = porArquivo.get(o.arquivo) ?? new Map<string, number>()
    mapa.set(o.valor, (mapa.get(o.valor) ?? 0) + 1)
    porArquivo.set(o.arquivo, mapa)
  }
  linhas.push('', '## Classes de cor da paleta padrão do Tailwind (não semânticas)', '')
  linhas.push(`Total: ${paleta.length} usos em ${porArquivo.size} arquivos. Serão trocadas por tokens semânticos.`, '')
  linhas.push('| Arquivo | Usos | Classes |', '|---|---|---|')
  for (const [arquivo, mapa] of [...porArquivo].sort((a, b) => a[0].localeCompare(b[0]))) {
    const usos = [...mapa.values()].reduce((s, n) => s + n, 0)
    linhas.push(`| ${arquivo} | ${usos} | ${[...mapa.keys()].sort().join(', ')} |`)
  }

  const fontesCodigo = declaracoesDeFonte()
  const fontesNavegador = [...new Set(medicoes.map((m) => m.fonteBody))]
  const carregadas = [...new Set(medicoes.flatMap((m) => m.fontesCarregadas))]
  linhas.push('', '## Fontes', '')
  linhas.push(`- \`font-family\` calculada do \`<body>\` no navegador: ${fontesNavegador.map((f) => `\`${f}\``).join('; ')}.`)
  linhas.push(`- Fontes web carregadas (\`document.fonts\`): ${carregadas.length ? carregadas.join(', ') : 'nenhuma (só fontes do sistema)'}.`)
  linhas.push('- Declarações no código:', '')
  if (fontesCodigo.length === 0) linhas.push('  nenhuma declaração explícita (o app usa a pilha padrão do Tailwind, `font-sans`).')
  for (const o of fontesCodigo) linhas.push(`  - ${o.arquivo}:${o.linha} — \`${o.trecho.replace(/\|/g, '\\|')}\``)
  linhas.push('')
  return linhas.join('\n')
}
