// @vitest-environment jsdom
// A projeção (telão) acompanha a sessão em tempo real: uma avaliação registrada pela /api aparece
// sem recarregar a página. Usa o SDK do navegador contra o emulador, logado como o usuário do telão
// (perfil membro), com as firestore.rules de verdade.

import '@testing-library/jest-dom/vitest'
import { readFileSync } from 'node:fs'
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import * as avaliacao from '../../api/avaliacao'
import { TelaProjecao } from '../../src/features/projecao/TelaProjecao'
import { CAMINHO_PROPOSTA, CH, PROP, SESSAO, chamar, criarUsuario, limparAuth, limparFirestore, semearProposta, type Usuario } from './apoio'
import { obterAdmin } from '../../api/_lib/admin'

const banco = vi.hoisted(() => ({ db: null as unknown }))
vi.mock('../../src/lib/firebase', () => ({ obterDb: () => banco.db, obterAuth: () => ({}) }))

let ambiente: RulesTestEnvironment
let relator: Usuario

beforeAll(async () => {
  await limparAuth()
  await limparFirestore()
  relator = await criarUsuario('relator')
  ambiente = await initializeTestEnvironment({
    projectId: process.env.GCLOUD_PROJECT ?? 'demo-siap-seds',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  })
  banco.db = ambiente.authenticatedContext('uid-telao', { perfil: 'membro' }).firestore()
  await semearProposta()
  await obterAdmin().db.doc(CAMINHO_PROPOSTA).update({ numeroSEI: '95570001' })
  await obterAdmin()
    .db.doc(`chamamentos/${CH}/sessoes/${SESSAO}`)
    .update({ foco: { tipo: 'subcriterio', propostaId: PROP, subcriterio: '3.1' } })
})

afterAll(async () => {
  await ambiente?.cleanup()
})

describe('projeção em tempo real (emuladores)', () => {
  it('reflete uma nova avaliação e a troca de foco sem recarregar a página', async () => {
    render(
      <MemoryRouter initialEntries={[`/projecao/${CH}/${SESSAO}`]}>
        <Routes>
          <Route path="/projecao/:ch/:sessaoId" element={<TelaProjecao />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(await screen.findByRole('heading', { name: /^3\.1 — / }, { timeout: 15_000 })).toBeInTheDocument()
    expect(await screen.findByText('Aguardando registro da Comissão')).toBeInTheDocument()

    // A Comissão registra o 2.1 pela /api: a avaliação é gravada e o foco muda na mesma transação.
    const r = await chamar(
      avaliacao,
      'PUT',
      {
        chamamentoId: CH,
        propostaId: PROP,
        codigo: '2.1',
        nivel: 4,
        justificativa: 'Educação integrada ao PIA com metas e responsáveis definidos.',
        paginas: [3, 4],
        decisao: 'unanimidade',
        sessaoId: SESSAO,
      },
      relator.token,
    )
    expect(r.status).toBe(200)

    expect(await screen.findByRole('heading', { name: /^2\.1 — / }, { timeout: 15_000 })).toBeInTheDocument()
    expect(await screen.findByText('Educação integrada ao PIA com metas e responsáveis definidos.', {}, { timeout: 15_000 })).toBeInTheDocument()
    const registrado = screen.getByRole('listitem', { name: 'Nível 4' })
    expect(registrado).toHaveAttribute('aria-current', 'true')
    expect(within(screen.getByRole('banner')).getByText(/Caderno SEI 95570001/)).toBeInTheDocument()
  })
})
