// Experiência da D2 editada direto na linha da tabela (Simplificação 3/4): valores como a tela os mostra (textos,
// valor em reais) ⇄ o que a /api grava, e a validação com o mesmo esquema da /api + as regras de src/domain.
// Linha incompleta (ex.: sem início) não é enviada: o salvamento automático a guarda e mostra o que falta.

import { centavosParaReais, reaisParaCentavos } from '../../domain/formatacao'
import { camposDoErro } from '../../esquemas/base'
import { esquemaCamposExperienciaComRegras, type CamposExperiencia, type DocumentoExperiencia } from '../../esquemas/experiencia'
import type { ExperienciaGravada } from '../../lib/tipos'

export interface LinhaExperiencia {
  descricao: string
  categorias: string[]
  modalidade: string
  mrosc: boolean
  inicio: string
  fim: string
  vagas: string
  unidades: string
  trabalhadores: string
  valorAnual: string
  orgaoParceiro: string
  instrumento: string
  documentos: DocumentoExperiencia[]
}

export const LINHA_VAZIA: LinhaExperiencia = {
  descricao: '',
  categorias: [],
  modalidade: '',
  mrosc: false,
  inicio: '',
  fim: '',
  vagas: '',
  unidades: '',
  trabalhadores: '',
  valorAnual: '',
  orgaoParceiro: '',
  instrumento: '',
  documentos: [],
}

const texto = (n: number | null | undefined) => (n == null ? '' : String(n))
const numero = (t: string): number | null => (t.trim() === '' ? null : Number(t))

export function paraLinha(e: ExperienciaGravada): LinhaExperiencia {
  return {
    descricao: e.descricao ?? '',
    categorias: e.categorias ?? [],
    modalidade: e.modalidade ?? '',
    mrosc: e.mrosc ?? false,
    inicio: e.inicio ?? '',
    fim: e.fim ?? '',
    vagas: texto(e.vagas),
    unidades: texto(e.unidades),
    trabalhadores: texto(e.trabalhadores),
    valorAnual: centavosParaReais(e.valorAnualCentavos),
    orgaoParceiro: e.orgaoParceiro ?? '',
    instrumento: e.instrumento ?? '',
    documentos: e.documentos ?? [],
  }
}

/** Linha → campos da /api, validados; com `erros` (por campo), a linha não é enviada. */
export function validarLinha(linha: LinhaExperiencia): { campos: Omit<CamposExperiencia, 'desconsideracoes'> | null; erros: Record<string, string> } {
  const valorAnualCentavos = reaisParaCentavos(linha.valorAnual)
  const dados = {
    descricao: linha.descricao,
    categorias: [...linha.categorias].sort(),
    modalidade: linha.modalidade || undefined,
    orgaoParceiro: linha.orgaoParceiro.trim() || undefined,
    instrumento: linha.instrumento.trim() || undefined,
    mrosc: linha.mrosc,
    inicio: linha.inicio,
    fim: linha.fim || null,
    vagas: numero(linha.vagas),
    unidades: numero(linha.unidades),
    trabalhadores: numero(linha.trabalhadores),
    valorAnualCentavos,
    documentos: linha.documentos,
  }
  const resultado = esquemaCamposExperienciaComRegras.safeParse(dados)
  if (!resultado.success) {
    const erros = camposDoErro(resultado.error)
    if (Number.isNaN(valorAnualCentavos)) erros.valorAnual = 'Use o formato 1.234,56.'
    return { campos: null, erros }
  }
  const { desconsideracoes: _d, ...campos } = resultado.data
  return { campos, erros: {} }
}
