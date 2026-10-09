// Dados de exemplo para os testes da projeção (calculados pelo próprio domínio).

import { calcularAdmissibilidade, type Admissibilidade } from '../domain/admissibilidade'
import { calcularD2, type ResultadoD2 } from '../domain/d2'
import { MATRIZ_2026 } from '../domain/matriz'
import { consolidarProposta, type TotaisProposta } from '../domain/proposta'

const CODIGOS = MATRIZ_2026.dimensao1.planos.flatMap((p) => p.subcriterios.map((s) => s.codigo))
export const DATA_LIMITE = '2026-10-31'

export function admissibilidadeExemplo(): Admissibilidade {
  let pagina = 3
  const planos = [12, 12, 8, 12, 10, 8].map((limite, i) => {
    const extra = i === 2 ? 2 : 0
    const plano = { codigo: `PA${i + 1}`, ausente: false, paginaInicial: pagina, paginaFinal: pagina + limite - 1 + extra }
    pagina += limite + extra
    return plano
  })
  return calcularAdmissibilidade({
    requisitos: Object.fromEntries(
      ['I', 'II', 'III', 'IV', 'V', 'VI', 'VIII', 'IX', 'X'].map((n) => [`28.1.${n}`, n !== 'IV']),
    ),
    irregularidadesFormais: ['28.5.II'],
    planos,
    resultado: 'nao_admitida',
    motivacao: 'Arquivo não abre integralmente.',
  })
}

export const EXPERIENCIAS_EXEMPLO = [
  { id: 'e1', descricao: 'Gestão do CASE Goiânia', categorias: ['A' as const, 'D' as const], internacao: true, mrosc: true, inicio: '2018-01-01', fim: null, vagas: 90, unidades: 2, trabalhadores: 70, valorAnualCentavos: 1_200_000_000, execucaoSatisfatoria: true },
  { id: 'e2', descricao: 'Projeto esportivo', categorias: ['C' as const], inicio: '2020-01-01', fim: '2021-12-31', execucaoSatisfatoria: true },
]

export function resultadoD2Exemplo(): ResultadoD2 {
  return calcularD2({ experiencias: EXPERIENCIAS_EXEMPLO, dataLimite: DATA_LIMITE })
}

export function totaisExemplo(): TotaisProposta {
  const niveis = Object.fromEntries(CODIGOS.map((c, i) => [c, i % 3 === 0 ? 4 : 3]))
  return consolidarProposta({ niveis, experiencias: EXPERIENCIAS_EXEMPLO, dataLimite: DATA_LIMITE }).totais
}
