import { describe, expect, it } from 'vitest'
import { problemasDaAdmissibilidade } from '../../src/domain/admissibilidade'
import { problemasDoRegistro } from '../../src/domain/avaliacao'
import { classificarLote } from '../../src/domain/classificacao'
import { cnpjValido } from '../../src/domain/cnpj'
import { problemasDaExperiencia } from '../../src/domain/d2'
import { MATRIZ_2026 } from '../../src/domain/matriz'
import { consolidarProposta } from '../../src/domain/proposta'
import { statusDaProposta } from '../../src/domain/statusProposta'
import { paraExperiencia } from '../../src/esquemas/experiencia'
import { CHAMAMENTO_ENSAIO, montarEnsaio } from './ensaio'

type Doc = Record<string, unknown>
const ensaio = montarEnsaio('2026-11-10')
const docs = ensaio.documentos
const base = `chamamentos/${CHAMAMENTO_ENSAIO}`
const daColecao = (prefixo: string) =>
  Object.entries(docs).filter(([c]) => c.startsWith(`${prefixo}/`) && c.split('/').length === prefixo.split('/').length + 1)
const propostas = () => daColecao(`${base}/propostas`).map(([c, d]) => ({ id: c.split('/').at(-1)!, ...(d as Doc) }))

describe('ensaio — dados fictícios do dev', () => {
  it('1 chamamento marcado como ensaio, 2 lotes e 3 OSCs com CNPJ válido', () => {
    const ch = docs[base] as { lotes: unknown[]; ensaio: boolean; titulo: string; dataLimitePropostas: string }
    expect(ch.ensaio).toBe(true)
    expect(ch.titulo).toMatch(/ENSAIO/)
    expect(ch.lotes).toHaveLength(2)
    const oscs = daColecao('oscs')
    expect(oscs).toHaveLength(3)
    for (const [caminho, osc] of oscs) {
      expect(cnpjValido(caminho.split('/')[1]!)).toBe(true)
      expect(osc).toMatchObject({ ensaio: true, razaoSocial: expect.stringMatching(/ENSAIO/) })
    }
    expect(Object.keys(docs).every((c) => c.startsWith(`${base}`) || c.startsWith('oscs/'))).toBe(true)
  })

  it('uma proposta por OSC em cada lote', () => {
    const chaves = propostas().map((p) => `${p.loteCodigo as string}|${p.oscCnpj as string}`)
    expect(new Set(chaves).size).toBe(chaves.length)
  })

  it('cobre apta, inapta (D1 < 67,2), desclassificada (nível 0 em 1.1), não admitida e pendente', () => {
    const porStatus = (s: string) => propostas().filter((p) => statusDaProposta(p) === s)
    expect(porStatus('apta').length).toBeGreaterThanOrEqual(1)
    const [inapta] = porStatus('inapta')
    expect((inapta!.totais as { d1: number }).d1).toBeLessThan(MATRIZ_2026.dimensao1.corte)
    const [desclassificada] = porStatus('desclassificada')
    expect((docs[`${base}/propostas/${desclassificada!.id}/avaliacoes/1.1`] as { nivel: number }).nivel).toBe(0)
    expect(porStatus('nao_admitida')).toHaveLength(1)
    expect(porStatus('pendente')).toHaveLength(1)
    expect(ensaio.propostas.map((p) => p.esperado).sort()).toEqual(
      ['apta', 'apta', 'desclassificada', 'inapta', 'nao_admitida', 'pendente'].sort(),
    )
  })

  it('tem um empate de NF entre aptas no mesmo lote (classificação não definitiva)', () => {
    const porLote = (lote: string) => propostas().filter((p) => p.loteCodigo === lote)
    const empates = ['L1', 'L2'].flatMap((lote) => {
      const r = classificarLote(
        porLote(lote).map((p) => ({ id: p.id, totais: (p.totais as never) ?? null, admissao: (p.admissibilidade as { situacao: never } | undefined)?.situacao })),
      )
      return r.empates
    })
    expect(empates).toHaveLength(1)
    expect(empates[0]!.ids).toHaveLength(2)
  })

  it('registros válidos pelas regras do domínio (avaliações, experiências, admissibilidade)', () => {
    for (const [caminho, a] of Object.entries(docs).filter(([c]) => c.includes('/avaliacoes/'))) {
      const registro = { codigo: caminho.split('/').at(-1)!, ...(a as Doc) } as Parameters<typeof problemasDoRegistro>[0]
      expect(problemasDoRegistro(registro), caminho).toEqual({})
      expect((a as { sessaoId: string }).sessaoId).toBe(ensaio.sessaoId)
    }
    const experiencias = Object.entries(docs).filter(([c]) => c.includes('/experiencias/'))
    expect(experiencias.length).toBeGreaterThan(0)
    for (const [caminho, e] of experiencias) expect(problemasDaExperiencia(paraExperiencia(caminho, e as Doc)), caminho).toEqual({})
    for (const p of propostas()) {
      const adm = p.admissibilidade as Parameters<typeof problemasDaAdmissibilidade>[0]
      expect(problemasDaAdmissibilidade(adm), p.id).toEqual({})
    }
  })

  it('totais e memória da D2 iguais aos que a /api calcularia (recalcular.ts)', () => {
    for (const p of propostas().filter((x) => x.totais)) {
      const prefixo = `${base}/propostas/${p.id}`
      const niveis = Object.fromEntries(daColecao(`${prefixo}/avaliacoes`).map(([c, a]) => [c.split('/').at(-1)!, (a as { nivel: number }).nivel]))
      const experiencias = daColecao(`${prefixo}/experiencias`)
        .map(([c, e]) => paraExperiencia(c.split('/').at(-1)!, e as Doc))
        .sort((a, b) => a.inicio.localeCompare(b.inicio) || a.id.localeCompare(b.id))
      const esperado = consolidarProposta({ niveis, experiencias, dataLimite: (docs[base] as { dataLimitePropostas: string }).dataLimitePropostas })
      expect(p.totais, p.id).toEqual(esperado.totais)
      expect(docs[`${prefixo}/resultadoD2/atual`], p.id).toEqual(esperado.resultadoD2)
    }
  })

  it('sessão encerrada do ensaio com a pauta das propostas avaliadas', () => {
    const sessao = docs[`${base}/sessoes/${ensaio.sessaoId}`] as { status: string; data: string; pauta: string[] }
    expect(sessao).toMatchObject({ status: 'encerrada', data: '2026-11-10' })
    const avaliadas = propostas().filter((p) => p.totais).map((p) => p.id)
    expect([...sessao.pauta].sort()).toEqual(avaliadas.sort())
  })
})
