// "Replicar para outro lote" (D2): a mesma OSC concorre nos dois lotes do chamamento, e as experiências cadastradas
// numa proposta podem ser copiadas para a outra. Copia só os dados cadastrais e documentais; as decisões avaliativas
// (aceite dos documentos, desconsiderações) ficam com cada lote, que é avaliado de forma independente.
// Equivalência determinística, para não duplicar: mesmos campos cadastrais (normalizados: espaços, maiúsculas,
// acentos, ordem das categorias, vazio = nulo) e todos os documentos da origem (tipo, nº SEI e comprovação de
// execução) presentes no destino. O aceite e as desconsiderações não entram na comparação.

export interface DocumentoParaReplicar {
  tipo?: string
  numeroSEI?: string
  comprovaExecucaoSatisfatoria?: boolean
  aceito?: boolean
}

export interface ExperienciaParaReplicar {
  descricao?: string
  categorias?: string[]
  modalidade?: string
  orgaoParceiro?: string
  instrumento?: string
  mrosc?: boolean
  inicio?: string
  fim?: string | null
  vagas?: number | null
  unidades?: number | null
  trabalhadores?: number | null
  valorAnualCentavos?: number | null
  documentos?: DocumentoParaReplicar[]
}

/** Campos cadastrais copiados como estão na origem (os documentos são tratados à parte). */
export const CAMPOS_REPLICADOS = [
  'descricao',
  'categorias',
  'modalidade',
  'orgaoParceiro',
  'instrumento',
  'mrosc',
  'inicio',
  'fim',
  'vagas',
  'unidades',
  'trabalhadores',
  'valorAnualCentavos',
] as const

/** Cópia para a proposta do outro lote: documentos com aceito = false e sem desconsiderações. */
export function copiaParaOutroLote(origem: ExperienciaParaReplicar & Record<string, unknown>): Record<string, unknown> {
  const copia: Record<string, unknown> = {}
  for (const campo of CAMPOS_REPLICADOS) if (origem[campo] !== undefined) copia[campo] = origem[campo]
  copia.documentos = (origem.documentos ?? []).map((d) => ({
    tipo: d.tipo,
    numeroSEI: d.numeroSEI,
    comprovaExecucaoSatisfatoria: d.comprovaExecucaoSatisfatoria === true,
    aceito: false,
  }))
  copia.desconsideracoes = []
  return copia
}

/** Texto comparável: sem acentos, em minúsculas e com os espaços normalizados; vazio = nulo. */
const texto = (valor: unknown): string | null => {
  if (typeof valor !== 'string') return null
  const normal = valor.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim()
  return normal === '' ? null : normal
}
const numero = (valor: unknown): number | null => (typeof valor === 'number' && Number.isFinite(valor) ? valor : null)
const sei = (valor: unknown): string | null => (typeof valor === 'string' ? valor.replace(/[^0-9a-z]/gi, '').toLowerCase() || null : null)

/** Assinatura dos campos cadastrais (sem documentos, aceite ou desconsiderações). */
export function chaveDaExperiencia(e: ExperienciaParaReplicar): string {
  return JSON.stringify([
    texto(e.descricao),
    [...(e.categorias ?? [])].map((c) => c.trim().toUpperCase()).sort(),
    texto(e.modalidade),
    texto(e.orgaoParceiro),
    texto(e.instrumento),
    e.mrosc === true,
    texto(e.inicio),
    texto(e.fim),
    numero(e.vagas),
    numero(e.unidades),
    numero(e.trabalhadores),
    numero(e.valorAnualCentavos),
  ])
}

/** Documentos comparáveis: tipo, nº SEI e comprovação de execução (o aceite é decisão de cada lote). */
function chavesDosDocumentos(e: ExperienciaParaReplicar): Set<string> {
  return new Set((e.documentos ?? []).map((d) => JSON.stringify([texto(d.tipo), sei(d.numeroSEI), d.comprovaExecucaoSatisfatoria === true])))
}

/** O destino já tem esta experiência da origem: mesmos dados cadastrais e todos os documentos da origem. */
export function equivalentes(origem: ExperienciaParaReplicar, destino: ExperienciaParaReplicar): boolean {
  if (chaveDaExperiencia(origem) !== chaveDaExperiencia(destino)) return false
  const doDestino = chavesDosDocumentos(destino)
  return [...chavesDosDocumentos(origem)].every((d) => doDestino.has(d))
}

/** O que copiar (na ordem da origem) e quantas já têm equivalente no destino (ou repetem outra da origem). */
export function planejarReplicacao<T extends ExperienciaParaReplicar>(origem: T[], destino: ExperienciaParaReplicar[]): { copiar: T[]; equivalentes: number } {
  const presentes = [...destino]
  const copiar: T[] = []
  let iguais = 0
  for (const experiencia of origem) {
    if (presentes.some((d) => equivalentes(experiencia, d))) {
      iguais += 1
      continue
    }
    copiar.push(experiencia)
    presentes.push(experiencia)
  }
  return { copiar, equivalentes: iguais }
}
