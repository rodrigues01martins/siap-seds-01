// Admissibilidade simplificada (Simplificação 2/4): admitida (sim/não), motivo (obrigatório se "não") e
// páginas inicial/final de cada PA, com a página de corte calculada pelo domínio (apurarPlano, Anexo III, 7.1).
// Sem checklist 28.1 nem de formatação (28.5). Esquema da /api e do formulário da tela.

import { apurarPlano, MOTIVACAO_MINIMA, type PlanoApurado } from '../domain/admissibilidade.js'
import { MATRIZ_2026, type Matriz } from '../domain/matriz/index.js'
import { idDocumento, opcional, z } from './base.js'

const pagina = z.number({ error: 'Informe um número.' }).nullable()

export const esquemaPlanoAdmissibilidade = z.strictObject({
  codigo: z.string(),
  paginaInicial: pagina,
  paginaFinal: pagina,
})
export type PlanoAdmissibilidade = z.output<typeof esquemaPlanoAdmissibilidade>

export const esquemaCamposAdmissibilidade = z.strictObject({
  admitida: z.boolean({ error: 'Informe se a proposta foi admitida (sim ou não).' }),
  motivo: opcional(z.string().trim().max(2000, 'Use no máximo 2.000 caracteres.')),
  planos: z.array(esquemaPlanoAdmissibilidade),
})
export type CamposAdmissibilidade = z.output<typeof esquemaCamposAdmissibilidade>

export const esquemaAdmissibilidade = esquemaCamposAdmissibilidade.extend({
  chamamentoId: idDocumento,
  propostaId: idDocumento,
  /** Sessão aberta em que a Comissão registra (vai para admissibilidade.sessaoId). */
  sessaoId: idDocumento,
})

const paginaValida = (valor: number | null) => valor !== null && Number.isInteger(valor) && valor >= 1

/** Problemas por campo: motivo da não admissão, os 6 PAs e as páginas (obrigatórias se admitida). */
export function problemasDaAdmissao(dados: CamposAdmissibilidade, matriz: Matriz = MATRIZ_2026): Record<string, string> {
  const problemas: Record<string, string> = {}
  if (!dados.admitida && (dados.motivo?.trim().length ?? 0) < MOTIVACAO_MINIMA) {
    problemas.motivo = `Informe o motivo da não admissão (ao menos ${MOTIVACAO_MINIMA} caracteres).`
  }
  const esperados = matriz.dimensao1.planos.map((p) => p.codigo)
  const informados = dados.planos.map((p) => p.codigo)
  if (informados.length !== esperados.length || esperados.some((c) => !informados.includes(c))) {
    problemas.planos = `Informe os ${esperados.length} Planos de Ação (${esperados[0]} a ${esperados.at(-1)}), cada um uma vez.`
    return problemas
  }
  dados.planos.forEach((p, i) => {
    const exigir = dados.admitida || p.paginaInicial !== null || p.paginaFinal !== null
    if (!exigir) return
    if (!paginaValida(p.paginaInicial)) problemas[`planos.${i}.paginaInicial`] = 'Informe a página inicial (inteiro a partir de 1).'
    if (!paginaValida(p.paginaFinal)) problemas[`planos.${i}.paginaFinal`] = 'Informe a página final (inteiro a partir de 1).'
    else if (paginaValida(p.paginaInicial) && p.paginaFinal! < p.paginaInicial!) {
      problemas[`planos.${i}.paginaFinal`] = 'A página final não pode ser anterior à inicial.'
    }
  })
  return problemas
}

export type PlanoRegistrado = Omit<PlanoApurado, 'ausente'>

/** Páginas, limite, página de corte e excedente de cada PA, na ordem da matriz. */
export function apurarPlanos(planos: PlanoAdmissibilidade[], matriz: Matriz = MATRIZ_2026): PlanoRegistrado[] {
  return matriz.dimensao1.planos.map((pa) => {
    const plano = planos.find((p) => p.codigo === pa.codigo) ?? { codigo: pa.codigo, paginaInicial: null, paginaFinal: null }
    const { ausente: _ausente, ...apurado } = apurarPlano({ ...plano, ausente: false }, pa.limitePaginas)
    return apurado
  })
}

/** Campos + regras, para validar no navegador antes de enviar. */
export const esquemaCamposAdmissibilidadeComRegras = esquemaCamposAdmissibilidade.superRefine((dados, ctx) => {
  for (const [campo, message] of Object.entries(problemasDaAdmissao(dados))) {
    ctx.addIssue({ code: 'custom', path: campo.split('.'), message })
  }
})
