// Espelho de avaliação da proposta (PDF): identificação, admissibilidade (admitida, motivo e páginas por PA
// com página de corte), os 28 subcritérios da D1 com nível, justificativa e páginas citadas, totais por PA,
// D1, memória da D2, NF e status. Tudo a partir do que a /api gravou; nenhum peso ou faixa fixo aqui (vem da
// matriz). Proposta não concluída sai com a marca MINUTA; concluída sai como final.

import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces'
import { formatarCnpj } from '../domain/cnpj.js'
import type { ResultadoD2 } from '../domain/d2.js'
import { formatarNumero } from '../domain/formatacao.js'
import { MATRIZ_2026, type Matriz } from '../domain/matriz/index.js'
import type { TotaisProposta } from '../domain/proposta.js'
import { ROTULO_SITUACAO, type SituacaoProposta } from '../domain/situacaoProposta.js'
import { montarPdf, precisaMinuta, tabela, type Rodape } from './documento.js'
import { criteriosDaMemoria, legivel, memoriaExibida } from './memoriaD2.js'

export interface AvaliacaoEspelho {
  nivel: number
  justificativa: string
  paginas: number[]
}

/** Admissibilidade gravada (registros anteriores à Simplificação 2/4 têm motivos, motivacao e ausente). */
export interface AdmissibilidadeEspelho {
  admitida?: boolean
  situacao: 'admitida' | 'nao_admitida' | 'desclassificada'
  motivo?: string
  motivos?: string[]
  motivacao?: string
  planos: { codigo: string; paginaInicial: number | null; paginaFinal: number | null; limite: number; paginaCorte: number | null; excede: number; ausente?: boolean }[]
}

export interface DadosEspelho {
  chamamento: { numero: string; titulo: string }
  lote: { codigo: string; descricao?: string }
  osc: { cnpj: string; razaoSocial: string }
  proposta: {
    id: string
    numeroSEI?: string
    protocolo?: string
    concluida: boolean
    status: SituacaoProposta
    totais: TotaisProposta | null
  }
  admissibilidade: AdmissibilidadeEspelho | null
  /** Registro da Comissão por código do subcritério (avaliacoes/{codigo}). */
  avaliacoes: Record<string, AvaliacaoEspelho>
  /** Memória da D2 gravada pela /api (resultadoD2/atual). */
  d2: ResultadoD2 | null
  /** id da experiência → descrição. */
  experiencias: Record<string, string>
}

export interface LinhaEspelho {
  plano: string
  codigo: string
  titulo: string
  nivel: number | null
  justificativa: string | null
  paginas: number[]
}

/** Os subcritérios da matriz, na ordem, com o registro da Comissão (null = não avaliado). */
export function linhasDoEspelho(dados: DadosEspelho, matriz: Matriz = MATRIZ_2026): LinhaEspelho[] {
  return matriz.dimensao1.planos.flatMap((plano) =>
    plano.subcriterios.map((s) => {
      const a = dados.avaliacoes[s.codigo]
      return {
        plano: plano.codigo,
        codigo: s.codigo,
        titulo: s.titulo,
        nivel: a?.nivel ?? null,
        justificativa: a?.justificativa ?? null,
        paginas: a?.paginas ?? [],
      }
    }),
  )
}

/**
 * Dados que entram no código de verificação: os mesmos do documento, com as avaliações na ordem
 * da matriz (a ordem de leitura do Firestore não altera o código).
 */
export function dadosVerificadosEspelho(dados: DadosEspelho) {
  return { ...dados, avaliacoes: linhasDoEspelho(dados) }
}

const num = (valor: number | null | undefined) => (valor === null || valor === undefined ? '—' : formatarNumero(valor))

function identificacao({ chamamento, lote, osc, proposta }: DadosEspelho): Content {
  const linha = (rotulo: string, valor: string) => ({ text: [{ text: `${rotulo}: `, bold: true }, valor] })
  return {
    stack: [
      linha('Chamamento', `Chamamento Público nº ${chamamento.numero} — ${chamamento.titulo}`),
      linha('OSC', osc.razaoSocial),
      linha('CNPJ', formatarCnpj(osc.cnpj)),
      linha('Lote', lote.descricao ? `${lote.codigo} — ${lote.descricao}` : lote.codigo),
      linha('Nº SEI do Caderno', proposta.numeroSEI ?? '—'),
      linha('Protocolo', proposta.protocolo ?? '—'),
      linha('Status', ROTULO_SITUACAO[proposta.status]),
      linha('Avaliação', proposta.concluida ? 'Avaliação concluída' : 'Não concluída (minuta)'),
    ],
  }
}

function secaoAdmissibilidade(adm: AdmissibilidadeEspelho | null): Content[] {
  const titulo = { text: 'Admissibilidade (Anexo III, item 28)', style: 'secao' }
  if (!adm) return [titulo, { text: 'Admissibilidade não registrada.' }]
  const admitida = adm.admitida ?? adm.situacao === 'admitida'
  const motivos = [...(adm.motivos ?? []), ...(adm.motivacao ? [adm.motivacao] : []), ...(adm.motivo ? [adm.motivo] : [])]
  return [
    titulo,
    { text: `Admitida: ${admitida ? 'Sim' : 'Não'}`, bold: true },
    ...(motivos.length > 0 ? [{ text: `Motivo: ${motivos.join('; ')}` }] : []),
    ...(adm.planos.length > 0
      ? [
          { text: 'Páginas dos Planos de Ação', bold: true, margin: [0, 6, 0, 2] } as Content,
          tabela(
            ['PA', 'Páginas', 'Limite', 'Página de corte', 'Excede'],
            adm.planos.map((p) => [
              p.codigo,
              p.ausente ? 'Ausente' : `${p.paginaInicial ?? '—'} a ${p.paginaFinal ?? '—'}`,
              String(p.limite),
              num(p.paginaCorte),
              p.excede > 0 ? `${p.excede} pág.` : '—',
            ]),
          ),
        ]
      : []),
  ]
}

