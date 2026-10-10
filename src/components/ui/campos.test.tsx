// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { cnpj } from '../../esquemas/base'
import { CNPJField } from './CNPJField'
import { Checkbox } from './Checkbox'
import { CurrencyField, centavosDoTexto, formatarCentavos } from './CurrencyField'
import { DatePicker } from './DatePicker'
import { NumberField } from './NumberField'
import { RadioGroup } from './RadioGroup'
import { Select } from './Select'
import { Switch } from './Switch'
import { TextArea } from './TextArea'
import { TextField } from './TextField'
import { resolverZod } from './form'

describe('Field / TextField', () => {
  it('rótulo programático, ajuda ligada por aria-describedby e obrigatório', () => {
    render(<TextField rotulo="Nome da OSC" ajuda="Como no CNPJ." obrigatorio />)
    const campo = screen.getByRole('textbox', { name: /Nome da OSC/ })
    expect(campo).toHaveAccessibleDescription('Como no CNPJ.')
    expect(campo).toBeRequired()
  })

  it('erro: aria-invalid, borda de erro e mensagem com ícone ⚠ e texto (nunca só cor)', () => {
    render(<TextField rotulo="Nome" erro="Informe o nome." />)
    const campo = screen.getByRole('textbox', { name: 'Nome' })
    expect(campo).toHaveAttribute('aria-invalid', 'true')
    expect(campo).toHaveClass('border-input-border-error')
    expect(campo).toHaveAccessibleDescription('Erro: Informe o nome.')
    const mensagem = screen.getByText('Informe o nome.').closest('p')!
    expect(mensagem.querySelector('svg')).toBeInTheDocument()
    expect(mensagem).toHaveClass('text-status-error-text')
  })

  it('mensagem de erro anunciada: região aria-live já presente antes do erro, que recebe a mensagem', () => {
    const { rerender } = render(<TextField rotulo="Nome" />)
    const regiao = document.querySelector('[aria-live="polite"]')
    expect(regiao).not.toBeNull()
    expect(regiao).toBeEmptyDOMElement()
    rerender(<TextField rotulo="Nome" erro="Informe o nome." />)
    expect(document.querySelector('[aria-live="polite"]')).toBe(regiao)
    expect(regiao).toHaveTextContent('Erro: Informe o nome.')
  })

  it('sucesso: borda de sucesso e mensagem com ícone e texto', () => {
    render(<TextField rotulo="E-mail" sucesso="E-mail disponível." />)
    expect(screen.getByRole('textbox')).toHaveClass('border-input-border-success')
    expect(screen.getByRole('textbox')).toHaveAccessibleDescription('Sucesso: E-mail disponível.')
  })

  it('desabilitado e somente leitura', () => {
    render(
      <>
        <TextField rotulo="A" desabilitado defaultValue="x" />
        <TextField rotulo="B" somenteLeitura defaultValue="y" />
      </>,
    )
    expect(screen.getByRole('textbox', { name: 'A' })).toBeDisabled()
    expect(screen.getByRole('textbox', { name: 'B' })).toHaveAttribute('readonly')
    expect(screen.getByRole('textbox', { name: 'B' })).toHaveClass('read-only:bg-input-bg-readonly')
  })

  it('digitação pelo teclado (estado preenchido)', async () => {
    render(<TextField rotulo="Nome" />)
    await userEvent.type(screen.getByRole('textbox'), 'Instituto')
    expect(screen.getByRole('textbox')).toHaveValue('Instituto')
  })
})

describe('TextArea com contador', () => {
  it('conta caracteres e mostra o mínimo e o máximo', async () => {
    render(<TextArea rotulo="Justificativa" minimo={20} maximo={2000} />)
    const campo = screen.getByRole('textbox', { name: 'Justificativa' })
    expect(screen.getByText('0 / mín. 20 · máx. 2000')).toBeInTheDocument()
    await userEvent.type(campo, 'Texto curto')
    expect(screen.getByText('11 / mín. 20 · máx. 2000')).toBeInTheDocument()
    expect(campo).toHaveAttribute('maxlength', '2000')
  })
})

