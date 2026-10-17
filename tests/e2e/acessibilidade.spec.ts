// Acessibilidade de todas as rotas (administrador, que alcança todas), além do axe:
// 1. teclado: primeiro Tab = "Pular para o conteúdo", todo elemento interativo alcançável só com Tab;
// 2. foco sempre visível (anel ≥ 2 px em cada parada do Tab);
// 3. zoom 200%: 1280×900 com zoom de 200% = viewport CSS de 640×450 — sem rolagem horizontal da página e sem
//    conteúdo cortado (tabelas podem rolar dentro do próprio contêiner: WCAG 1.4.10 isenta dados em 2D);
// 4. mensagens de erro anunciadas: ao enviar com erro, a mensagem fica numa região aria-live (ou role="alert").
// Resultado em docs/auditoria-design/depois/acessibilidade.md. Uso: npm run test:e2e:acessibilidade
import { expect, test, type Page } from '@playwright/test'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { montarEnsaio } from '../../scripts/lib/ensaio'
import { comoPerfil, esperarTela, percorrerComTeclado } from './apoio'
import { CHAMAMENTO_PAUTA, PROPOSTA_PAUTA, propostaE2E, rotasE2E } from './perfis'

const PASTA = join('docs', 'auditoria-design', 'depois')
const PROPOSTA = propostaE2E(montarEnsaio('2026-11-10').propostas)
const ROTAS = [
  ...rotasE2E(PROPOSTA),
  // Endereço inexistente (o antigo catálogo /ui, removido): a página "não encontrado" também é medida.
  { slug: 'nao-encontrado', caminho: '/ui', exige: null },
]

interface Resultado {
  rota: string
  caminho: string
  teclado: { focaveis: number; alcancados: number; primeiro: string; semFocoVisivel: string[]; naoAlcancados: string[] } | null
  zoom: { rolagemHorizontal: number; cortados: string[] }
}
/** Achados conhecidos, de severidade abaixo de alta, registrados em docs/auditoria-design/pendencias.md. */
const CONHECIDOS: Record<string, string[]> = {}

const resultados: Resultado[] = []
const erros: { formulario: string; anunciado: boolean; mensagem: string }[] = []
// Cada teste grava o que mediu (o Playwright reinicia o worker depois de uma falha e a memória se perde);
// os .json são temporários (fora do git) e o afterAll os junta no acessibilidade.md.
const ARQ_ROTAS = join(PASTA, 'acessibilidade-rotas.json')
const ARQ_ERROS = join(PASTA, 'acessibilidade-erros.json')
const ler = <T,>(arquivo: string): T[] => (existsSync(arquivo) ? JSON.parse(readFileSync(arquivo, 'utf8')) : [])

/** Rolagem horizontal da página (px além da janela) e elementos com texto cortado sem reticências. */
async function medirZoom(pagina: Page) {
  return pagina.evaluate(() => {
    const doc = document.documentElement
    const rolagemHorizontal = Math.max(0, doc.scrollWidth - doc.clientWidth)
    const cortados: string[] = []
    for (const el of document.querySelectorAll<HTMLElement>('body *')) {
      const estilo = getComputedStyle(el)
      if (el.closest('table, [role="tablist"], pre, svg')) continue // rolagem interna permitida (dados em 2D)
      if (estilo.overflowX !== 'hidden' && estilo.overflowX !== 'clip') continue
      if (estilo.textOverflow === 'ellipsis') continue // truncado com reticências (texto completo no leitor de tela)
      if (el.clientWidth <= 1) continue // texto só para leitor de tela (sr-only)
      if (el.scrollWidth > el.clientWidth + 2 && (el.textContent ?? '').trim()) cortados.push(`${el.tagName.toLowerCase()} "${(el.textContent ?? '').trim().slice(0, 40)}"`)
    }
    return { rolagemHorizontal, cortados: [...new Set(cortados)].slice(0, 5) }
  })
}

test.beforeAll(() => mkdirSync(PASTA, { recursive: true }))

