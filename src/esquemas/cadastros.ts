// C1 — cadastros (chamamentos, OSCs, propostas) e C6 — perfis. Usados pela /api e pelos formulários.

import { PERFIS } from '../domain/perfis.js'
import { algumCampoAlem, cnpj, dataIso, idDocumento, opcional, semRepeticao, z } from './base.js'

// ---------- Chamamento ----------

export const esquemaLote = z.strictObject({
  codigo: z.string().trim().min(1, 'Informe o código do lote.').max(20, 'Use no máximo 20 caracteres.'),
  descricao: z.string().trim().min(1, 'Informe a descrição do lote.'),
})

const lotes = z
  .array(esquemaLote)
  .min(1, 'Informe ao menos um lote.')
  .refine(semRepeticao((l: { codigo: string }) => l.codigo), 'Há códigos de lote repetidos.')

const numero = z.string().trim().min(1, 'Informe o número do chamamento.')
const titulo = z.string().trim().min(3, 'Informe um título com ao menos 3 caracteres.')
const processoSei = z
  .string({ error: 'Informe o número do processo SEI.' })
  .trim()
  .min(1, 'Informe o número do processo SEI.')
  .max(40, 'Use no máximo 40 caracteres.')
const indiceCorrecao = z.string().trim().min(2, 'Informe o índice (ex.: IPCA).').max(40, 'Use no máximo 40 caracteres.')
const justificativaMinima = z
  .number({ error: 'Use um número inteiro.' })
  .int('Use um número inteiro.')
  .min(0, 'Use um número de 0 a 2.000.')
  .max(2000, 'Use um número de 0 a 2.000.')

/** Índice e data-base da correção monetária (valores da D2) andam juntos. */
function indiceComDataBase(dados: { indiceCorrecao?: string; dataBaseCorrecao?: string }): boolean {
  return (dados.indiceCorrecao === undefined) === (dados.dataBaseCorrecao === undefined)
}
const erroIndice = { path: ['dataBaseCorrecao'], message: 'Informe o índice e a data-base juntos.' }

const camposChamamento = {
  numero,
  titulo,
  processoSei,
  dataLimitePropostas: dataIso,
  indiceCorrecao: opcional(indiceCorrecao),
  dataBaseCorrecao: opcional(dataIso),
  justificativaMinima: opcional(justificativaMinima),
  lotes,
}

export const esquemaCriarChamamento = z.strictObject(camposChamamento).refine(indiceComDataBase, erroIndice)

export const esquemaEditarChamamento = z
  .strictObject({
    id: idDocumento,
    numero: numero.optional(),
    titulo: titulo.optional(),
    processoSei: processoSei.optional(),
    dataLimitePropostas: dataIso.optional(),
    indiceCorrecao: opcional(indiceCorrecao),
    dataBaseCorrecao: opcional(dataIso),
    justificativaMinima: opcional(justificativaMinima),
    lotes: lotes.optional(),
  })
  .refine(algumCampoAlem(['id']), 'Informe ao menos um campo para alterar.')
  .refine(indiceComDataBase, erroIndice)

// ---------- OSC ----------

const razaoSocial = z.string().trim().min(3, 'Informe a razão social.')
const nomeFantasia = z.string().trim().min(1, 'Informe o nome fantasia.')

export const esquemaCriarOsc = z.strictObject({ cnpj, razaoSocial, nomeFantasia: opcional(nomeFantasia) })

export const esquemaEditarOsc = z
  .strictObject({ cnpj, razaoSocial: razaoSocial.optional(), nomeFantasia: opcional(nomeFantasia) })
  .refine(algumCampoAlem(['cnpj']), 'Informe ao menos um campo para alterar.')

// ---------- Proposta ----------

const loteCodigo = z.string({ error: 'Informe o lote.' }).trim().min(1, 'Informe o lote.')
const protocolo = z
  .string({ error: 'Informe o protocolo.' })
  .trim()
  .min(1, 'Informe o protocolo.')
  .max(60, 'Use no máximo 60 caracteres.')
const numeroSei = z
  .string({ error: 'Informe o nº do documento SEI.' })
  .trim()
  .min(1, 'Informe o nº do documento SEI.')
  .max(40, 'Use no máximo 40 caracteres.')
const observacao = z.string().trim().max(2000, 'Use no máximo 2.000 caracteres.')

export const esquemaCriarProposta = z.strictObject({
  chamamentoId: idDocumento,
  loteCodigo,
  oscCnpj: cnpj,
  protocolo,
  numeroSei,
  observacao: opcional(observacao),
})

export const esquemaEditarProposta = z
  .strictObject({
    chamamentoId: idDocumento,
    propostaId: idDocumento,
    loteCodigo: loteCodigo.optional(),
    oscCnpj: cnpj.optional(),
    protocolo: protocolo.optional(),
    numeroSei: numeroSei.optional(),
    observacao: opcional(observacao),
  })
  .refine(algumCampoAlem(['chamamentoId', 'propostaId']), 'Informe ao menos um campo para alterar.')

// ---------- Perfis ----------

const email = z
  .email({ error: 'Informe um e-mail válido.' })
  .transform((valor) => valor.trim().toLowerCase())

export const esquemaDefinirPerfil = z.strictObject({
  email,
  perfil: z.enum(PERFIS, { error: `Perfil inválido. Use: ${PERFIS.join(', ')}.` }),
})

export const esquemaRemoverPerfil = z.strictObject({ email })
