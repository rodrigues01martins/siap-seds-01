// Semeia os emuladores para os testes de navegador: usuários de cada perfil de acesso e os dados de
// ensaio (scripts/lib/ensaio.ts), mais uma sessão aberta com foco, para as telas aparecerem preenchidas.
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { CHAMAMENTO_ENSAIO, montarEnsaio } from '../../scripts/lib/ensaio'
import { CHAMAMENTO_EXCLUIR, CHAMAMENTO_EXCLUIR_PROPOSTA, CHAMAMENTO_FLUXO, CHAMAMENTOS_USO, PROPOSTA_EXCLUIR, PERFIS_E2E, PERFIS_USO, PROPOSTA_FLUXO, PROPOSTA_USO, SENHA_E2E, SESSAO_ABERTA, propostaE2E } from './perfis'

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

  for (const perfil of [...PERFIS_E2E, ...PERFIS_USO]) {
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
  // Testes de uso (uso.spec.ts): a proposta apta e completa do ensaio copiada para um chamamento por fluxo.
  const origem = `chamamentos/${CHAMAMENTO_ENSAIO}/propostas/${propostaE2E(ensaio.propostas)}`
  const comissao = [...PERFIS_E2E, ...PERFIS_USO].filter((p) => p.comissao)
  for (const [fluxo, ch] of Object.entries(CHAMAMENTOS_USO)) {
    const base = `chamamentos/${ch}`
    lote.set(db.doc(base), { ...ensaio.documentos[`chamamentos/${CHAMAMENTO_ENSAIO}`], numero: `USO-${fluxo.toUpperCase()}/2026`, titulo: `Teste de uso — ${fluxo}` })
    const proposta = { ...ensaio.documentos[origem]! }
    if (fluxo === 'relator') {
      // Do zero: sem admissibilidade, sem avaliação, sem sessão.
      delete proposta.admissibilidade
      delete proposta.totais
    }
    if (fluxo === 'membro') delete proposta.totais // admitida, ainda sem níveis
    lote.set(db.doc(`${base}/propostas/${PROPOSTA_USO}`), proposta)
    if (fluxo === 'presidente' || fluxo === 'telao') {
      for (const [caminho, dados] of Object.entries(ensaio.documentos)) {
        if (caminho.startsWith(`${origem}/`)) lote.set(db.doc(`${base}/propostas/${PROPOSTA_USO}/${caminho.slice(origem.length + 1)}`), dados)
      }
    }
    if (fluxo !== 'relator') {
      lote.set(db.doc(`${base}/sessoes/uso-sessao`), {
        data: '2026-11-10',
        status: 'aberta',
        pauta: [PROPOSTA_USO],
        presentes: comissao.map((p) => ({ uid: p.uid, email: p.email, perfil: p.comissao })),
        declaracoes: comissao.map((p) => ({ uid: p.uid, semImpedimento: true })),
        foco: null,
        abertaPor: { uid: 'e2e', email: null },
      })
    }
  }
  // Exclusão de cadastros (exclusao.spec.ts): um chamamento sem propostas nem sessões e uma proposta (com as
  // subcoleções da proposta do ensaio) num chamamento próprio — os dois são apagados pelo teste.
  const chamamentoEnsaio = ensaio.documentos[`chamamentos/${CHAMAMENTO_ENSAIO}`]
  lote.set(db.doc(`chamamentos/${CHAMAMENTO_EXCLUIR}`), { ...chamamentoEnsaio, numero: 'E2E-EXCLUIR/2026', titulo: 'E2E — chamamento cadastrado por engano' })
  lote.set(db.doc(`chamamentos/${CHAMAMENTO_EXCLUIR_PROPOSTA}`), { ...chamamentoEnsaio, numero: 'E2E-EXCLUIR-PROP/2026', titulo: 'E2E — proposta cadastrada por engano' })
  const excluir = `chamamentos/${CHAMAMENTO_EXCLUIR_PROPOSTA}/propostas/${PROPOSTA_EXCLUIR}`
  lote.set(db.doc(excluir), { ...ensaio.documentos[origem]!, protocolo: 'E2E-EXCLUIR-001', bloqueada: false })
  for (const [caminho, dados] of Object.entries(ensaio.documentos)) {
    if (caminho.startsWith(`${origem}/`)) lote.set(db.doc(`${excluir}/${caminho.slice(origem.length + 1)}`), dados)
  }
  await lote.commit()
}
