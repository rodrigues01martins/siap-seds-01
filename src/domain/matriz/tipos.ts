// Tipos da Matriz de Avaliação (Anexo IV). Espelham matriz_2026.json.

export interface NivelEscala {
  nivel: number
  descritor: string
}

export interface Subcriterio {
  codigo: string
  titulo: string
  elementos: string[]
  pontos: number
}

export interface PlanoDeAcao {
  codigo: string
  titulo: string
  finalidade: string
  limitePaginas: number
  maximo: number
  subcriterios: Subcriterio[]
}

/** Faixa de pontuação: vale para valores <= `ate` (inclusivo); `ate` nulo = sem limite. */
export interface Faixa {
  ate: number | null
  pontos: number
  descricao: string
}

export interface CategoriaD2 {
  codigo: string
  descricao: string
  pontos: number
}

export interface CriterioComFaixas {
  titulo: string
  maximo: number
  unidade: string
  faixas: Faixa[]
}

export interface Matriz {
  versao: string
  fonte: string
  notaFinalMaxima: number
  dimensao1: {
    titulo: string
    maximo: number
    corte: number
    subcriteriosEliminatorios: string[]
    escala: NivelEscala[]
    planos: PlanoDeAcao[]
  }
  dimensao2: {
    titulo: string
    maximo: number
    observacaoFaixas: string
    criterios: {
      'C2.1': {
        titulo: string
        maximo: number
        categorias: CategoriaD2[]
        categoriasMutuamenteExclusivas: string[][]
      }
      'C2.2': CriterioComFaixas & { categoriasConsideradas: string[] }
      'C2.3': {
        titulo: string
        maximo: number
        subcriterios: {
          '2.3.1': {
            titulo: string
            maximo: number
            categoriasConsideradas: string[]
            exigeInternacao: boolean
            A: CriterioComFaixas
            B: CriterioComFaixas
          }
          '2.3.2': CriterioComFaixas & { categoriasConsideradas: string[] }
          '2.3.3': CriterioComFaixas & { categoriasConsideradas: string[] }
        }
      }
      'C2.4': CriterioComFaixas & { categoriasConsideradas: string[] }
    }
  }
}