function secaoD1(dados: DadosEspelho, matriz: Matriz): Content[] {
  const linhas = linhasDoEspelho(dados, matriz)
  const conteudo: Content[] = [{ text: `Dimensão 1 — ${matriz.dimensao1.titulo}`, style: 'secao', pageBreak: 'before' }]
  for (const plano of matriz.dimensao1.planos) {
    conteudo.push({ text: `${plano.codigo} — ${plano.titulo}`, bold: true, margin: [0, 8, 0, 2] })
    conteudo.push(
      tabela(
        ['Subcritério', 'Nível', 'Justificativa e páginas'],
        linhas
          .filter((l) => l.plano === plano.codigo)
          .map((l) => [
            `${l.codigo} ${l.titulo}`,
            { text: l.nivel === null ? '—' : String(l.nivel), alignment: 'center' as const },
            l.nivel === null
              ? { text: 'Não avaliado', italics: true }
              : {
                  stack: [
                    { text: l.justificativa ?? '' },
                    { text: `Páginas citadas: ${l.paginas.length > 0 ? l.paginas.join(', ') : '—'}`, style: 'pequeno' },
                  ],
                },
          ]),
        [150, 30, '*'],
      ),
    )
  }
  return conteudo
}

function secaoTotais(dados: DadosEspelho, matriz: Matriz): Content[] {
  const t = dados.proposta.totais
  const porPA = matriz.dimensao1.planos.map((plano, i) => {
    const total = t?.totaisPorPA[i]
    return [plano.codigo, plano.titulo, num(total?.pontos), num(total?.maximo ?? plano.maximo)]
  })
  return [
    { text: 'Totais por Plano de Ação', style: 'secao' },
    tabela(['PA', 'Título', 'Pontos', 'Máximo'], porPA, [30, '*', 45, 45]),
    { text: `D1: ${num(t?.d1)} / ${formatarNumero(matriz.dimensao1.maximo)} (corte: ${formatarNumero(matriz.dimensao1.corte)})`, bold: true },
    ...((t?.motivos ?? []).length > 0 ? [{ ul: t!.motivos }] : []),
  ]
}

function secaoD2(dados: DadosEspelho, matriz: Matriz): Content[] {
  const titulo = { text: `Dimensão 2 — ${matriz.dimensao2.titulo} (memória de cálculo)`, style: 'secao', pageBreak: 'before' as const }
  if (!dados.d2) return [titulo, { text: 'A D2 ainda não foi calculada (nenhuma experiência cadastrada).' }]
  const nomes = dados.experiencias
  return [
    titulo,
    { text: `D2 = ${formatarNumero(dados.d2.total)} / ${formatarNumero(dados.d2.maximo)} pontos`, bold: true },
    ...criteriosDaMemoria(dados.d2).map(({ resultado: r, nivel }) => ({
      margin: [nivel * 14, 6, 0, 0] as [number, number, number, number],
      stack: [
        {
          text: `${r.codigo} — ${r.titulo}: ${formatarNumero(r.pontos)} / ${formatarNumero(r.maximo)} pt${r.faixa ? ` · faixa “${r.faixa}”` : ''}`,
          bold: true,
        },
        { text: `Experiências usadas: ${r.usadas.length === 0 ? 'nenhuma' : r.usadas.map((id) => nomes[id] ?? id).join('; ')}`, style: 'pequeno' },
        { ol: memoriaExibida(r).map((linha) => legivel(linha, nomes)) },
      ],
    })),
  ]
}

function secaoResultado(dados: DadosEspelho, matriz: Matriz): Content[] {
  const t = dados.proposta.totais
  return [
    { text: 'Resultado', style: 'secao' },
    {
      stack: [
        `D1: ${num(t?.d1)}`,
        `D2: ${num(t?.d2)}`,
        { text: `NF: ${num(t?.nf)} / ${formatarNumero(matriz.notaFinalMaxima)}`, bold: true },
        `Status: ${ROTULO_SITUACAO[dados.proposta.status]}`,
      ],
    },
  ]
}

export function montarEspelho(dados: DadosEspelho, rodape: Rodape, matriz: Matriz = MATRIZ_2026): TDocumentDefinitions {
  return montarPdf({
    titulo: `Espelho de avaliação — ${dados.osc.razaoSocial}`,
    subtitulo: `Matriz de Avaliação (Anexo IV), versão ${matriz.versao}. O Caderno é consultado no SEI pelo nº informado.`,
    conteudo: [
      identificacao(dados),
      ...secaoAdmissibilidade(dados.admissibilidade),
      ...secaoD1(dados, matriz),
      ...secaoTotais(dados, matriz),
      ...secaoD2(dados, matriz),
      ...secaoResultado(dados, matriz),
    ],
    rodape,
    minuta: precisaMinuta([dados.proposta]),
  })
}
