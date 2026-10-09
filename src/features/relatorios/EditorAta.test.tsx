// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EditorAta } from './EditorAta'

describe('EditorAta — texto editável antes de exportar', () => {
  it('exporta o texto como ficou depois da edição', async () => {
    const onExportar = vi.fn().mockResolvedValue(undefined)
    render(<EditorAta textoInicial={'ATA\n1. PRESENTES'} minuta onExportar={onExportar} />)
    const campo = screen.getByLabelText('Texto da ata')
    expect(campo).toHaveValue('ATA\n1. PRESENTES')
    await userEvent.type(campo, '\nObservação do relator.')
    await userEvent.click(screen.getByRole('button', { name: 'Exportar PDF' }))
    expect(onExportar).toHaveBeenCalledWith('ATA\n1. PRESENTES\nObservação do relator.')
  })

  it('restaura o texto gerado e avisa da marca MINUTA', async () => {
    render(<EditorAta textoInicial="Original" minuta onExportar={vi.fn()} />)
    const campo = screen.getByLabelText('Texto da ata')
    await userEvent.clear(campo)
    await userEvent.type(campo, 'Outro')
    await userEvent.click(screen.getByRole('button', { name: 'Restaurar texto gerado' }))
    expect(campo).toHaveValue('Original')
    expect(screen.getByText(/marca d’água "MINUTA"/)).toBeInTheDocument()
  })

  it('não exporta texto vazio', async () => {
    const onExportar = vi.fn()
    render(<EditorAta textoInicial="Original" minuta={false} onExportar={onExportar} />)
    await userEvent.clear(screen.getByLabelText('Texto da ata'))
    await userEvent.click(screen.getByRole('button', { name: 'Exportar PDF' }))
    expect(onExportar).not.toHaveBeenCalled()
    expect(screen.getByText('O texto da ata está vazio.')).toBeInTheDocument()
  })
})
