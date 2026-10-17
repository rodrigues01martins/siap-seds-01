// Exclusão de cadastros pela interface, gravando pela /api nos emuladores: menu de ações da linha, prévia com
// bloqueio (Alert de erro), confirmação com justificativa e identificador, e a exclusão de fato (chamamento vazio
// e proposta com subcoleções). Axe (WCAG 2.2 AA) em cada estado do diálogo e screenshots das telas alteradas
// em docs/auditoria-design/exclusao/. Uso: npm run test:e2e:exclusao
import { expect, test, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { CHAMAMENTO_ENSAIO, montarEnsaio } from '../../scripts/lib/ensaio'
import { comoPerfil, esperarTela, violacoesAxe } from './apoio'
import { CHAMAMENTO_EXCLUIR_PROPOSTA } from './perfis'

const PASTA = join('docs', 'auditoria-design', 'exclusao')
const ENSAIO = montarEnsaio('2026-11-10')
const NUMERO_ENSAIO = String(ENSAIO.documentos[`chamamentos/${CHAMAMENTO_ENSAIO}`]!.numero)
const OSC_COM_PROPOSTAS = ENSAIO.documentos[`oscs/${ENSAIO.oscs[0]}`]!.razaoSocial as string
const JUSTIFICATIVA = 'Cadastro feito por engano no ensaio (teste automatizado E2E).'

async function foto(pagina: Page, nome: string) {
  mkdirSync(PASTA, { recursive: true })
  await pagina.screenshot({ path: join(PASTA, `${nome}.png`), fullPage: false })
}

async function abrirExclusao(pagina: Page, rotuloMenu: string) {
  await pagina.getByRole('button', { name: rotuloMenu }).click()
  await expect(pagina.getByRole('menu', { name: rotuloMenu })).toBeVisible()
  return async () => {
    await pagina.getByRole('menuitem', { name: 'Excluir' }).click()
    const dialogo = pagina.getByRole('alertdialog')
    await expect(dialogo).toBeVisible()
    await expect(dialogo.locator('[role="status"][aria-label^="Carregando"]')).toHaveCount(0, { timeout: 30_000 })
    return dialogo
  }
}

test('exclusão de cadastros: menu da linha, bloqueios, confirmação e exclusão pela /api', async ({ browser, baseURL }) => {
  const pagina = await comoPerfil(browser, 'administrador', baseURL)

  // 1. Lista de chamamentos: menu de ações da linha.
  await pagina.goto('/')
  await esperarTela(pagina)
  const escolher = await abrirExclusao(pagina, `Mais ações — chamamento ${NUMERO_ENSAIO}`)
  await foto(pagina, '1-lista-chamamentos-menu')
  expect(await violacoesAxe(pagina)).toEqual([])

  // 2. Chamamento com propostas e sessões: bloqueado (Alert de erro), botão desabilitado.
  let dialogo = await escolher()
  const alerta = dialogo.getByRole('alert')
  await expect(alerta).toContainText('Exclusão bloqueada')
  await expect(alerta).toContainText('propostas')
  await expect(alerta).toContainText('sessão')
  await expect(dialogo.getByRole('button', { name: 'Excluir definitivamente' })).toBeDisabled()
  await foto(pagina, '2-chamamento-bloqueado')
  expect(await violacoesAxe(pagina)).toEqual([])
  await dialogo.getByRole('button', { name: 'Cancelar' }).click()

  // 3. Chamamento vazio: prévia, justificativa e nº digitado habilitam; a exclusão apaga a linha.
  dialogo = await (await abrirExclusao(pagina, 'Mais ações — chamamento E2E-EXCLUIR/2026'))()
  await expect(dialogo).toContainText('Só o próprio registro')
  const confirmar = dialogo.getByRole('button', { name: 'Excluir definitivamente' })
  await dialogo.getByLabel(/Justificativa da exclusão/).fill(JUSTIFICATIVA)
  await expect(confirmar).toBeDisabled()
  await dialogo.getByLabel(/Para confirmar, digite o nº do chamamento/).fill('E2E-EXCLUIR/2026')
  await expect(confirmar).toBeEnabled()
  await pagina.waitForTimeout(400) // fim da transição de cor do botão
  await foto(pagina, '3-chamamento-confirmar')
  expect(await violacoesAxe(pagina)).toEqual([])
  await confirmar.click()
  await expect(pagina.getByRole('alertdialog')).toHaveCount(0)
  await expect(pagina.getByText('Exclusão concluída')).toBeVisible()
  await expect(pagina.getByRole('table', { name: 'Chamamentos' })).not.toContainText('E2E-EXCLUIR/2026')
  await foto(pagina, '4-chamamento-excluido')

  // 4. OSC com propostas: bloqueada, informando quantas e quais.
  await pagina.goto('/oscs')
  await esperarTela(pagina)
  dialogo = await (await abrirExclusao(pagina, `Mais ações — ${OSC_COM_PROPOSTAS}`))()
  await expect(dialogo.getByRole('alert')).toContainText('propostas vinculadas')
  await expect(dialogo.getByRole('alert').getByRole('listitem').first()).toBeVisible()
  await foto(pagina, '5-osc-bloqueada')
  expect(await violacoesAxe(pagina)).toEqual([])
  await pagina.keyboard.press('Escape')

  // 5. Proposta com subcoleções: prévia por subcoleção; exclusão pelo protocolo.
  await pagina.goto(`/chamamentos/${CHAMAMENTO_EXCLUIR_PROPOSTA}`)
  await esperarTela(pagina)
  dialogo = await (await abrirExclusao(pagina, 'Mais ações — proposta E2E-EXCLUIR-001'))()
  await expect(dialogo.getByRole('list', { name: 'O que será apagado' })).toContainText('Avaliações da D1: 28')
  await dialogo.getByLabel(/Justificativa da exclusão/).fill(JUSTIFICATIVA)
  await dialogo.getByLabel(/Para confirmar, digite o protocolo da proposta/).fill('E2E-EXCLUIR-001')
  await expect(dialogo.getByRole('button', { name: 'Excluir definitivamente' })).toBeEnabled()
  await pagina.waitForTimeout(400) // fim da transição de cor do botão
  await foto(pagina, '6-proposta-confirmar')
  expect(await violacoesAxe(pagina)).toEqual([])
  await dialogo.getByRole('button', { name: 'Excluir definitivamente' }).click()
  await expect(pagina.getByRole('alertdialog')).toHaveCount(0)
  await expect(pagina.getByText('Nenhuma proposta neste lote').first()).toBeVisible()
  await foto(pagina, '7-proposta-excluida')

  // 6. Diálogo em tela estreita (768).
  const estreita = await comoPerfil(browser, 'administrador', baseURL, 768)
  await estreita.goto('/')
  await esperarTela(estreita)
  await (await abrirExclusao(estreita, `Mais ações — chamamento ${NUMERO_ENSAIO}`))()
  await foto(estreita, '8-chamamento-bloqueado-768')
  expect(await violacoesAxe(estreita)).toEqual([])
})

test('o presidente também vê o menu de exclusão (exclusão livre para os dois perfis)', async ({ browser, baseURL }) => {
  const pagina = await comoPerfil(browser, 'presidente', baseURL)
  await pagina.goto('/')
  await esperarTela(pagina)
  await expect(pagina.getByRole('table', { name: 'Chamamentos' })).toContainText(NUMERO_ENSAIO)
  await expect(pagina.getByRole('button', { name: `Mais ações — chamamento ${NUMERO_ENSAIO}` })).toBeVisible()
})
