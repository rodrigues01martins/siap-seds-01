// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'
import { NaoEncontrado } from './NaoEncontrado'

describe('página "não encontrado" (rota inexistente, ex.: o antigo catálogo /ui)', () => {
  it('título, o endereço pedido e o caminho de volta ao início', () => {
    render(
      <MemoryRouter initialEntries={['/ui']}>
        <Routes>
          <Route path="*" element={<NaoEncontrado />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Página não encontrada' })).toBeInTheDocument()
    expect(screen.getByText('/ui')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voltar ao início' })).toHaveAttribute('href', '/')
  })
})
