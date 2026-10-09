// Backup do Firestore em JSON datado: árvore completa do(s) chamamento(s), OSCs das propostas, matriz e
// auditoria correspondente. Lê com o firebase-admin (não usa o export gerenciado, que exige o plano Blaze).
// Com BACKUP_SENHA definida (obrigatória no GitHub Actions), o arquivo sai cifrado (AES-256-GCM).
//
// Uso: FIREBASE_SERVICE_ACCOUNT='{...}' npm run backup -- --projeto dev|prod [--chamamento ID ...] [--saida pasta] [--confirmar]
//      (prod exige --confirmar; o backup só lê, mas o aviso evita confundir os projetos)

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { getFirestore } from 'firebase-admin/firestore'
import { executar, iniciarAdmin } from './lib/admin'
import { codificar, montarBackup, nomeArquivoBackup, type DadosDocumento } from './lib/backup'
import { cifrar, exigirSenha } from './lib/cifra'
import { exportarChamamentos } from './lib/firestore'

executar(async () => {
  const { values } = parseArgs({
    options: {
      projeto: { type: 'string' },
      chamamento: { type: 'string', multiple: true, default: [] },
      saida: { type: 'string', default: 'backups' },
      cifrar: { type: 'boolean', default: false },
      confirmar: { type: 'boolean', default: false },
    },
  })
  const senha = values.cifrar || process.env.BACKUP_SENHA ? exigirSenha(process.env.BACKUP_SENHA) : null
  const { app, projectId, executor } = iniciarAdmin(values.projeto, values.confirmar)
  const geradoEm = new Date()

  const exportado = await exportarChamamentos(getFirestore(app), values.chamamento)
  const backup = montarBackup({
    projeto: projectId,
    executor,
    chamamentos: exportado.chamamentos,
    documentos: codificar(exportado.documentos) as Record<string, DadosDocumento>,
    geradoEm,
  })

  mkdirSync(values.saida, { recursive: true })
  const nome = nomeArquivoBackup(projectId, values.chamamento, geradoEm)
  const caminho = join(values.saida, senha ? `${nome}.cifrado` : nome)
  const texto = JSON.stringify(backup, null, 1)
  writeFileSync(caminho, senha ? cifrar(texto, senha) : texto, { mode: 0o600 })

  // Só contagens e o resumo: nenhum dado das propostas no log.
  console.log(`Backup gravado em ${caminho}${senha ? ' (cifrado)' : ''}`)
  console.log(`Chamamentos: ${backup.chamamentos.join(', ') || 'nenhum'}`)
  console.log(`Documentos por coleção: ${JSON.stringify(backup.contagem)}`)
  console.log(`SHA-256 do conteúdo: ${backup.sha256}`)
  if (!senha) console.log('Atenção: arquivo SEM cifra, com dados das propostas. Guarde-o em local restrito.')
})
