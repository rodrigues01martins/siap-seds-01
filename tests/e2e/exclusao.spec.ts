// Exclusão livre pela interface, gravando pela /api nos emuladores (Simplificação 2/4): lixeira em cada item,
// um único ConfirmDialog destrutivo com a prévia ("Serão apagados: …"), sem justificativa e sem digitação.
// Cobre chamamento, OSC (só a prévia), proposta, nível da D1 e a sessão (que apaga o que foi registrado com ela).
// Axe (WCAG 2.2 AA) em cada estado do diálogo e screenshots em docs/auditoria-design/exclusao/.
// Uso: npm run test:e2e:exclusao
import { expect, test, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { CHAMAMENTO_ENSAIO, montarEnsaio } from '../../scripts/lib/ensaio'
import { comoPerfil, esperarTela, violacoesAxe } from './apoio'
import { CHAMAMENTO_EXCLUIR_PROPOSTA, CHAMAMENTO_PAUTA, PROPOSTA_PAUTA } from './perfis'

const PASTA = join('docs', 'auditoria-design', 'exclusao')
const ENSAIO = montarEnsaio('2026-11-10')
const NUMERO_ENSAIO = String(ENSAIO.documentos[`chamamentos/${CHAMAMENTO_ENSAIO}`]!.numero)
const OSC_COM_PROPOSTAS = ENSAIO.documentos[`oscs/${ENSAIO.oscs[0]}`]!.razaoSocial as string
const D1_PAUTA = `/chamamentos/${CHAMAMENTO_PAUTA}/propostas/${PROPOSTA_PAUTA}/d1`

async function foto(pagina: Page, nome: string) {
  mkdirSync(PASTA, { recursive: true })
  await pagina.screenshot({ path: join(PASTA, `${nome}.png`), fullPage: false })
}

/** Clica na lixeira e espera a prévia no ConfirmDialog. */
async function abrirLixeira(pagina: Page, nome: string | RegExp) {
  const rotulo = typeof nome === 'string' ? `Excluir ${nome}` : new RegExp(`^Excluir ${nome.source}`)
  await pagina.getByRole('button', { name: rotulo }).first().click()
  const dialogo = pagina.getByRole('alertdialog', { name: rotulo })
  await expect(dialogo.getByText(/^Serão apagados: /)).toBeVisible({ timeout: 30_000 })
  return dialogo
}

async function confirmar(pagina: Page, dialogo: ReturnType<Page['getByRole']>) {
  await dialogo.getByRole('button', { name: 'Excluir', exact: true }).click()
  await expect(pagina.getByRole('alertdialog')).toHaveCount(0, { timeout: 30_000 })
  await expect(pagina.getByText('Exclusão concluída').first()).toBeVisible()
}

test('exclusão livre: lixeira, prévia com a contagem e cascata pela /api', async ({ browser, baseURL }) => {
  test.setTimeout(4 * 60_000)
  const pagina = await comoPerfil(browser, 'administrador', baseURL)

  // 1. Lista de chamamentos: lixeira na linha; prévia sem justificativa nem digitação.
  await pagina.goto('/')
  await esperarTela(pagina)
  let dialogo = await abrirLixeira(pagina, `chamamento ${NUMERO_ENSAIO}`)
  await expect(dialogo).toContainText('propostas')
  await expect(dialogo.getByRole('textbox')).toHaveCount(0)
  await expect(dialogo.getByRole('button', { name: 'Cancelar' })).toBeFocused()
  await pagina.waitForTimeout(400)
  await foto(pagina, '1-previa-chamamento')
  expect(await violacoesAxe(pagina)).toEqual([])
  await dialogo.getByRole('button', { name: 'Cancelar' }).click()

  // 2. Chamamento vazio: apaga direto.
  dialogo = await abrirLixeira(pagina, 'chamamento E2E-EXCLUIR/2026')
  await expect(dialogo).toContainText('Serão apagados: 1 chamamento')
  await confirmar(pagina, dialogo)
  await expect(pagina.getByRole('table', { name: 'Chamamentos' })).not.toContainText('E2E-EXCLUIR/2026')
  await foto(pagina, '2-chamamento-excluido')

  // 3. OSC com propostas: a prévia conta as propostas e o que há dentro delas (cancelado: os dados servem a outros testes).
  await pagina.goto('/oscs')
  await esperarTela(pagina)
  dialogo = await abrirLixeira(pagina, `OSC ${OSC_COM_PROPOSTAS}`)
  await expect(dialogo).toContainText(/1 OSC, \d+ propostas?/)
  await foto(pagina, '3-previa-osc')
  expect(await violacoesAxe(pagina)).toEqual([])
  await dialogo.getByRole('button', { name: 'Cancelar' }).click()

  // 4. Proposta com tudo dentro (28 avaliações): prévia e exclusão.
  await pagina.goto(`/chamamentos/${CHAMAMENTO_EXCLUIR_PROPOSTA}`)
  await esperarTela(pagina)
  dialogo = await abrirLixeira(pagina, /proposta E2E-EXCLUIR-001 — /)
  await expect(dialogo).toContainText('1 proposta')
  await expect(dialogo).toContainText('28 avaliações')
  await foto(pagina, '4-previa-proposta')
  await confirmar(pagina, dialogo)
  await expect(pagina.getByText('Nenhuma proposta neste lote').first()).toBeVisible()

  // 5. Nível da D1 registrado na sessão aberta: lixeira do nível, recálculo.
  await pagina.goto(D1_PAUTA)
  await esperarTela(pagina)
  const resumo = pagina.getByRole('region', { name: 'Resumo da D1' })
  for (const faltam of [28, 27]) {
    await pagina.getByRole('radio', { name: 'Nível 3', exact: true }).check()
    await pagina.getByRole('textbox', { name: /^Justificativa/ }).fill('Registro do teste de exclusão (E2E), nível 3.')
    await pagina.getByRole('textbox', { name: 'Páginas citadas' }).fill('1')
    await resumo.getByRole('button', { name: /^Salvar avaliação/ }).click()
    await expect(resumo).toContainText(`Faltam ${faltam - 1} de`)
  }
  await pagina.getByRole('button', { name: /^1\.1 / }).first().click()
  dialogo = await abrirLixeira(pagina, 'nível do 1.1')
  await expect(dialogo).toContainText('Serão apagados: 1 avaliação.')
  await foto(pagina, '5-previa-nivel')
  expect(await violacoesAxe(pagina)).toEqual([])
  await confirmar(pagina, dialogo)
  await expect(resumo).toContainText('Faltam 27 de')

  // 6. Sessão: apaga a sessão e o que foi registrado com ela (o nível que sobrou); totais recalculados.
  await pagina.goto(`/chamamentos/${CHAMAMENTO_PAUTA}`)
  await esperarTela(pagina)
  dialogo = await abrirLixeira(pagina, 'sessão de 10/11/2026')
  await expect(dialogo).toContainText('Serão apagados: 1 sessão, 1 avaliação.')
  await foto(pagina, '6-previa-sessao')
  expect(await violacoesAxe(pagina)).toEqual([])
  await confirmar(pagina, dialogo)
  await expect(pagina.getByRole('table', { name: 'Sessões' })).toContainText('Nenhuma sessão registrada')
  await pagina.goto(D1_PAUTA)
  await esperarTela(pagina)
  await expect(pagina.getByRole('region', { name: 'Resumo da D1' })).toContainText('Faltam 28 de')
  await foto(pagina, '7-d1-depois-da-sessao-excluida')

  // 7. Diálogo em tela estreita (768).
  const estreita = await comoPerfil(browser, 'administrador', baseURL, 768)
  await estreita.goto('/')
  await esperarTela(estreita)
  await abrirLixeira(estreita, `chamamento ${NUMERO_ENSAIO}`)
  await foto(estreita, '8-previa-768')
  expect(await violacoesAxe(estreita)).toEqual([])
})

test('o presidente também vê a lixeira (exclusão livre para os dois perfis)', async ({ browser, baseURL }) => {
  const pagina = await comoPerfil(browser, 'presidente', baseURL)
  await pagina.goto('/')
  await esperarTela(pagina)
  await expect(pagina.getByRole('table', { name: 'Chamamentos' })).toContainText(NUMERO_ENSAIO)
  await expect(pagina.getByRole('button', { name: `Excluir chamamento ${NUMERO_ENSAIO}` })).toBeVisible()
})