test('todas as rotas: teclado, foco visível e zoom 200%', async ({ browser, baseURL }) => {
  test.setTimeout(10 * 60_000)
  const pagina = await comoPerfil(browser, 'administrador', baseURL)
  for (const rota of ROTAS) {
    await pagina.setViewportSize({ width: 1280, height: 900 })
    await pagina.goto(rota.caminho)
    await esperarTela(pagina)
    if (rota.slug === 'nao-encontrado') {
      // O catálogo /ui foi removido (Manutenção 2): o endereço mostra a página "não encontrado" do app.
      await expect(pagina.getByRole('heading', { level: 1, name: 'Página não encontrada' })).toBeVisible()
      await expect(pagina.getByRole('navigation', { name: 'Menu principal' }).getByRole('link', { name: /Catálogo/ })).toHaveCount(0)
    }
    // A projeção (telão) não tem nenhum elemento interativo, por desenho.
    const teclado = rota.slug === 'projecao' ? null : await percorrerComTeclado(pagina)
    await pagina.setViewportSize({ width: 640, height: 450 })
    await pagina.waitForTimeout(400)
    const zoom = await medirZoom(pagina)
    resultados.push({
      rota: rota.slug,
      caminho: rota.caminho,
      teclado: teclado && { ...teclado, alcancados: teclado.focaveis - teclado.naoAlcancados.length },
      zoom,
    })
  }
  writeFileSync(ARQ_ROTAS, JSON.stringify(resultados, null, 2))
  for (const r of resultados) {
    if (r.teclado) {
      expect.soft(r.teclado.primeiro, `${r.rota}: primeiro Tab`).toContain('Pular para o conteúdo')
      expect.soft(r.teclado.naoAlcancados, `${r.rota}: não alcançados pelo Tab`).toEqual([])
      expect.soft(r.teclado.semFocoVisivel.filter((x) => !(CONHECIDOS[r.rota] ?? []).includes(x)), `${r.rota}: foco sem anel`).toEqual([])
    }
    expect.soft(r.zoom.rolagemHorizontal, `${r.rota}: rolagem horizontal a 200%`).toBeLessThanOrEqual(1)
    expect.soft(r.zoom.cortados, `${r.rota}: conteúdo cortado a 200%`).toEqual([])
  }
})

/** Envia o formulário com erro e confere se a mensagem está numa região que o leitor de tela anuncia. */
async function erroAnunciado(pagina: Page, formulario: string, enviar: () => Promise<void>) {
  await enviar()
  await pagina.waitForTimeout(400)
  const { anunciado, mensagem } = await pagina.evaluate(() => {
    const visiveis = [...document.querySelectorAll<HTMLElement>('[id$="-mensagem"], [role="alert"]')].filter((el) => el.getClientRects().length > 0)
    const mensagem = visiveis.map((el) => (el.textContent ?? '').trim()).find(Boolean) ?? ''
    const regioes = [...document.querySelectorAll<HTMLElement>('[aria-live]:not([aria-live="off"]), [role="alert"], [role="status"]')]
    const anunciado = mensagem !== '' && regioes.some((r) => (r.textContent ?? '').includes(mensagem.replace(/^Erro:\s*/, '').slice(0, 30)))
    return { anunciado, mensagem }
  })
  erros.push({ formulario, anunciado, mensagem: mensagem.slice(0, 90) })
  writeFileSync(ARQ_ERROS, JSON.stringify(erros, null, 2))
  expect.soft(anunciado, `${formulario}: mensagem de erro anunciada (aria-live) — "${mensagem}"`).toBe(true)
}

