// Reset da sessão pela interface, gravando pela /api nos emuladores: o presidente registra dois níveis na
// sessão aberta, abre "Resetar sessão", vê a prévia, confirma com justificativa e RESETAR; os níveis somem, a
// sessão fica "Reiniciada" e a ata registra o reset. Axe (WCAG 2.2 AA) em cada estado e screenshots em
// docs/auditoria-design/reset-sessao/. Uso: npm run test:e2e:reset
import { expect, test, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { comoPerfil, esperarTela, violacoesAxe } from './apoio'
import { CHAMAMENTO_RESET, PROPOSTA_RESET, SESSAO_RESET } from './perfis'

const PASTA = join('docs', 'auditoria-design', 'reset-sessao')
const CH = `/chamamentos/${CHAMAMENTO_RESET}`
const SESSAO = `${CH}/sessoes/${SESSAO_RESET}`
const D1 = `${CH}/propostas/${PROPOSTA_RESET}/d1`
const MOTIVO = 'Conflito de interesse declarado após a sessão (teste automatizado E2E).'

async function foto(pagina: Page, nome: string, inteira = false) {
  mkdirSync(PASTA, { recursive: true })
  await pagina.screenshot({ path: join(PASTA, `${nome}.png`), fullPage: inteira })
}

async function avaliarSubcriterio(pagina: Page, faltam: number) {
  const resumo = pagina.getByRole('region', { name: 'Resumo da D1' })
  await pagina.getByRole('radio', { name: 'Nível 3', exact: true }).check()
  await pagina.getByRole('radio', { name: 'Unanimidade' }).check()
  await pagina.getByRole('textbox', { name: /^Justificativa/ }).fill('Registro do teste de reset (E2E), nível 3 por unanimidade.')
  await pagina.getByRole('textbox', { name: 'Páginas citadas' }).fill('1')
  await resumo.getByRole('button', { name: /^Salvar avaliação/ }).click()
  await expect(resumo).toContainText(`Faltam ${faltam - 1} de`)
}

test('reset da sessão: prévia, confirmação, sessão reiniciada e ata', async ({ browser, baseURL }) => {
  const pagina = await comoPerfil(browser, 'administrador', baseURL)

  // 1. Dois níveis registrados na sessão aberta.
  await pagina.goto(D1)
  await esperarTela(pagina)
  await avaliarSubcriterio(pagina, 28)
  await avaliarSubcriterio(pagina, 27)

  // 2. Tela da sessão: seção própria "Reset da sessão", fora das ações do cabeçalho.
  await pagina.goto(SESSAO)
  await esperarTela(pagina)
  const secao = pagina.getByRole('region', { name: 'Reset da sessão' })
  await secao.scrollIntoViewIfNeeded()
  await foto(pagina, '1-sessao-secao-reset', true)
  expect(await violacoesAxe(pagina)).toEqual([])

  // 3. Diálogo com a prévia; só habilita com justificativa e RESETAR.
  await secao.getByRole('button', { name: 'Resetar sessão' }).click()
  const dialogo = pagina.getByRole('alertdialog')
  await expect(dialogo.getByRole('list', { name: 'Será apagado' })).toContainText('da D1')
  await expect(dialogo).toContainText('2 registros')
  const confirmar = dialogo.getByRole('button', { name: 'Resetar sessão' })
  await expect(confirmar).toBeDisabled()
  await foto(pagina, '2-dialogo-previa')
  expect(await violacoesAxe(pagina)).toEqual([])
  await dialogo.getByLabel(/Justificativa do reset/).fill(MOTIVO)
  await dialogo.getByLabel(/Para confirmar, digite RESETAR/).fill('RESETAR')
  await expect(confirmar).toBeEnabled()
  await pagina.waitForTimeout(400) // fim da transição de cor do botão
  await foto(pagina, '3-dialogo-confirmar')

  // 4. Sessão reiniciada: toast, selo e quem/quando/por quê.
  await confirmar.click()
  await expect(pagina.getByRole('alertdialog')).toHaveCount(0)
  await expect(pagina.getByText('Sessão reiniciada', { exact: true }).first()).toBeVisible()
  await expect(pagina.getByRole('status', { name: 'Sessão reiniciada' })).toContainText(MOTIVO)
  await expect(pagina.getByRole('region', { name: 'Reset da sessão' })).toBeVisible()
  await foto(pagina, '4-sessao-reiniciada')
  expect(await violacoesAxe(pagina)).toEqual([])

  // 5. Os níveis sumiram (28 pendentes) e, sem sessão aberta, a D1 fica só para consulta.
  await pagina.goto(D1)
  await esperarTela(pagina)
  await expect(pagina.getByRole('region', { name: 'Resumo da D1' })).toContainText('Faltam 28 de')
  await expect(pagina.getByText(/Nenhuma sessão aberta/).first()).toBeVisible()
  await foto(pagina, '5-d1-depois-do-reset')

  // 6. A ata registra o reset.
  await pagina.goto(`${SESSAO}/ata`)
  await esperarTela(pagina)
  const texto = pagina.getByRole('textbox', { name: 'Texto da ata' })
  await expect(texto).toHaveValue(/REINÍCIO DA SESSÃO \(RESET\)/)
  await expect(texto).toHaveValue(new RegExp(`Motivo: ${MOTIVO.replace(/[()]/g, '\\$&')}`))
  await foto(pagina, '6-ata-com-reset')

  // 7. Painel do chamamento: selo "Reiniciada" na lista de sessões.
  await pagina.goto(CH)
  await esperarTela(pagina)
  await expect(pagina.getByRole('table', { name: 'Sessões' })).toContainText('Reiniciada')
  await pagina.getByRole('table', { name: 'Sessões' }).scrollIntoViewIfNeeded()
  await foto(pagina, '7-painel-sessao-reiniciada')
})

test('quem não é o presidente não vê o reset', async ({ browser, baseURL }) => {
  const sessao = await comoPerfil(browser, 'avaliador', baseURL)
  await sessao.goto(SESSAO)
  await esperarTela(sessao)
  await expect(sessao.getByRole('heading', { level: 1 })).toContainText('Sessão de')
  await expect(sessao.getByRole('button', { name: 'Resetar sessão' })).toHaveCount(0)
})
