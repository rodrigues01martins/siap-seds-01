// Minuta de ata da sessão da Comissão: texto gerado a partir dos registros (data, lote(s) em pauta, presentes
// com seus papéis, propostas analisadas com a situação e a conclusão, e desempates); editável antes de
// exportar o PDF. O PDF usa o texto final e sai com MINUTA se houver proposta não concluída.

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
  }
  /** Propostas dos lotes da pauta. */
  propostas: {
    id: string
    nomeOsc: string
    cnpj: string
    loteCodigo: string
    numeroSEI?: string
    /** Rótulo da situação (ROTULO_SITUACAO). */
    status: string
    nf: number | null
    concluida: boolean
  }[]
  /** Decisões de desempate (RF-27) que envolvem propostas da pauta; ordem já com os nomes das OSCs. */
  desempates: { loteCodigo: string; nf: number; ordem: string[]; justificativa: string }[]
}

const dataBr = (iso: string) => iso.split('-').reverse().join('/')

export const TITULO_ATA = 'ATA DA SESSÃO DA COMISSÃO DE SELEÇÃO'

export function textoInicialAta(d: DadosAta): string {
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
            `- ${p.nomeOsc} (CNPJ ${formatarCnpj(p.cnpj)}) — Lote ${p.loteCodigo}${p.numeroSEI ? ` — SEI ${p.numeroSEI}` : ''} — NF ${p.nf === null ? '—' : formatarNumero(p.nf)} — ${p.status}${p.concluida ? ' (concluída)' : ''}`,
        )),
    '',
    '3. DESEMPATES (RF-27)',
    ...(d.desempates.length === 0
      ? ['Não houve decisão de desempate.']
      : d.desempates.map((x) => `- Lote ${x.loteCodigo}, NF ${formatarNumero(x.nf)}: ${x.ordem.join(' > ')}. Justificativa: ${x.justificativa}`)),
    '',
    '4. ENCERRAMENTO',
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