describe('Select, DatePicker, NumberField', () => {
  it('Select com opções e item vazio', async () => {
    render(<Select rotulo="Lote" vazio="Selecione…" opcoes={[{ valor: 'L1', rotulo: 'Lote 1' }, { valor: 'L2', rotulo: 'Lote 2' }]} />)
    const lista = screen.getByRole('combobox', { name: 'Lote' })
    await userEvent.selectOptions(lista, 'L2')
    expect(lista).toHaveValue('L2')
  })

  it('DatePicker é um campo de data nativo (teclado e leitor de tela)', () => {
    render(<DatePicker rotulo="Prazo" min="2026-11-01" />)
    const campo = screen.getByLabelText('Prazo')
    expect(campo).toHaveAttribute('type', 'date')
    expect(campo).toHaveAttribute('min', '2026-11-01')
  })

  it('NumberField: setas do teclado e limites', async () => {
    render(<NumberField rotulo="Vagas" min={0} max={10} defaultValue={1} />)
    const campo = screen.getByRole('spinbutton', { name: 'Vagas' })
    expect(campo).toHaveAttribute('min', '0')
    expect(campo).toHaveAttribute('max', '10')
  })
})

describe('Checkbox, RadioGroup, Switch', () => {
  it('Checkbox marca com Espaço e mostra erro com ícone', async () => {
    render(<Checkbox rotulo="Declaro que não há impedimento" erro="Obrigatório." />)
    const caixa = screen.getByRole('checkbox', { name: 'Declaro que não há impedimento' })
    caixa.focus()
    await userEvent.keyboard(' ')
    expect(caixa).toBeChecked()
    expect(caixa).toHaveAccessibleDescription('Erro: Obrigatório.')
  })

  it('RadioGroup: fieldset com legenda e setas do teclado entre as opções', async () => {
    render(<RadioGroup rotulo="Decisão" name="decisao" opcoes={[{ valor: 'unanimidade', rotulo: 'Unanimidade' }, { valor: 'maioria', rotulo: 'Maioria' }]} />)
    const grupo = screen.getByRole('radiogroup', { name: 'Decisão' })
    await userEvent.click(within(grupo).getByRole('radio', { name: 'Unanimidade' }))
    await userEvent.keyboard('{ArrowDown}')
    expect(within(grupo).getByRole('radio', { name: 'Maioria' })).toBeChecked()
  })

  it('Switch: role switch, aria-checked e alterna com Espaço e Enter', async () => {
    function Exemplo() {
      const [ligado, setLigado] = useState(false)
      return <Switch rotulo="Somente pendentes" ligado={ligado} onMudar={setLigado} />
    }
    render(<Exemplo />)
    const chave = screen.getByRole('switch', { name: 'Somente pendentes' })
    expect(chave).toHaveAttribute('aria-checked', 'false')
    chave.focus()
    await userEvent.keyboard(' ')
    expect(chave).toHaveAttribute('aria-checked', 'true')
    await userEvent.keyboard('{Enter}')
    expect(chave).toHaveAttribute('aria-checked', 'false')
  })
})

describe('CNPJField (máscara + validação existente de src/domain/cnpj)', () => {
  it('aplica a máscara ao digitar (numérico e alfanumérico)', async () => {
    render(<CNPJField rotulo="CNPJ" />)
    const campo = screen.getByRole('textbox', { name: 'CNPJ' })
    await userEvent.type(campo, '11222333000181')
    expect(campo).toHaveValue('11.222.333/0001-81')
  })

  it('CNPJ completo e inválido: erro com ícone ao sair do campo', async () => {
    render(<CNPJField rotulo="CNPJ" />)
    await userEvent.type(screen.getByRole('textbox'), '11222333000180')
    await userEvent.tab()
    expect(screen.getByRole('textbox')).toHaveAccessibleDescription('Erro: CNPJ inválido.')
  })
})

