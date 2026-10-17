// Minuta de ata da sessão da Comissão: texto gerado a partir dos registros (data, lote(s) em pauta, presentes
// com seus papéis, propostas analisadas, decisões por maioria com votos divergentes, desempates e
// diligências) e, se a sessão foi resetada, cada reset (data, hora, presidente e motivo); editável pelo relator
// antes de exportar o PDF. O PDF usa o texto final.

import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces'
import { formatarCnpj } from '../domain/cnpj.js'
import { formatarNumero } from '../domain/formatacao.js'
import { ROTULO_PAPEL, type PapelSessao } from '../domain/comissao.js'
import { montarPdf, type Rodape } from './documento.js'

export interface DadosAta {
  chamamento: { numero: string; titulo: string }
  sessao: {
    id: string
    /** AAAA-MM-DD */
    data: string
    /** Lote(s) em pauta. */
    lotes: string[]
    /** Quem esteve presente: só o nome e o papel (sem login). */
    presentes: { nome: string; papel: PapelSessao }[]
    /** Resets da sessão (registros desconsiderados), na ordem em que aconteceram; `por` = quem resetou. */
    resets?: { em: Date; por: string; motivo: string }[]
  }
  /** Propostas dos lotes da pauta. */
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

const ROTULO_DILIGENCIA = { aberta: 'Aberta', respondida: 'Respondida', encerrada: 'Encerrada' }

const dataBr = (iso: string) => iso.split('-').reverse().join('/')
const FUSO = 'America/Sao_Paulo'
const diaBr = (d: Date) => d.toLocaleDateString('pt-BR', { timeZone: FUSO })
const horaBr = (d: Date) => d.toLocaleTimeString('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' })

export const TITULO_ATA = 'ATA DA SESSÃO DA COMISSÃO DE SELEÇÃO'

export function textoInicialAta(d: DadosAta): string {
  const nomeDe = new Map(d.propostas.map((p) => [p.id, p.nomeOsc]))
  const linhas: string[] = [
    TITULO_ATA,
    `Chamamento Público nº ${d.chamamento.numero} — ${d.chamamento.titulo}`,
    `Data da sessão: ${dataBr(d.sessao.data)}`,
    `Lote(s) em pauta: ${d.sessao.lotes.join(', ') || '—'}`,
    '',
    `Aos ${dataBr(d.sessao.data)}, reuniu-se a Comissão de Seleção para a análise das propostas abaixo, com o registro das decisões a seguir.`,
    '',
    '1. PRESENTES',
    ...(d.sessao.presentes.length === 0 ? ['Nenhum presente registrado.'] : d.sessao.presentes.map((p) => `- ${p.nome} (${ROTULO_PAPEL[p.papel]})`)),
    '',
    '2. PROPOSTAS ANALISADAS',
    ...(d.propostas.length === 0
      ? ['Nenhuma proposta na pauta.']
      : d.propostas.map(
          (p) =>
            `- ${p.nomeOsc} (CNPJ ${formatarCnpj(p.cnpj)}) — Lote ${p.loteCodigo}${p.numeroSEI ? ` — SEI ${p.numeroSEI}` : ''} — NF ${p.nf === null ? '—' : formatarNumero(p.nf)} — ${p.status}`,
        )),
    '',
    '3. DECISÕES POR MAIORIA',
    ...(d.decisoesPorMaioria.length === 0
      ? ['Todas as decisões desta sessão foram por unanimidade.']
      : d.decisoesPorMaioria.map(
          (x) =>
            `- ${nomeDe.get(x.propostaId) ?? x.propostaId} — subcritério ${x.codigo} (${x.titulo}): nível ${x.nivel}, por maioria.${x.votoDivergente ? ` Voto divergente: ${x.votoDivergente}` : ''} Justificativa: ${x.justificativa}`,
        )),
    '',
    '4. DESEMPATES (RF-27)',
    ...(d.desempates.length === 0
      ? ['Não houve decisão de desempate.']
      : d.desempates.map((x) => `- Lote ${x.loteCodigo}, NF ${formatarNumero(x.nf)}: ${x.ordem.join(' > ')}. Justificativa: ${x.justificativa}`)),
    '',
    '5. DILIGÊNCIAS (RF-28)',
    ...(d.diligencias.length === 0
      ? ['Não houve diligência.']
      : d.diligencias.map(
          (x) =>
            `- ${nomeDe.get(x.propostaId) ?? x.propostaId}: ${x.objeto} Prazo: ${dataBr(x.prazo)}. Situação: ${ROTULO_DILIGENCIA[x.status]}.${x.resposta ? ` Resposta: ${x.resposta}` : ''}${x.conclusao ? ` Conclusão: ${x.conclusao}` : ''}`,
        )),
    '',
    ...((d.sessao.resets ?? []).length === 0
      ? []
      : [
          'REINÍCIO DA SESSÃO (RESET)',
          ...d.sessao.resets!.map(
            (r) =>
              `- Em ${diaBr(r.em)}, às ${horaBr(r.em)}, a sessão foi resetada por ${r.por}: os registros feitos nela foram desconsiderados e voltaram ao estado anterior. Motivo: ${r.motivo}`,
          ),
          '',
        ]),
    '6. ENCERRAMENTO',
    'Nada mais havendo a tratar, a sessão foi encerrada e eu, relator(a), lavrei a presente ata, que vai assinada pelos membros presentes.',
    '',
    ...d.sessao.presentes.flatMap((p) => ['', '______________________________________', `${p.nome} (${ROTULO_PAPEL[p.papel]})`]),
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
