// @vitest-environment jsdom
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FormExperiencia } from './FormExperiencia'
import { TabelaExperiencias, type ExperienciaGravada } from './TabelaExperiencias'

const CASE: ExperienciaGravada = {
  id: 'e1',
  descricao: 'Gestão do CASE Goiânia',
  categorias: ['A', 'D'],
  modalidade: 'internacao',
  orgaoParceiro: 'SEDS/GO',
  instrumento: 'TC 01/2019',
  mrosc: true,
  inicio: '2019-01-01',
  fim: null,
  vagas: 90,
  unidades: 2,
  trabalhadores: 70,
  valorAnualCentavos: 1_200_000_000,
  documentos: [
    { tipo: 'Termo de Colaboração', numeroSEI: '000012345', comprovaExecucaoSatisfatoria: false, aceito: true },
    { tipo: 'Atestado de capacidade técnica', numeroSEI: '000067890', comprovaExecucaoSatisfatoria: true, aceito: false },
  ],
  desconsideracoes: [],
}

function montar(props: Partial<Parameters<typeof TabelaExperiencias>[0]> = {}) {
  const acoes = { onEditar: vi.fn(), onExcluir: vi.fn(), onDesconsiderar: vi.fn().mockResolvedValue(undefined) }
  render(<TabelaExperiencias experiencias={[CASE]} somenteLeitura={false} {...acoes} {...props} />)
  return acoes
}

describe('Tabela de experiências da D2', () => {
  it('mostra categoria, modalidade, órgão, instrumento, período, MROSC, porte e valor', () => {
    montar()
    const linha = screen.getByRole('row', { name: /Gestão do CASE Goiânia/ })
    for (const texto of ['A, D', 'Internação', 'SEDS/GO', 'TC 01/2019', '01/01/2019', 'em execução', 'Sim', '90', '70', 'R$ 12.000.000,00']) {
      expect(linha).toHaveTextContent(texto)
    }
  })

  it('documentos de cada experiência: tipo, nº SEI, comprova execução satisfatória e aceito', async () => {
    montar()
    await userEvent.click(screen.getByRole('button', { name: 'Documentos (2) de Gestão do CASE Goiânia' }))
    const lista = screen.getByRole('table', { name: 'Documentos de Gestão do CASE Goiânia' })
    expect(within(lista).getByRole('row', { name: /Termo de Colaboração/ })).toHaveTextContent('000012345')
    const atestado = within(lista).getByRole('row', { name: /Atestado/ })
    expect(atestado).toHaveTextContent('Comprova execução satisfatória: sim')
    expect(atestado).toHaveTextContent('Aceito: não')
  })

  it('desconsiderar exige justificativa (Anexo IV, 3.8.5) e envia por critério', async () => {
    const { onDesconsiderar } = montar()
    await userEvent.click(screen.getByRole('button', { name: 'Desconsiderar Gestão do CASE Goiânia' }))
    const dialogo = screen.getByRole('dialog', { name: /Desconsiderar/ })
    await userEvent.click(within(dialogo).getByRole('checkbox', { name: /C2\.3/ }))
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Aplicar' }))
    expect(await within(dialogo).findByText('Informe a justificativa da desconsideração (Anexo IV, 3.8.5).')).toBeInTheDocument()
    expect(onDesconsiderar).not.toHaveBeenCalled()

    await userEvent.type(within(dialogo).getByLabelText(/Justificativa/), 'Documento não identifica vagas.')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Aplicar' }))
    await waitFor(() =>
      expect(onDesconsiderar).toHaveBeenCalledWith('e1', [{ criterio: 'C2.3', justificativa: 'Documento não identifica vagas.' }]),
    )
  })

  it('desconsideração gravada aparece na linha', () => {
    montar({ experiencias: [{ ...CASE, desconsideracoes: [{ criterio: 'C2.3', justificativa: 'Sem vagas.' }] }] })
    expect(screen.getByRole('row', { name: /Gestão do CASE Goiânia/ })).toHaveTextContent('Desconsiderada em C2.3')
  })

  it('somente leitura: sem editar, excluir ou desconsiderar', () => {
    montar({ somenteLeitura: true })
    expect(screen.queryByRole('button', { name: /^Editar/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Excluir/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Desconsiderar/ })).not.toBeInTheDocument()
  })
})

describe('Formulário de experiência', () => {
  async function preencherMinimo() {
    await userEvent.type(screen.getByLabelText('Descrição'), 'Gestão do CASE Goiânia')
    await userEvent.click(screen.getByRole('checkbox', { name: 'Categoria A' }))
    await userEvent.selectOptions(screen.getByLabelText('Modalidade'), 'internacao')
    await userEvent.type(screen.getByLabelText('Início'), '2019-01-01')
  }

  it('categoria D sem MROSC: regra do domínio no navegador', async () => {
    const onSalvar = vi.fn()
    render(<FormExperiencia onSalvar={onSalvar} />)
    await preencherMinimo()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Categoria D' }))
    await userEvent.click(screen.getByRole('button', { name: 'Salvar experiência' }))
    expect(await screen.findByText('A categoria D exige parceria regida pelo MROSC (Lei Federal nº 13.019/2014).')).toBeInTheDocument()
    expect(onSalvar).not.toHaveBeenCalled()
  })

  it('valor anual em reais vira centavos; documentos entram na lista', async () => {
    const onSalvar = vi.fn().mockResolvedValue(undefined)
    render(<FormExperiencia onSalvar={onSalvar} />)
    await preencherMinimo()
    await userEvent.type(screen.getByLabelText('Valor anual (R$)'), '12.000.000,00')
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar documento' }))
    await userEvent.type(screen.getByLabelText('Tipo do documento 1'), 'Atestado de capacidade técnica')
    await userEvent.type(screen.getByLabelText('Nº SEI do documento 1'), '000067890')
    await userEvent.click(screen.getByRole('checkbox', { name: 'Documento 1 comprova execução satisfatória' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Documento 1 aceito' }))
    await userEvent.click(screen.getByRole('button', { name: 'Salvar experiência' }))
    await waitFor(() => expect(onSalvar).toHaveBeenCalledTimes(1))
    expect(onSalvar.mock.calls[0]![0]).toMatchObject({
      descricao: 'Gestão do CASE Goiânia',
      categorias: ['A'],
      modalidade: 'internacao',
      inicio: '2019-01-01',
      fim: null,
      valorAnualCentavos: 1_200_000_000,
      documentos: [{ tipo: 'Atestado de capacidade técnica', numeroSEI: '000067890', comprovaExecucaoSatisfatoria: true, aceito: true }],
    })
  })
})