describe('CurrencyField (R$, em centavos)', () => {
  it('formata e converte', () => {
    expect(formatarCentavos(123456)).toBe('1.234,56')
    expect(formatarCentavos(null)).toBe('')
    expect(centavosDoTexto('R$ 1.234,56')).toBe(123456)
    expect(centavosDoTexto('')).toBeNull()
  })

  it('digitação da direita para a esquerda (centavos), com R$ visível', async () => {
    const aoMudar = vi.fn()
    function Exemplo() {
      const [valor, setValor] = useState<number | null>(null)
      return (
        <CurrencyField
          rotulo="Valor anual"
          valor={valor}
          onMudar={(v) => {
            setValor(v)
            aoMudar(v)
          }}
        />
      )
    }
    render(<Exemplo />)
    const campo = screen.getByRole('textbox', { name: 'Valor anual (R$)' })
    await userEvent.type(campo, '123456')
    expect(campo).toHaveValue('1.234,56')
    expect(aoMudar).toHaveBeenLastCalledWith(123456)
    expect(screen.getByText('R$')).toBeInTheDocument()
  })
})

describe('integração react-hook-form + zod', () => {
  const esquema = z.object({
    nome: z.string().trim().min(3, 'Informe o nome.'),
    cnpj,
    valorCentavos: z.number({ error: 'Informe o valor.' }).int().positive('Informe o valor.'),
    aceite: z.literal(true, { error: 'Confirme a declaração.' }),
    ativo: z.boolean(),
  })

  function Formulario({ aoEnviar }: { aoEnviar: (dados: z.output<typeof esquema>) => void }) {
    const { register, control, handleSubmit, formState } = useForm({
      resolver: resolverZod(esquema),
      defaultValues: { nome: '', cnpj: '', valorCentavos: null as unknown as number, aceite: false as unknown as true, ativo: true },
    })
    const e = formState.errors
    return (
      <form onSubmit={handleSubmit(aoEnviar)} noValidate>
        <TextField rotulo="Nome" erro={e.nome?.message} {...register('nome')} />
        <CNPJField rotulo="CNPJ" erro={e.cnpj?.message} {...register('cnpj')} />
        <Controller
          control={control}
          name="valorCentavos"
          render={({ field }) => <CurrencyField rotulo="Valor" valor={field.value} onMudar={field.onChange} erro={e.valorCentavos?.message} />}
        />
        <Checkbox rotulo="Declaro" erro={e.aceite?.message} {...register('aceite')} />
        <Controller control={control} name="ativo" render={({ field }) => <Switch rotulo="Ativo" ligado={field.value} onMudar={field.onChange} />} />
        <button type="submit">Enviar</button>
      </form>
    )
  }

  it('erros do zod aparecem nos campos; dados válidos chegam já convertidos', async () => {
    const aoEnviar = vi.fn()
    render(<Formulario aoEnviar={aoEnviar} />)
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(await screen.findByText('Informe o nome.')).toBeInTheDocument()
    expect(screen.getByText('Confirme a declaração.')).toBeInTheDocument()
    expect(screen.getByText('Informe o valor.')).toBeInTheDocument()
    expect(aoEnviar).not.toHaveBeenCalled()

    await userEvent.type(screen.getByRole('textbox', { name: 'Nome' }), 'Instituto Esperança')
    await userEvent.type(screen.getByRole('textbox', { name: 'CNPJ' }), '11222333000181')
    await userEvent.type(screen.getByRole('textbox', { name: 'Valor (R$)' }), '500000')
    await userEvent.click(screen.getByRole('checkbox', { name: 'Declaro' }))
    await userEvent.click(screen.getByRole('switch', { name: 'Ativo' }))
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(aoEnviar).toHaveBeenCalledWith(
      { nome: 'Instituto Esperança', cnpj: '11222333000181', valorCentavos: 500000, aceite: true, ativo: false },
      expect.anything(),
    )
  })
})
