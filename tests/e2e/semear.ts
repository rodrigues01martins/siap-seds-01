// Semeia os emuladores para os testes de navegador: usuários de cada perfil de acesso e os dados de
// ensaio (scripts/lib/ensaio.ts), mais uma sessão aberta com foco, para as telas aparecerem preenchidas.
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { CHAMAMENTO_ENSAIO, montarEnsaio } from '../../scripts/lib/ensaio'
import { CHAMAMENTO_FLUXO, PERFIS_E2E, PROPOSTA_FLUXO, SENHA_E2E, SESSAO_ABERTA, propostaE2E } from './perfis'

export default async function semear(): Promise<void> {
  if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    throw new Error('Rode pelos emuladores: npm run test:e2e:baseline')
  }
  const app = initializeApp({ projectId: 'demo-siap-seds' }, 'e2e')
  const auth = getAuth(app)
  const db = getFirestore(app)

  const ensaio = montarEnsaio('2026-11-10')
  const lote = db.batch()
  for (const [caminho, dados] of Object.entries(ensaio.documentos)) lote.set(db.doc(caminho), dados)

  for (const perfil of PERFIS_E2E) {
    const conta = await auth.createUser({ email: perfil.email, password: SENHA_E2E, displayName: perfil.nome })
    perfil.uid = conta.uid
    lote.set(db.doc(`usuarios/${conta.uid}`), {
      email: perfil.email,
      nome: perfil.nome,
      admin: perfil.admin,
      ativo: true,
      permissoes: perfil.permissoes,
      comissao: perfil.comissao,
    })
  }

  const pauta = ensaio.propostas.filter((p) => p.esperado !== 'nao_admitida').map((p) => p.id)
  lote.set(db.doc(`chamamentos/${CHAMAMENTO_ENSAIO}/sessoes/${SESSAO_ABERTA}`), {
    data: '2026-11-10',
    status: 'aberta',
    pauta,
    presentes: PERFIS_E2E.filter((p) => p.comissao).map((p) => ({ uid: p.uid, email: p.email, perfil: p.comissao })),
    declaracoes: PERFIS_E2E.filter((p) => p.comissao).map((p) => ({ uid: p.uid, semImpedimento: true })),
    foco: { tipo: 'resumo', propostaId: propostaE2E(ensaio.propostas) },
    abertaPor: { uid: 'e2e', email: null },
  })
  // Fluxo completo (etapa4.spec.ts): chamamento próprio, sem sessão, com uma proposta a avaliar do zero.
  lote.set(db.doc(`chamamentos/${CHAMAMENTO_FLUXO}`), {
    numero: 'E2E-FLUXO/2026',
    titulo: 'E2E — fluxo completo da sessão à homologação',
    processoSei: '00000.000099/2026-00',
    dataLimitePropostas: '2026-10-31',
    lotes: [{ codigo: 'F1', descricao: 'Lote do fluxo (E2E)' }],
    ensaio: true,
  })
  lote.set(db.doc(`chamamentos/${CHAMAMENTO_FLUXO}/propostas/${PROPOSTA_FLUXO}`), {
    loteCodigo: 'F1',
    oscCnpj: ensaio.oscs[0],
    protocolo: 'E2E-FLUXO-001',
    numeroSEI: '00000099',
    bloqueada: false,
    ensaio: true,
  })
  await lote.commit()
}
