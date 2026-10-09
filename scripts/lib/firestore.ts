// Leitura e gravação em lote no Firestore para os scripts de backup, restauração e ensaio
// (firebase-admin; as regras do Firestore não se aplicam ao Admin SDK).

import type { DocumentReference, DocumentSnapshot, Firestore } from 'firebase-admin/firestore'
import type { DadosDocumento } from './backup'
import { CHAMAMENTO_ENSAIO } from './ensaio'

const LOTE_LEITURA = 300

async function lerReferencias(db: Firestore, refs: DocumentReference[]): Promise<DocumentSnapshot[]> {
  const lidos: DocumentSnapshot[] = []
  for (let i = 0; i < refs.length; i += LOTE_LEITURA) lidos.push(...(await db.getAll(...refs.slice(i, i + LOTE_LEITURA))))
  return lidos
}

/** Documento e tudo abaixo dele (subcoleções em qualquer profundidade, inclusive sob documentos vazios). */
async function coletarArvore(db: Firestore, ref: DocumentReference, saida: Record<string, DadosDocumento>): Promise<void> {
  const atual = await ref.get()
  if (atual.exists) saida[ref.path] = atual.data()!
  for (const colecao of await ref.listCollections()) await coletarColecao(db, colecao.id, ref, saida)
}

async function coletarColecao(db: Firestore, nome: string, pai: DocumentReference, saida: Record<string, DadosDocumento>): Promise<void> {
  const refs = await pai.collection(nome).listDocuments()
  for (const lido of await lerReferencias(db, refs)) if (lido.exists) saida[lido.ref.path] = lido.data()!
  for (const ref of refs) {
    for (const sub of await ref.listCollections()) await coletarColecao(db, sub.id, ref, saida)
  }
}

async function existeOuTemFilhos(ref: DocumentReference): Promise<boolean> {
  return (await ref.get()).exists || (await ref.listCollections()).length > 0
}

/**
 * Exporta os chamamentos (todos, se a lista vier vazia), as OSCs das suas propostas, a matriz e os
 * registros de auditoria desses documentos. Devolve os dados como o Firestore os entrega (sem codificar).
 */
export async function exportarChamamentos(
  db: Firestore,
  pedidos: string[] = [],
): Promise<{ chamamentos: string[]; documentos: Record<string, DadosDocumento> }> {
  const chamamentos = pedidos.length > 0 ? pedidos : (await db.collection('chamamentos').listDocuments()).map((r) => r.id)
  const documentos: Record<string, DadosDocumento> = {}

  for (const ch of chamamentos) {
    const ref = db.doc(`chamamentos/${ch}`)
    if (!(await existeOuTemFilhos(ref))) throw new Error(`Chamamento ${ch} não encontrado.`)
    await coletarArvore(db, ref, documentos)
  }

  const cnpjs = [
    ...new Set(
      Object.entries(documentos)
        .filter(([caminho]) => /^chamamentos\/[^/]+\/propostas\/[^/]+$/.test(caminho))
        .map(([, d]) => d.oscCnpj)
        .filter((c): c is string => typeof c === 'string'),
    ),
  ]
  for (const osc of await lerReferencias(db, cnpjs.map((c) => db.doc(`oscs/${c}`)))) {
    if (osc.exists) documentos[osc.ref.path] = osc.data()!
  }

  for (const matriz of (await db.collection('matrizes').get()).docs) documentos[matriz.ref.path] = matriz.data()

  // Auditoria: caminhos dentro de cada chamamento ('/' < '0' delimita o prefixo) e das OSCs exportadas.
  const auditoria = db.collection('auditoria')
  const consultas = chamamentos.flatMap((ch) => [
    auditoria.where('caminho', '==', `chamamentos/${ch}`),
    auditoria.where('caminho', '>=', `chamamentos/${ch}/`).where('caminho', '<', `chamamentos/${ch}0`),
  ])
  for (let i = 0; i < cnpjs.length; i += 30) {
    consultas.push(auditoria.where('caminho', 'in', cnpjs.slice(i, i + 30).map((c) => `oscs/${c}`)))
  }
  for (const consulta of consultas) {
    for (const registro of (await consulta.get()).docs) documentos[registro.ref.path] = registro.data()
  }

  return { chamamentos, documentos }
}

/** Grava os documentos (set, sobrescrevendo) com o BulkWriter. Devolve quantos gravou. */
export async function gravarDocumentos(db: Firestore, documentos: Record<string, DadosDocumento>): Promise<number> {
  const escritor = db.bulkWriter()
  for (const [caminho, dados] of Object.entries(documentos)) void escritor.set(db.doc(caminho), dados)
  await escritor.close()
  return Object.keys(documentos).length
}

/**
 * Restaura os documentos de um backup. Se algum chamamento do backup já existir, recusa — a não ser
 * com `substituir`, que apaga antes a árvore inteira desse chamamento.
 */
export async function restaurarDocumentos(
  db: Firestore,
  documentos: Record<string, DadosDocumento>,
  chamamentos: string[],
  { substituir }: { substituir: boolean },
): Promise<number> {
  for (const ch of chamamentos) {
    const ref = db.doc(`chamamentos/${ch}`)
    if (!(await existeOuTemFilhos(ref))) continue
    if (!substituir) throw new Error(`O chamamento ${ch} já existe no projeto alvo. Use --substituir para apagá-lo e restaurar.`)
    await db.recursiveDelete(ref)
  }
  return gravarDocumentos(db, documentos)
}

/** Apaga o chamamento do ensaio (com tudo abaixo) e as OSCs marcadas como ensaio. */
export async function removerEnsaio(db: Firestore): Promise<{ oscs: number }> {
  await db.recursiveDelete(db.doc(`chamamentos/${CHAMAMENTO_ENSAIO}`))
  const oscs = await db.collection('oscs').where('ensaio', '==', true).get()
  const lote = db.batch()
  oscs.docs.forEach((d) => lote.delete(d.ref))
  await lote.commit()
  return { oscs: oscs.size }
}
