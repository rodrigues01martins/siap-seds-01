import { describe, expect, it } from 'vitest'
import { chaveDaExperiencia, copiaParaOutroLote, equivalentes, planejarReplicacao } from './replicacaoD2'

const BASE = {
  descricao: 'Gestão do CASE Goiânia',
  categorias: ['A', 'D'],
  modalidade: 'internacao',
  orgaoParceiro: 'SEDS/GO',
  instrumento: 'Termo de Colaboração nº 01/2019',
  mrosc: true,
  inicio: '2019-01-01',
  fim: null,
  vagas: 90,
  unidades: 2,
  trabalhadores: 70,
  valorAnualCentavos: 1_200_000_000,
  documentos: [
    { tipo: 'Termo de Colaboração', numeroSEI: '000012345', comprovaExecucaoSatisfatoria: false, aceito: true },
    { tipo: 'Atestado', numeroSEI: '000067890', comprovaExecucaoSatisfatoria: true, aceito: true },
  ],
  desconsideracoes: [{ criterio: 'C2.3', justificativa: 'Valor não comprovado.' }],
  sessaoId: 's-origem',
  atualizadoPor: { nome: 'Origem', email: 'o@go.gov.br' },
}

describe('cópia para o outro lote: dados cadastrais e documentais, sem decisões avaliativas', () => {
  it('copia os campos cadastrais e os documentos com aceito = false; desconsiderações vazias; sem sessão, autoria ou id', () => {
    const copia = copiaParaOutroLote({ ...BASE, id: 'x' })
    expect(copia).toEqual({
      descricao: BASE.descricao,
      categorias: ['A', 'D'],
      modalidade: 'internacao',
      orgaoParceiro: 'SEDS/GO',
      instrumento: 'Termo de Colaboração nº 01/2019',
      mrosc: true,
      inicio: '2019-01-01',
      fim: null,
      vagas: 90,
      unidades: 2,
      trabalhadores: 70,
      valorAnualCentavos: 1_200_000_000,
      documentos: [
        { tipo: 'Termo de Colaboração', numeroSEI: '000012345', comprovaExecucaoSatisfatoria: false, aceito: false },
        { tipo: 'Atestado', numeroSEI: '000067890', comprovaExecucaoSatisfatoria: true, aceito: false },
      ],
      desconsideracoes: [],
    })
  })

  it('campos ausentes na origem continuam ausentes (não inventa valores)', () => {
    const copia = copiaParaOutroLote({ descricao: 'X', categorias: ['C'], modalidade: 'outra', inicio: '2020-01-01', fim: null })
    expect(copia).toEqual({ descricao: 'X', categorias: ['C'], modalidade: 'outra', inicio: '2020-01-01', fim: null, documentos: [], desconsideracoes: [] })
  })
})

describe('equivalência determinística (sem duplicar e sem falsos positivos)', () => {
  it('ignora diferenças de forma (espaços, maiúsculas, acentos, ordem das categorias) e as decisões (aceite, desconsideração)', () => {
    const outra = {
      ...BASE,
      descricao: '  gestao do case   GOIÂNIA ',
      categorias: ['D', 'A'],
      documentos: BASE.documentos.map((d) => ({ ...d, aceito: false })),
      desconsideracoes: [],
    }
    expect(chaveDaExperiencia(outra)).toBe(chaveDaExperiencia(BASE))
    expect(equivalentes(BASE, outra)).toBe(true)
  })

  it('destino com documento a mais (incluído pela Comissão) continua equivalente; com documento a menos, não', () => {
    const comMais = { ...BASE, documentos: [...BASE.documentos, { tipo: 'Empenho', numeroSEI: '1', comprovaExecucaoSatisfatoria: false, aceito: true }] }
    expect(equivalentes(BASE, comMais)).toBe(true)
    expect(equivalentes(BASE, { ...BASE, documentos: [BASE.documentos[0]!] })).toBe(false)
  })

  it.each([
    ['início', { inicio: '2021-01-01' }],
    ['fim', { fim: '2022-12-31' }],
    ['vagas', { vagas: 91 }],
    ['modalidade', { modalidade: 'semiliberdade' }],
    ['instrumento', { instrumento: 'Termo de Colaboração nº 02/2019' }],
    ['valor', { valorAnualCentavos: 1 }],
    ['MROSC', { mrosc: false }],
    ['comprovação do documento', { documentos: [BASE.documentos[0]!, { ...BASE.documentos[1]!, comprovaExecucaoSatisfatoria: false }] }],
  ])('mesma descrição com %s diferente: não equivalente', (_campo, ajuste) => {
    expect(equivalentes(BASE, { ...BASE, ...ajuste })).toBe(false)
  })

  it('ausente, nulo e vazio valem o mesmo nos campos opcionais', () => {
    const { orgaoParceiro: _o, unidades: _u, ...semOpcionais } = BASE
    expect(equivalentes(semOpcionais, { ...semOpcionais, orgaoParceiro: '', unidades: null })).toBe(true)
  })
})

describe('plano da replicação', () => {
  it('copia só o que não tem equivalente no destino; repetidas na origem viram uma só cópia', () => {
    const outra = { ...BASE, descricao: 'Outra experiência', inicio: '2015-01-01' }
    const plano = planejarReplicacao([BASE, outra, { ...BASE }], [{ ...BASE, documentos: BASE.documentos.map((d) => ({ ...d, aceito: false })) }])
    expect(plano.copiar.map((e) => e.descricao)).toEqual(['Outra experiência'])
    expect(plano.equivalentes).toBe(2)
  })

  it('destino vazio: tudo é copiado', () => {
    expect(planejarReplicacao([BASE], []).copiar).toHaveLength(1)
  })
})