test('mensagens de erro anunciadas (aria-live) nos formulários', async ({ browser, baseURL }) => {
  test.setTimeout(5 * 60_000)
  const anonimo = await browser.newPage({ baseURL })
  await anonimo.goto('/login')
  await anonimo.getByLabel('E-mail').fill('ninguem@e2e.go.gov.br')
  await anonimo.getByLabel('Senha').fill('senha-errada-123')
  await erroAnunciado(anonimo, 'login com senha errada', async () => {
    await anonimo.getByRole('button', { name: 'Entrar' }).click()
    await expect(anonimo.getByRole('alert')).toBeVisible()
  })

  const p = await comoPerfil(browser, 'administrador', baseURL)
  const CH = '/chamamentos/ensaio-2026'
  const P = `${CH}/propostas/${PROPOSTA}`
  const casos: [string, string, () => Promise<void>][] = [
    ['novo chamamento vazio', '/chamamentos/novo', () => p.getByRole('button', { name: 'Cadastrar chamamento' }).click()],
    ['nova proposta vazia', `${CH}/propostas/nova`, () => p.getByRole('button', { name: 'Cadastrar proposta' }).click()],
    ['abertura de sessão sem data', `${CH}/sessoes/nova`, () => p.getByRole('button', { name: 'Abrir sessão' }).click()],
    // Admissibilidade só se registra em sessão aberta: proposta da sessão aberta do E2E de pauta.
    ['admissibilidade sem resultado', `/chamamentos/${CHAMAMENTO_PAUTA}/propostas/${PROPOSTA_PAUTA}/admissibilidade`, () => p.getByRole('button', { name: 'Registrar admissibilidade' }).click()],
    ['D1 sem nível', `/chamamentos/${CHAMAMENTO_PAUTA}/propostas/${PROPOSTA_PAUTA}/d1`, () => p.getByRole('region', { name: 'Resumo da D1' }).getByRole('button', { name: /^Salvar/ }).click()],
  ]
  for (const [nome, caminho, enviar] of casos) {
    await p.goto(caminho)
    await esperarTela(p)
    await erroAnunciado(p, nome, enviar)
  }

  await p.goto(`${P}/d2`)
  await esperarTela(p)
  await p.getByRole('button', { name: 'Nova experiência' }).click()
  await erroAnunciado(p, 'nova experiência vazia (painel lateral)', () => p.getByRole('button', { name: 'Salvar experiência' }).click())
  await p.keyboard.press('Escape')

  await p.goto('/oscs')
  await esperarTela(p)
  await p.getByRole('button', { name: 'Nova OSC' }).click()
  await erroAnunciado(p, 'nova OSC vazia (painel lateral)', () => p.getByRole('dialog').getByRole('button', { name: 'Cadastrar OSC' }).click())
})

test.afterAll(() => {
  const resultados = ler<Resultado>(ARQ_ROTAS)
  const erros = ler<{ formulario: string; anunciado: boolean; mensagem: string }>(ARQ_ERROS)
  const ok = (v: boolean) => (v ? 'sim' : '**não**')
  const linhas = [
    '# Acessibilidade — teclado, foco, zoom 200% e erros anunciados',
    '',
    'Gerado por `tests/e2e/acessibilidade.spec.ts` (Playwright, Chromium, emuladores e dados de ensaio, perfil administrador).',
    'Zoom 200% = viewport CSS de 640×450 (1280×900 ampliado). Tabelas podem rolar dentro do próprio contêiner (WCAG 1.4.10).',
    '',
    '## Teclado, foco visível e zoom 200%',
    '',
    '| Rota | 1º Tab = pular | Alcançados pelo Tab | Foco sem anel | Rolagem horizontal a 200% | Cortado a 200% |',
    '|---|---|---|---|---|---|',
    ...resultados.map((r) =>
      r.teclado
        ? `| ${r.rota} | ${ok(r.teclado.primeiro.includes('Pular para o conteúdo'))} | ${r.teclado.alcancados}/${r.teclado.focaveis} | ${r.teclado.semFocoVisivel.length} | ${r.zoom.rolagemHorizontal} px | ${r.zoom.cortados.length} |`
        : `| ${r.rota} | — (sem elementos interativos, por desenho) | — | — | ${r.zoom.rolagemHorizontal} px | ${r.zoom.cortados.length} |`,
    ),
    '',
    ...resultados.flatMap((r) => [
      ...(r.teclado?.naoAlcancados ?? []).map((x) => `- ${r.rota}: não alcançado pelo Tab: ${x}`),
      ...(r.teclado?.semFocoVisivel ?? []).map((x) => `- ${r.rota}: foco sem anel: ${x}${(CONHECIDOS[r.rota] ?? []).includes(x) ? ' (conhecido, média — pendencias.md)' : ''}`),
      ...r.zoom.cortados.map((x) => `- ${r.rota}: cortado a 200%: ${x}`),
    ]),
    '',
    '## Mensagens de erro anunciadas',
    '',
    '| Formulário | Anunciada (aria-live / alert) | Mensagem |',
    '|---|---|---|',
    ...erros.map((e) => `| ${e.formulario} | ${ok(e.anunciado)} | ${e.mensagem.replace(/\|/g, '\\|')} |`),
    '',
  ]
  writeFileSync(join(PASTA, 'acessibilidade.md'), linhas.join('\n'))
})
