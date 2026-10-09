// Minuta de ata da sessão da Comissão: texto gerado a partir dos registros (data, presentes, declarações
// de impedimento, propostas analisadas, decisões por maioria com votos divergentes, desempates e
// diligências), editável pelo relator antes de exportar o PDF. O PDF usa o texto final.

import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces'
import { formatarCnpj } from '../domain/cnpj.js'
import { formatarNumero } from '../domain/formatacao.js'
import type { Perfil } from '../domain/perfis.js'
import { montarPdf, type Rodape } from './documento.js'

export interface DadosAta {
  chamamento: { numero: string; titulo: string }
  sessao: {
    id: string
    /** AAAA-MM-DD */
    data: string
    presentes: { uid: string; email: string | null; perfil: Perfil }[]
    declaracoes: { uid: string; semImpedimento: boolean; motivo?: string }[]
  }
  /** Propostas da pauta. */
  propostas: {
    id: string
    nomeOsc: string
    cnpj: string
    loteCodigo: string
    numeroSEI?: string
    /** Rótulo do status (ROTULO_STATUS). */
    status: string
    nf: number | null
    bloqueada: boolean
  }[]
  /** Subcritérios registrados nesta sessão com decisão por maioria. */
  decisoesPorMaioria: { propostaId: string; codigo: string; titulo: string; nivel: number; votoDivergente?: string; justificativa: string }[]
  /** Decisões de desempate (RF-27) que envolvem propostas da pauta; ordem já com os nomes das OSCs. */
  desempates: { loteCodigo: string; nf: number; ordem: string[]; justificativa: string }[]
  /** Diligências (RF-28) das propostas da pauta. */
  diligencias: {
    propostaId: string
    objeto: string
    prazo: string
    status: 'aberta' | 'respondida' | 'encerrada'
    resposta?: string
    conclusao?: string
  }[]
}

const ROTULO_PERFIL: Record<Perfil, string> = {
  admin: 'Administrador',
  presidente: 'Presidente',
  relator: 'Relator',
  membro: 'Membro',
  controle: 'Controle',
}
const ROTULO_DILIGENCIA = { aberta: 'Aberta', respondida: 'Respondida', encerrada: 'Encerrada' }

const dataBr = (iso: string) => iso.split('-').reverse().join('/')

export const TITULO_ATA = 'ATA DA SESSÃO DA COMISSÃO DE SELEÇÃO'

export function textoInicialAta(d: DadosAta): string {
  const nomeDe = new Map(d.propostas.map((p) => [p.id, p.nomeOsc]))
  const pessoa = new Map(d.sessao.presentes.map((p) => [p.uid, p.email ?? p.uid]))
  const linhas: string[] = [
    TITULO_ATA,
    `Chamamento Público nº ${d.chamamento.numero} — ${d.chamamento.titulo}`,
    `Data da sessão: ${dataBr(d.sessao.data)}`,
    '',
    `Aos ${dataBr(d.sessao.data)}, reuniu-se a Comissão de Seleção para a análise das propostas abaixo, com o registro das decisões a seguir.`,
    '',
    '1. PRESENTES',
    ...d.sessao.presentes.map((p) => `- ${p.email ?? p.uid} (${ROTULO_PERFIL[p.perfil]})`),
    '',
    '2. DECLARAÇÕES DE IMPEDIMENTO',
    ...d.sessao.presentes.map((p) => {
      const declaracao = d.sessao.declaracoes.find((x) => x.uid === p.uid)
      const quem = p.email ?? p.uid
      if (!declaracao) return `- ${quem}: sem declaração registrada.`
      return declaracao.semImpedimento ? `- ${quem}: declarou não haver impedimento.` : `- ${quem}: declarou impedimento — ${declaracao.motivo ?? ''}`
    }),
    ...d.sessao.declaracoes.filter((x) => !pessoa.has(x.uid)).map((x) => `- ${x.uid}: ${x.semImpedimento ? 'declarou não haver impedimento.' : `declarou impedimento — ${x.motivo ?? ''}`}`),
    '',
    '3. PROPOSTAS ANALISADAS',
    ...(d.propostas.length === 0
      ? ['Nenhuma proposta na pauta.']
      : d.propostas.map(
          (p) =>
            `- ${p.nomeOsc} (CNPJ ${formatarCnpj(p.cnpj)}) — Lote ${p.loteCodigo}${p.numeroSEI ? ` — SEI ${p.numeroSEI}` : ''} — NF ${p.nf === null ? '—' : formatarNumero(p.nf)} — ${p.status}`,
        )),
    '',
    '4. DECISÕES POR MAIORIA',
    ...(d.decisoesPorMaioria.length === 0
      ? ['Todas as decisões desta sessão foram por unanimidade.']
      : d.decisoesPorMaioria.map(
          (x) =>
            `- ${nomeDe.get(x.propostaId) ?? x.propostaId} — subcritério ${x.codigo} (${x.titulo}): nível ${x.nivel}, por maioria.${x.votoDivergente ? ` Voto divergente: ${x.votoDivergente}` : ''} Justificativa: ${x.justificativa}`,
        )),
    '',
    '5. DESEMPATES (RF-27)',
    ...(d.desempates.length === 0
      ? ['Não houve decisão de desempate.']
      : d.desempates.map((x) => `- Lote ${x.loteCodigo}, NF ${formatarNumero(x.nf)}: ${x.ordem.join(' > ')}. Justificativa: ${x.justificativa}`)),
    '',
    '6. DILIGÊNCIAS (RF-28)',
    ...(d.diligencias.length === 0
      ? ['Não houve diligência.']
      : d.diligencias.map(
          (x) =>
            `- ${nomeDe.get(x.propostaId) ?? x.propostaId}: ${x.objeto} Prazo: ${dataBr(x.prazo)}. Situação: ${ROTULO_DILIGENCIA[x.status]}.${x.resposta ? ` Resposta: ${x.resposta}` : ''}${x.conclusao ? ` Conclusão: ${x.conclusao}` : ''}`,
        )),
    '',
    '7. ENCERRAMENTO',
    'Nada mais havendo a tratar, a sessão foi encerrada e eu, relator(a), lavrei a presente ata, que vai assinada pelos membros presentes.',
    '',
    ...d.sessao.presentes.flatMap((p) => ['', '______________________________________', `${p.email ?? p.uid} (${ROTULO_PERFIL[p.perfil]})`]),
  ]
  return linhas.join('\n')
}

/** Dados que entram no código de verificação da ata: os registros usados e o texto final. */
export function dadosVerificadosAta(dados: DadosAta, texto: string) {
  return { dados, texto }
}

const ehTituloDeSecao = (linha: string) => /^\d+\.\s+\S/.test(linha) && linha === linha.toUpperCase()

/** PDF a partir do texto final: 1ª linha = título; linhas "N. TÍTULO" em negrito; demais como parágrafos. */
export function montarAtaPdf(texto: string, rodape: Rodape, minuta: boolean): TDocumentDefinitions {
  const [primeira = TITULO_ATA, ...resto] = texto.replace(/\r\n/g, '\n').split('\n')
  const conteudo: Content[] = resto.map((linha) =>
    linha.trim() === ''
      ? { text: ' ', fontSize: 5 }
      : ehTituloDeSecao(linha.trim())
        ? { text: linha.trim(), style: 'secao' }
        : { text: linha, alignment: 'justify' as const, margin: [0, 1, 0, 1] as [number, number, number, number] },
  )
  return montarPdf({ titulo: primeira.trim() || TITULO_ATA, conteudo, rodape, minuta })
}
