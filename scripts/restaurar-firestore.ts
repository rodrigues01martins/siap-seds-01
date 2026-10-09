// Restaura um backup (scripts/backup-firestore.ts) no projeto DEV — nunca em prod.
// Confere formato e SHA-256 antes de gravar; sem --confirmar só mostra o que faria.
// Arquivo cifrado (.cifrado) é aberto com a senha da variável BACKUP_SENHA.
//
// Uso: FIREBASE_SERVICE_ACCOUNT='{...}' [BACKUP_SENHA=...] npm run restaurar -- --projeto dev --arquivo backups/backup-....json [--substituir] [--confirmar]

import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { parseArgs } from 'node:util'
import { getFirestore } from 'firebase-admin/firestore'
import { executar, iniciarAdmin } from './lib/admin'
import { registroDeScript } from './lib/auditoria'
import { conferirBackup, decodificar, type DadosDocumento } from './lib/backup'
import { decifrar, estaCifrado, exigirSenha } from './lib/cifra'
import { restaurarDocumentos } from './lib/firestore'

executar(async () => {
  const { values } = parseArgs({
    options: {
      projeto: { type: 'string' },
      arquivo: { type: 'string' },
      substituir: { type: 'boolean', default: false },
      confirmar: { type: 'boolean', default: false },
    },
  })
  if (values.projeto !== 'dev') throw new Error('A restauração só é permitida no projeto dev (--projeto dev).')
  if (!values.arquivo) throw new Error('Informe --arquivo com o caminho do backup.')

  let texto = readFileSync(values.arquivo, 'utf8')
  if (estaCifrado(texto)) texto = decifrar(texto, exigirSenha(process.env.BACKUP_SENHA))
  const backup = conferirBackup(JSON.parse(texto))
  const total = Object.keys(backup.documentos).length

  console.log(`Backup de ${backup.projeto}, gerado em ${backup.geradoEm} por ${backup.executor}.`)
  console.log(`Chamamentos: ${backup.chamamentos.join(', ')} · ${total} documentos: ${JSON.stringify(backup.contagem)}`)
  console.log(`SHA-256 conferido: ${backup.sha256}`)
  if (!values.confirmar) {
    console.log('Simulação: nada foi gravado. Repita com --confirmar para restaurar (e --substituir se o chamamento já existir no dev).')
    return
  }

  const { app, projectId, executor } = iniciarAdmin('dev', false)
  const db = getFirestore(app)
  const documentos = decodificar(backup.documentos, db) as Record<string, DadosDocumento>
  const gravados = await restaurarDocumentos(db, documentos, backup.chamamentos, { substituir: values.substituir })
  await db.collection('auditoria').doc().create(
    registroDeScript({
      acao: 'backup.restaurado',
      caminho: `chamamentos/${backup.chamamentos[0] ?? ''}`,
      detalhes: {
        arquivo: basename(values.arquivo),
        projetoOrigem: backup.projeto,
        geradoEm: backup.geradoEm,
        sha256: backup.sha256,
        chamamentos: backup.chamamentos,
        documentos: gravados,
        substituiu: values.substituir,
      },
      origem: 'scripts/restaurar-firestore.ts',
      executor,
    }),
  )
  console.log(`Restaurados ${gravados} documentos no dev.`)
  if (backup.projeto !== projectId) console.log('Lembrete: o dev agora tem dados reais de produção. Apague-os ao terminar o teste.')
})
