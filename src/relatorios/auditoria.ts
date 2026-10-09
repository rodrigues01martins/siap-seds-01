// Trilha de auditoria (somente leitura): registros gravados por api/_lib/gravar.ts na mesma transação
// de cada escrita. Aqui ficam os filtros (proposta, usuário, ação, período), a descrição do objeto a
// partir do caminho e o antes/depois por campo, usados pela tela /auditoria e pela exportação XLSX.

import { normalizar, serializarCanonico } from './verificacao.js'

export type AcaoAuditoria = 'criar' | 'editar' | 'excluir'
export const ACOES_AUDITORIA: readonly AcaoAuditoria[] = ['criar', 'editar', 'excluir']

export interface RegistroAuditoria {
  id: string
  caminho: string
  acao: AcaoAuditoria
  antes: Record<string, unknown> | null
  depois: Record<string, unknown> | null
  uid: string
  /** Gravado a partir da Etapa 6b; registros anteriores só têm o uid. */
  email?: string | null
  perfil: string
  dataHora: Date | null
}

export interface FiltrosAuditoria {
  proposta?: string
  usuario?: string
  acao?: string
  /** AAAA-MM-DD, dia inteiro no horário de Goiás. */
  de?: string
  ate?: string
}

/** Id da proposta a que o caminho pertence (ela própria ou suas subcoleções). */
export function propostaDoRegistro(caminho: string): string | null {
  return /^chamamentos\/[^/]+\/propostas\/([^/]+)/.exec(caminho)?.[1] ?? null
}

const SUBCOLECOES: Record<string, string> = {
  avaliacoes: 'Nível do subcritério',
  experiencias: 'Experiência da D2',
  diligencias: 'Diligência',
}

/** Descrição legível do documento alterado. */
export function descreverCaminho(caminho: string): string {
  const partes = caminho.split('/')
  const [raiz, id, sub, subId, neto, netoId] = partes
  if (raiz === 'chamamentos' && id) {
    if (sub === 'propostas' && subId) {
      if (!neto) return `Proposta ${subId}`
      if (neto === 'resultadoD2') return `Memória da D2 (proposta ${subId})`
      if (SUBCOLECOES[neto] && netoId) return `${SUBCOLECOES[neto]} ${netoId} (proposta ${subId})`
    }
    if (sub === 'sessoes' && subId && !neto) return `Sessão ${subId}`
    if (sub === 'desempates' && subId && !neto) return `Desempate ${subId}`
    if (!sub) return `Chamamento ${id}`
  }
  if (raiz === 'oscs' && id && partes.length === 2) return `OSC ${id}`
  if (raiz === 'usuarios' && id && partes.length === 2) return `Perfil do usuário ${id}`
  return caminho
}

/** Início e fim do período (dias inteiros no horário de Brasília, que é o de Goiás). */
export function limitesDoPeriodo(de?: string, ate?: string): { inicio: Date | null; fim: Date | null } {
  return {
    inicio: de ? new Date(`${de}T00:00:00.000-03:00`) : null,
    fim: ate ? new Date(`${ate}T23:59:59.999-03:00`) : null,
  }
}

export function filtrarAuditoria(registros: RegistroAuditoria[], filtros: FiltrosAuditoria): RegistroAuditoria[] {
  const proposta = filtros.proposta?.trim()
  const usuario = filtros.usuario?.trim().toLowerCase()
  const { inicio, fim } = limitesDoPeriodo(filtros.de, filtros.ate)
  return registros.filter((r) => {
    if (proposta && propostaDoRegistro(r.caminho) !== proposta) return false
    if (usuario && !`${r.email ?? ''} ${r.uid}`.toLowerCase().includes(usuario)) return false
    if (filtros.acao && r.acao !== filtros.acao) return false
    if (inicio || fim) {
      if (!r.dataHora) return false
      if (inicio && r.dataHora < inicio) return false
      if (fim && r.dataHora > fim) return false
    }
    return true
  })
}

/** Campos de controle que mudam em toda escrita e não interessam ao antes/depois. */
const IGNORADOS = new Set(['criadoEm', 'atualizadoEm'])

const valorLegivel = (valor: unknown) => (valor === undefined ? '—' : serializarCanonico(valor))

/** Campos (de primeiro nível) que mudaram, com o valor antes e depois. */
export function diferencas(
  antes: Record<string, unknown> | null,
  depois: Record<string, unknown> | null,
): { campo: string; antes: string; depois: string }[] {
  const a = antes ?? {}
  const d = depois ?? {}
  const campos = [...new Set([...Object.keys(a), ...Object.keys(d)])].filter((c) => !IGNORADOS.has(c)).sort()
  return campos
    .filter((c) => (c in a) !== (c in d) || serializarCanonico(a[c]) !== serializarCanonico(d[c]))
    .map((c) => ({ campo: c, antes: valorLegivel(a[c]), depois: valorLegivel(d[c]) }))
}

/** Documento inteiro, indentado, para a coluna antes/depois da planilha. */
export function jsonIndentado(valor: Record<string, unknown> | null): string {
  return valor === null ? '—' : JSON.stringify(normalizar(valor), null, 2)
}
