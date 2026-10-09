import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import { descreverCaminho, diferencas, filtrarAuditoria, limitesDoPeriodo, propostaDoRegistro, type RegistroAuditoria } from './auditoria'
import type { Rodape } from './documento'
import { auditoriaXlsx } from './xlsx'

const registro = (id: string, dados: Partial<RegistroAuditoria>): RegistroAuditoria => ({
  id,
  caminho: 'oscs/11222333000181',
  acao: 'editar',
  antes: null,
  depois: null,
  uid: 'u-admin',
  email: 'admin@seds.go.gov.br',
  perfil: 'admin',
  dataHora: new Date('2026-11-10T13:00:00Z'),
  ...dados,
})

const REGISTROS: RegistroAuditoria[] = [
  registro('r1', {
    caminho: 'chamamentos/ch1/propostas/p1/avaliacoes/1.1',
    acao: 'criar',
    depois: { nivel: 3, decisao: 'maioria' },
    uid: 'u-rel',
    email: 'relator@seds.go.gov.br',
    perfil: 'relator',
    dataHora: new Date('2026-11-09T12:00:00Z'),
  }),
  registro('r2', {
    caminho: 'chamamentos/ch1/propostas/p1',
    antes: { bloqueada: false, totais: { nf: 90 } },
    depois: { bloqueada: true, totais: { nf: 90 } },
    uid: 'u-pres',
    email: 'presidente@seds.go.gov.br',
    perfil: 'presidente',
    dataHora: new Date('2026-11-10T02:30:00Z'), // 09/11, 23h30 em Goiás
  }),
  registro('r3', { caminho: 'chamamentos/ch1/propostas/p2/experiencias/e1', acao: 'excluir', antes: { descricao: 'Contrato' }, email: null, uid: 'u-sem-email' }),
]

describe('trilha de auditoria — filtros', () => {
  it('por proposta (pelo caminho), usuário (e-mail ou uid), ação e período (dias de Goiás)', () => {
    const ids = (f: Parameters<typeof filtrarAuditoria>[1]) => filtrarAuditoria(REGISTROS, f).map((r) => r.id)
    expect(ids({})).toEqual(['r1', 'r2', 'r3'])
    expect(ids({ proposta: 'p1' })).toEqual(['r1', 'r2'])
    expect(ids({ usuario: 'RELATOR@' })).toEqual(['r1'])
    expect(ids({ usuario: 'u-sem' })).toEqual(['r3'])
    expect(ids({ acao: 'excluir' })).toEqual(['r3'])
    expect(ids({ de: '2026-11-10' })).toEqual(['r3'])
    expect(ids({ ate: '2026-11-09' })).toEqual(['r1', 'r2'])
    expect(ids({ proposta: 'p1', acao: 'editar', de: '2026-11-09', ate: '2026-11-09' })).toEqual(['r2'])
  })

  it('limites do período em horário de Brasília (Goiás)', () => {
    const { inicio, fim } = limitesDoPeriodo('2026-11-09', '2026-11-10')
    expect(inicio?.toISOString()).toBe('2026-11-09T03:00:00.000Z')
    expect(fim?.toISOString()).toBe('2026-11-11T02:59:59.999Z')
    expect(limitesDoPeriodo('', '')).toEqual({ inicio: null, fim: null })
  })

  it('proposta e descrição do objeto a partir do caminho', () => {
    expect(propostaDoRegistro('chamamentos/ch1/propostas/p1/avaliacoes/1.1')).toBe('p1')
    expect(propostaDoRegistro('oscs/x')).toBeNull()
    expect(descreverCaminho('chamamentos/ch1/propostas/p1/avaliacoes/1.1')).toBe('Nível do subcritério 1.1 (proposta p1)')
    expect(descreverCaminho('chamamentos/ch1/propostas/p1')).toBe('Proposta p1')
    expect(descreverCaminho('chamamentos/ch1/propostas/p2/experiencias/e1')).toBe('Experiência da D2 e1 (proposta p2)')
    expect(descreverCaminho('chamamentos/ch1/propostas/p2/diligencias/d1')).toBe('Diligência d1 (proposta p2)')
    expect(descreverCaminho('chamamentos/ch1/sessoes/s1')).toBe('Sessão s1')
    expect(descreverCaminho('chamamentos/ch1/desempates/L1--a-b')).toBe('Desempate L1--a-b')
    expect(descreverCaminho('usuarios/u1')).toBe('Perfil do usuário u1')
    expect(descreverCaminho('outro/x')).toBe('outro/x')
  })
})

describe('trilha de auditoria — antes/depois', () => {
  it('lista só os campos que mudaram, sem as marcas de tempo', () => {
    expect(diferencas({ bloqueada: false, totais: { nf: 90 }, atualizadoEm: 1 }, { bloqueada: true, totais: { nf: 90 }, atualizadoEm: 2 })).toEqual([
      { campo: 'bloqueada', antes: 'false', depois: 'true' },
    ])
    expect(diferencas(null, { nivel: 3 })).toEqual([{ campo: 'nivel', antes: '—', depois: '3' }])
    expect(diferencas({ descricao: 'Contrato' }, null)).toEqual([{ campo: 'descricao', antes: '"Contrato"', depois: '—' }])
  })
})

describe('trilha de auditoria — XLSX', () => {
  it('exporta as linhas filtradas com antes/depois e o rodapé', async () => {
    const rodape: Rodape = { geradoEm: new Date('2026-11-10T17:00:00Z'), geradoPor: 'controle@seds.go.gov.br', versaoMatriz: '2026', codigo: 'e'.repeat(64) }
    const arquivo = await auditoriaXlsx(REGISTROS, rodape)
    const livro = new ExcelJS.Workbook()
    await livro.xlsx.load(arquivo)
    const planilha = livro.worksheets[0]!
    const linhas = Array.from({ length: planilha.rowCount }, (_, i) => (planilha.getRow(i + 1).values as unknown[]).slice(1))
    expect(linhas[0]).toEqual(['Data/hora', 'Usuário', 'Perfil', 'Ação', 'Objeto', 'Caminho', 'Campos alterados', 'Antes', 'Depois'])
    expect(linhas[1]!.slice(1, 5)).toEqual(['relator@seds.go.gov.br', 'relator', 'criar', 'Nível do subcritério 1.1 (proposta p1)'])
    expect(linhas[3]![1]).toBe('u-sem-email')
    expect(String(linhas[2]![7])).toContain('"bloqueada": false')
    const texto = linhas.flat().map(String).join('\n')
    expect(texto).toContain('e'.repeat(64))
    expect(texto).toContain('controle@seds.go.gov.br')
  })
})
