// Experiências da D2 (C3): esquema da /api e do formulário da tela, e a conversão do documento
// gravado para o tipo do domínio (Experiencia), usada pelo recálculo no servidor e pela prévia na tela.

import { CRITERIOS_D2, type Experiencia } from '../domain/d2.js'
import { algumCampoAlem, dataIso, idDocumento, opcional, semRepeticao, z } from './base.js'

/** Modalidade de atendimento (Anexo IV, 3.7, V). Só "internação" conta no Subcritério 2.3.1. */
export const MODALIDADES = ['internacao', 'semiliberdade', 'meio_aberto', 'acolhimento', 'outra'] as const
export type Modalidade = (typeof MODALIDADES)[number]

export const ROTULO_MODALIDADE: Record<Modalidade, string> = {
  internacao: 'Internação',
  semiliberdade: 'Semiliberdade',
  meio_aberto: 'Meio aberto',
  acolhimento: 'Acolhimento institucional',
  outra: 'Outra',
}

export const esquemaDocumento = z.strictObject({
  tipo: z.string({ error: 'Informe o tipo do documento.' }).trim().min(1, 'Informe o tipo do documento.').max(120),
  numeroSEI: z.string({ error: 'Informe o nº SEI.' }).trim().min(1, 'Informe o nº SEI.').max(40, 'Use no máximo 40 caracteres.'),
  /** O documento demonstra execução satisfatória (Anexo IV, 3.6.1)? */
  comprovaExecucaoSatisfatoria: z.boolean(),
  /** A Comissão aceitou o documento? */
  aceito: z.boolean(),
})
export type DocumentoExperiencia = z.output<typeof esquemaDocumento>

const mensagemJustificativa = 'Informe a justificativa da desconsideração (Anexo IV, 3.8.5).'
export const esquemaDesconsideracao = z.strictObject({
  criterio: z.enum(CRITERIOS_D2, { error: 'Critério inválido.' }),
  justificativa: z.string({ error: mensagemJustificativa }).trim().min(1, mensagemJustificativa).max(1000),
})

const porte = z.number({ error: 'Informe um número.' }).nullable()

// Formato no zod; o conteúdo (categorias A–D, A+B, D com MROSC, fim ≥ início, inteiros ≥ 0)
// vem de problemasDaExperiencia (src/domain), aplicado pela /api ao documento final.
const campos = {
  descricao: z.string({ error: 'Informe a descrição.' }).trim().min(1, 'Informe a descrição.').max(500),
  categorias: z
    .array(z.string())
    .min(1, 'Informe ao menos uma categoria.')
    .refine(semRepeticao(), 'Há categorias repetidas.'),
  modalidade: z.enum(MODALIDADES, { error: 'Escolha a modalidade de atendimento.' }),
  orgaoParceiro: opcional(z.string().trim().max(200, 'Use no máximo 200 caracteres.')),
  instrumento: opcional(z.string().trim().max(200, 'Use no máximo 200 caracteres.')),
  mrosc: z.boolean(),
  inicio: dataIso,
  fim: dataIso.nullable(),
  vagas: porte,
  unidades: porte,
  trabalhadores: porte,
  valorAnualCentavos: porte,
  documentos: z.array(esquemaDocumento).max(50, 'Use no máximo 50 documentos.'),
  desconsideracoes: z
    .array(esquemaDesconsideracao)
    .refine(semRepeticao((d: { criterio: string }) => d.criterio), 'Critério informado mais de uma vez.'),
}

const alvo = { chamamentoId: idDocumento, propostaId: idDocumento }

/** Campos da experiência (sem identificação), com os padrões de criação. */
export const esquemaCamposExperiencia = z.strictObject({
  descricao: campos.descricao,
  categorias: campos.categorias,
  modalidade: campos.modalidade,
  orgaoParceiro: campos.orgaoParceiro,
  instrumento: campos.instrumento,
  mrosc: campos.mrosc.default(false),
  inicio: campos.inicio,
  fim: campos.fim.default(null),
  vagas: porte.default(null),
  unidades: porte.default(null),
  trabalhadores: porte.default(null),
  valorAnualCentavos: porte.default(null),
  documentos: campos.documentos.default([]),
  desconsideracoes: campos.desconsideracoes.default([]),
})
export type CamposExperiencia = z.output<typeof esquemaCamposExperiencia>

export const esquemaCriarExperiencia = esquemaCamposExperiencia.extend(alvo)

export const esquemaEditarExperiencia = z
  .strictObject({ ...alvo, id: idDocumento, ...z.object(campos).partial().shape })
  .refine(algumCampoAlem(['chamamentoId', 'propostaId', 'id']), 'Informe ao menos um campo para alterar.')

export const esquemaExcluirExperiencia = z.strictObject({ ...alvo, id: idDocumento })

/** Execução satisfatória comprovada = algum documento ACEITO que a demonstra (Anexo IV, 3.6.1). */
export function execucaoComprovada(documentos: Partial<DocumentoExperiencia>[] | undefined): boolean {
  return (documentos ?? []).some((d) => d.aceito === true && d.comprovaExecucaoSatisfatoria === true)
}

/**
 * Documento gravado → Experiencia do domínio. Internação vem da modalidade; execução satisfatória,
 * dos documentos aceitos. Documentos anteriores à Etapa 4b (internacao/execucaoSatisfatoria gravados)
 * continuam valendo.
 */
export function paraExperiencia(id: string, d: Record<string, unknown>): Experiencia {
  const numero = (campo: string) => (d[campo] as number | null | undefined) ?? null
  return {
    id,
    descricao: d.descricao as string | undefined,
    categorias: (d.categorias ?? []) as Experiencia['categorias'],
    internacao: d.modalidade !== undefined ? d.modalidade === 'internacao' : d.internacao === true,
    mrosc: d.mrosc as boolean | undefined,
    inicio: d.inicio as string,
    fim: (d.fim as string | null | undefined) ?? null,
    vagas: numero('vagas'),
    unidades: numero('unidades'),
    trabalhadores: numero('trabalhadores'),
    valorAnualCentavos: numero('valorAnualCentavos'),
    execucaoSatisfatoria:
      execucaoComprovada(d.documentos as DocumentoExperiencia[] | undefined) || d.execucaoSatisfatoria === true,
    desconsideracoes: (d.desconsideracoes ?? []) as Experiencia['desconsideracoes'],
  }
}
