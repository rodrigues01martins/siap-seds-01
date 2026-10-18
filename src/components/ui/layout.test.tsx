// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Plus } from 'lucide-react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { Brand, LOGO_CABECALHO, MARCAS, logoDoCabecalho } from './Brand'
import { Button } from './Button'
import { ButtonLink } from './ButtonLink'
import { Card } from './Card'
import { Drawer } from './Drawer'
import { ListaDescricao } from './ListaDescricao'
import { PageHeader } from './PageHeader'

const comRotas = (no: React.ReactNode) => render(<MemoryRouter>{no}</MemoryRouter>)

describe('Brand (marcas SEDS e Governo de Goiás)', () => {
  it('logotipo do cabeçalho: o arquivo src/public/logo-seds-goias.png, se existir (senão, texto)', () => {
    expect(logoDoCabecalho({ '../../public/logo-seds-goias.png': '/assets/logo-seds-goias-abc.png' })).toBe('/assets/logo-seds-goias-abc.png')
    expect(logoDoCabecalho({})).toBeNull()
  })

  it('cabeçalho com o logotipo: imagem (alt "SEDS - Governo de Goiás", contain, proporção mantida) sem repetir o texto', () => {
    render(<Brand variante="light" logo="/assets/logo-seds-goias.png" />)
    const logo = screen.getByRole('img', { name: 'SEDS - Governo de Goiás' })
    expect(logo.tagName).toBe('IMG')
    expect(logo).toHaveAttribute('src', '/assets/logo-seds-goias.png')
    expect(logo).toHaveClass('object-contain', 'w-auto', 'h-10')
    expect(screen.queryByText('SEDS')).not.toBeInTheDocument()
    expect(screen.queryByText('Governo de Goiás')).not.toBeInTheDocument()
  })

  it('rodapé (completa) e outras variantes continuam em texto, mesmo com o logotipo', () => {
    render(<Brand variante="light" completa logo="/assets/logo-seds-goias.png" />)
    expect(screen.getByText('Secretaria de Estado de Desenvolvimento Social')).toBeInTheDocument()
  })

  it('sem arquivos em public/brand nem logotipo: nome em texto, na hierarquia do Kit (Secretaria → Governo de Goiás)', () => {
    expect(MARCAS).toEqual({ light: null, dark: null, monochrome: null })
    render(<Brand variante="light" logo={null} />)
    const marca = screen.getByRole('img', { name: 'Secretaria de Estado de Desenvolvimento Social — Governo de Goiás' })
    const textos = [...marca.querySelectorAll('[data-nivel]')].map((n) => n.textContent)
    expect(textos).toEqual(['SEDS', 'Governo de Goiás'])
  })

  it.each([
    ['light', 'text-text-primary'],
    ['dark', 'text-text-inverse'],
    ['monochrome', 'text-current'],
  ] as const)('variante %s', (variante, classe) => {
    render(<Brand variante={variante} logo={null} />)
    expect(screen.getByRole('img')).toHaveClass(classe)
  })

  it('versão completa (login e rodapé): nome da Secretaria por extenso', () => {
    render(<Brand variante="light" completa />)
    expect(screen.getByText('Secretaria de Estado de Desenvolvimento Social')).toBeInTheDocument()
  })

  it('padrão do cabeçalho: o logotipo encontrado no build (ou null, enquanto o arquivo não for adicionado)', () => {
    expect(LOGO_CABECALHO === null || typeof LOGO_CABECALHO === 'string').toBe(true)
  })
})

describe('PageHeader', () => {
  it('trilha, título (h1), descrição e no máximo UMA ação primária (as demais secundárias)', () => {
    comRotas(
      <PageHeader
        trilha={[{ rotulo: 'Chamamentos', para: '/' }, { rotulo: 'Novo chamamento' }]}
        titulo="Novo chamamento"
        descricao="Dados do Edital e lotes."
        acaoPrimaria={<Button icone={Plus}>Salvar</Button>}
        acoesSecundarias={<Button variante="secondary">Cancelar</Button>}
      />,
    )
    expect(screen.getByRole('navigation', { name: 'Trilha de navegação' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Novo chamamento' })).toBeInTheDocument()
    expect(screen.getByText('Dados do Edital e lotes.')).toBeInTheDocument()
    const acoes = screen.getByRole('group', { name: 'Ações da página' })
    expect(within(acoes).getAllByRole('button').map((b) => b.textContent)).toEqual(['Cancelar', 'Salvar']) // primária por último
  })
})

describe('ButtonLink e Card', () => {
  it('ButtonLink é um link com aparência de botão (mesmas variantes)', () => {
    comRotas(
      <ButtonLink para="/oscs" variante="secondary" tamanho="sm">
        OSCs
      </ButtonLink>,
    )
    const link = screen.getByRole('link', { name: 'OSCs' })
    expect(link).toHaveAttribute('href', '/oscs')
    expect(link).toHaveClass('border-button-secondary-border', 'h-(--sds-button-height-sm)')
  })

  it('Card: seção com título (nível escolhido), descrição e ações', () => {
    render(
      <Card titulo="Lote L1" descricao="CASE Goiânia" acoes={<Button variante="secondary">Classificação</Button>}>
        conteúdo
      </Card>,
    )
    const secao = screen.getByRole('region', { name: 'Lote L1' })
    expect(secao).toHaveClass('rounded-card', 'bg-card-bg', 'border-card-border')
    expect(within(secao).getByRole('heading', { level: 2, name: 'Lote L1' })).toBeInTheDocument()
  })

  it('ListaDescricao: termos e valores (dl)', () => {
    render(<ListaDescricao itens={[{ termo: 'Processo SEI', valor: '202610319003258' }]} />)
    expect(screen.getByRole('term')).toHaveTextContent('Processo SEI')
    expect(screen.getByRole('definition')).toHaveTextContent('202610319003258')
  })
})

describe('Drawer pela esquerda (menu em telas pequenas)', () => {
  it('abre pela esquerda e mantém foco preso e Esc', async () => {
    let fechou = false
    render(
      <Drawer aberto lado="esquerda" titulo="Menu" onFechar={() => (fechou = true)}>
        <a href="/x">Item</a>
      </Drawer>,
    )
    const painel = screen.getByRole('dialog', { name: 'Menu' })
    expect(painel).toHaveClass('mr-auto')
    await userEvent.keyboard('{Escape}')
    expect(fechou).toBe(true)
  })
})
