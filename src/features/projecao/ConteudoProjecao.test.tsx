// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { formatarNumero } from '../../domain/formatacao'
import { MATRIZ_2026 } from '../../domain/matriz'
import {
  ProjecaoAdmissibilidade,
  ProjecaoD2,
  ProjecaoResumo,
  ProjecaoSubcriterio,
  TelaEspera,
} from './ConteudoProjecao'
import { admissibilidadeExemplo, resultadoD2Exemplo, totaisExemplo } from '../../testes/fixturesProjecao'

const subcriterio = (codigo: string) => MATRIZ_2026.dimensao1.planos.flatMap((p) => p.subcriterios).find((s) => s.codigo === codigo)!

describe('Projeção — admissibilidade', () => {
  it('checklist 28.1 com atendido/não atendido e tabela de páginas com excesso destacado', () => {
    render(<ProjecaoAdmissibilidade admissibilidade={admissibilidadeExemplo()} />)
    for (const r of MATRIZ_2026.admissibilidade.requisitosEssenciais) {
      expect(screen.getByText(r.descricao)).toBeInTheDocument()
    }
    expect(screen.getByRole('listitem', { name: '28.1.IV: não atendido' })).toBeInTheDocument()
    expect(screen.getByRole('listitem', { name: '28.1.I: atendido' })).toBeInTheDocument()
    const pa3 = screen.getByRole('row', { name: /^PA3\b/ })
    expect(pa3).toHaveAttribute('data-excede', 'true')
    expect(pa3).toHaveTextContent('Excede em 2')
    expect(screen.getByRole('row', { name: /^PA1\b/ })).toHaveAttribute('data-excede', 'false')
    expect(screen.getByText(/Não admitida/)).toBeInTheDocument()
  })

  it('sem registro → aviso', () => {
    render(<ProjecaoAdmissibilidade admissibilidade={null} />)
    expect(screen.getByText('Admissibilidade ainda não registrada.')).toBeInTheDocument()
  })
})

describe('Projeção — subcritério', () => {
  const registro = {
    nivel: 2,
    justificativa: 'Lacunas relevantes nos fluxos de atendimento.',
    paginas: [2, 5],
    decisao: 'maioria' as const,
    votoDivergente: 'Membro X: nível 3.',
  }

  it('código, título, elementos, escala com o nível registrado destacado, decisão, justificativa e páginas', () => {
    render(<ProjecaoSubcriterio codigo="3.1" registro={registro} />)
    const s = subcriterio('3.1')
    expect(screen.getByRole('heading', { name: `${s.codigo} — ${s.titulo}` })).toBeInTheDocument()
    for (const e of s.elementos) expect(screen.getByText(e)).toBeInTheDocument()
    const niveis = screen.getAllByRole('listitem').filter((li) => /^Nível \d/.test(li.getAttribute('aria-label') ?? ''))
    expect(niveis).toHaveLength(5)
    const registrado = screen.getByRole('listitem', { name: 'Nível 2' })
    expect(registrado).toHaveAttribute('aria-current', 'true')
    expect(within(registrado).getByText('Nível registrado')).toBeInTheDocument()
    expect(screen.getByRole('listitem', { name: 'Nível 3' })).not.toHaveAttribute('aria-current')
    for (const { descritor } of MATRIZ_2026.dimensao1.escala) expect(screen.getByText(descritor)).toBeInTheDocument()
    expect(screen.getByText('Maioria')).toBeInTheDocument()
    expect(screen.getByText('Membro X: nível 3.')).toBeInTheDocument()
    expect(screen.getByText('Lacunas relevantes nos fluxos de atendimento.')).toBeInTheDocument()
    expect(screen.getByText('Páginas citadas: 2, 5')).toBeInTheDocument()
  })

  it('sem registro: escala sem destaque e aviso de aguardando', () => {
    render(<ProjecaoSubcriterio codigo="1.1" registro={null} />)
    expect(screen.getByText('Aguardando registro da Comissão')).toBeInTheDocument()
    expect(screen.queryByText('Nível registrado')).not.toBeInTheDocument()
  })
})

describe('Projeção — D2', () => {
  it('pontos por critério e memória resumida com o nome das experiências', () => {
    const r = resultadoD2Exemplo()
    render(<ProjecaoD2 resultado={r} nomes={{ e1: 'Gestão do CASE Goiânia', e2: 'Projeto esportivo' }} />)
    expect(screen.getByText(`D2 = ${formatarNumero(r.total)} / 20`)).toBeInTheDocument()
    for (const rotulo of ['2.1', '2.2', '2.3.1 A', '2.3.1 B', '2.3.2', '2.3.3', '2.4']) {
      expect(screen.getByRole('row', { name: new RegExp(`^${rotulo.replace(/\./g, '\\.')}\\b`) })).toBeInTheDocument()
    }
    const c21 = screen.getByRole('row', { name: /^2\.1\b/ })
    expect(c21).toHaveTextContent(`${formatarNumero(r.criterios['C2.1'].pontos)} / 8`)
    expect(c21).toHaveTextContent('Gestão do CASE Goiânia')
    expect(c21).not.toHaveTextContent('e1')
  })

  it('sem cálculo → aviso', () => {
    render(<ProjecaoD2 resultado={null} nomes={{}} />)
    expect(screen.getByText('D2 ainda não calculada.')).toBeInTheDocument()
  })
})

describe('Projeção — resumo', () => {
  it('PA1…PA6, D1, D2, NF e status', () => {
    const t = totaisExemplo()
    render(<ProjecaoResumo totais={t} status="apta" />)
    for (const pa of t.totaisPorPA) {
      expect(screen.getByRole('row', { name: new RegExp(`^${pa.codigo}\\b`) })).toHaveTextContent(
        `${formatarNumero(pa.pontos)} / ${formatarNumero(pa.maximo)}`,
      )
    }
    expect(screen.getByRole('group', { name: 'D1' })).toHaveTextContent(formatarNumero(t.d1))
    expect(screen.getByRole('group', { name: 'D2' })).toHaveTextContent(formatarNumero(t.d2))
    expect(screen.getByRole('group', { name: 'NF' })).toHaveTextContent(formatarNumero(t.nf))
    expect(screen.getByRole('group', { name: 'Status' })).toHaveTextContent('Apta')
  })

  it('sem totais → pendente', () => {
    render(<ProjecaoResumo totais={null} status="pendente" />)
    expect(screen.getByText('Avaliação ainda não iniciada.')).toBeInTheDocument()
  })
})

describe('Projeção — sem foco', () => {
  it('tela de espera com o nome do chamamento', () => {
    render(<TelaEspera chamamento={{ numero: '001/2026', titulo: 'Chamamento Público SEDS/GO 2026' }} />)
    expect(screen.getByRole('heading', { name: 'Chamamento 001/2026 — Chamamento Público SEDS/GO 2026' })).toBeInTheDocument()
    expect(screen.getByText('Aguardando a Comissão definir o item em discussão')).toBeInTheDocument()
  })
})
