// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Button } from '../ui/Button'
import { AppShell } from './AppShell'
import { LOGO_CABECALHO } from '../ui/Brand'
import { AuthPage } from './AuthPage'
import { DashboardPage, DetailPage, FormPage, ListPage, WizardPage } from './paginas'

const simulado = vi.hoisted(() => ({
  acesso: { perfil: 'admin', ativo: true } as { perfil: 'admin' | 'presidente' | null; ativo: boolean },
  sair: vi.fn(),
  documentos: {} as Record<string, unknown>,
}))

vi.mock('../../features/auth/useUsuario', () => ({
  useUsuario: () => ({
    carregando: false,
    usuario: { uid: 'u1', email: 'ana@goias.gov.br', nome: 'Ana Lima', acesso: simulado.acesso },
    sair: simulado.sair,
  }),
}))
vi.mock('../../lib/firestore', () => ({
  useDocumento: (caminho: string | null) => ({
    carregando: false,
    erro: null,
    dados: caminho && simulado.documentos[caminho] ? { id: caminho.split('/').at(-1), ...(simulado.documentos[caminho] as object) } : null,
  }),
  useConsulta: () => ({ carregando: false, erro: null, dados: [] }),
}))

function montarShell(caminho = '/') {
  return render(
    <MemoryRouter initialEntries={[caminho]}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<p>Página inicial</p>} />
          <Route path="chamamentos/:ch" element={<button type="button">Ação do painel</button>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
  simulado.acesso = { perfil: 'admin', ativo: true }
  simulado.documentos = { 'chamamentos/ch1': { numero: '001/2026', titulo: 'Chamamento', lotes: [{ codigo: 'L1', descricao: 'A' }] } }
})

describe('AppShell', () => {
  it('landmarks: banner (header), navegação principal, main e contentinfo (rodapé)', () => {
    montarShell()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getAllByRole('navigation', { name: 'Menu principal' }).length).toBeGreaterThan(0)
    expect(screen.getByRole('main')).toHaveAttribute('id', 'conteudo')
    expect(screen.getByRole('contentinfo')).toHaveTextContent('Secretaria de Estado de Desenvolvimento Social')
  })

  it('header: marca (variante para fundo claro), nome do sistema, perfil e sair', async () => {
    montarShell()
    const cabecalho = screen.getByRole('banner')
    // Com src/public/logo-seds-goias.png, o logotipo (imagem); sem ele, a marca em texto (variante para fundo claro).
    const marca = within(cabecalho).getByRole('img', { name: /Governo de Goiás/ })
    if (LOGO_CABECALHO) expect(marca).toHaveAttribute('alt', 'SEDS - Governo de Goiás')
    else expect(marca).toHaveClass('text-text-primary')
    expect(cabecalho).toHaveTextContent('Avaliação de Planos de Ação')
    expect(cabecalho).toHaveTextContent('Ana Lima')
    expect(cabecalho).toHaveTextContent('Administrador')
    expect(cabecalho).toHaveClass('h-16')
    // Linhas que separam as seções (cabeçalho | conteúdo | rodapé): cor de seção (#007770), mesma espessura.
    expect(cabecalho).toHaveClass('border-b', 'border-border-secao')
    expect(screen.getByRole('contentinfo')).toHaveClass('border-t', 'border-border-secao')
    await userEvent.click(within(cabecalho).getByRole('button', { name: 'Sair' }))
    expect(simulado.sair).toHaveBeenCalled()
  })

  it('o primeiro Tab é "Pular para o conteúdo", que leva o foco ao main', async () => {
    montarShell()
    await userEvent.tab()
    const pular = screen.getByRole('link', { name: 'Pular para o conteúdo' })
    expect(pular).toHaveFocus()
    expect(pular).toHaveAttribute('href', '#conteudo')
    await userEvent.keyboard('{Enter}')
    screen.getByRole('main').focus() // jsdom não navega por âncora; o navegador real é testado no e2e
    expect(screen.getByRole('main')).toHaveFocus()
  })

  it('navegação agrupada por domínio, com o item atual marcado (aria-current)', () => {
    montarShell('/chamamentos/ch1')
    const nav = screen.getAllByRole('navigation', { name: 'Menu principal' })[0]!
    expect(within(nav).getByRole('list', { name: 'Avaliação' })).toBeInTheDocument()
    expect(within(nav).getByRole('list', { name: 'Resultado' })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'Propostas do chamamento' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: 'Chamamentos' })).not.toHaveAttribute('aria-current')
  })

  it('itens conforme o perfil: o presidente vê tudo, menos Usuários', () => {
    simulado.acesso = { perfil: 'presidente', ativo: true }
    montarShell()
    const nav = screen.getAllByRole('navigation', { name: 'Menu principal' })[0]!
    expect(within(nav).getByRole('list', { name: 'Cadastros' })).toBeInTheDocument()
    expect(within(nav).queryByRole('link', { name: 'Usuários' })).toBeNull()
    expect(within(nav).queryByRole('link', { name: 'Histórico de alterações' })).toBeNull()
    expect(screen.getByRole('banner')).toHaveTextContent('Presidente')
  })

  it('sidebar recolhível (240 → 72 px): mantém os nomes acessíveis e lembra a escolha', async () => {
    montarShell()
    const botao = screen.getByRole('button', { name: 'Recolher menu' })
    expect(botao).toHaveAttribute('aria-expanded', 'true')
    expect(botao.closest('aside')).toHaveClass('w-(--sds-sidebar-width)')
    await userEvent.click(botao)
    const expandir = screen.getByRole('button', { name: 'Expandir menu' })
    expect(expandir).toHaveAttribute('aria-expanded', 'false')
    expect(expandir.closest('aside')).toHaveClass('w-(--sds-sidebar-width-collapsed)')
    const nav = screen.getAllByRole('navigation', { name: 'Menu principal' })[0]!
    expect(within(nav).getByRole('link', { name: 'Chamamentos' })).toHaveAttribute('title', 'Chamamentos')
    expect(localStorage.getItem('siap:menu-recolhido')).toBe('sim')
  })

  it('telas pequenas: botão Menu abre a gaveta com a mesma navegação; Esc fecha e devolve o foco', async () => {
    montarShell()
    const menu = screen.getByRole('button', { name: 'Menu' })
    await userEvent.click(menu)
    const gaveta = screen.getByRole('dialog', { name: 'Menu' })
    expect(within(gaveta).getByRole('navigation', { name: 'Menu principal' })).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(menu).toHaveFocus()
  })
})

describe('AuthPage', () => {
  it('marca no topo, título, conteúdo e assinatura institucional no rodapé', () => {
    render(
      <AuthPage titulo="Entrar" subtitulo="Comissão de Seleção">
        <p>formulário</p>
      </AuthPage>,
    )
    expect(screen.getByRole('banner')).toContainElement(screen.getAllByRole('img', { name: /Governo de Goiás/ })[0]!)
    expect(screen.getByRole('main')).toHaveTextContent('formulário')
    expect(screen.getByRole('heading', { level: 1, name: 'Entrar' })).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toHaveTextContent('Secretaria de Estado de Desenvolvimento Social')
    expect(screen.getByRole('banner')).toHaveClass('border-b', 'border-border-secao')
    expect(screen.getByRole('contentinfo')).toHaveClass('border-t', 'border-border-secao')
  })
})

describe('templates de página', () => {
  const cabecalho = { titulo: 'Título', acaoPrimaria: <Button>Primária</Button> }

  it('ListPage, FormPage e DetailPage começam pelo PageHeader', () => {
    const { rerender } = render(<ListPage cabecalho={cabecalho}>lista</ListPage>)
    expect(screen.getByRole('heading', { level: 1, name: 'Título' })).toBeInTheDocument()
    rerender(<FormPage cabecalho={cabecalho}>formulário</FormPage>)
    expect(screen.getByRole('group', { name: 'Ações da página' })).toBeInTheDocument()
    rerender(
      <DetailPage cabecalho={cabecalho} resumo={[{ termo: 'Processo SEI', valor: '123' }]}>
        detalhe
      </DetailPage>,
    )
    expect(screen.getByRole('term')).toHaveTextContent('Processo SEI')
  })

  it('WizardPage: etapa atual marcada (aria-current="step") e concluídas com ícone', () => {
    render(
      <WizardPage cabecalho={cabecalho} passos={['Identificação', 'Avaliação', 'Confirmação']} passoAtual={1}>
        conteúdo
      </WizardPage>,
    )
    const etapas = within(screen.getByRole('list', { name: 'Etapas' })).getAllByRole('listitem')
    expect(etapas[1]).toHaveAttribute('aria-current', 'step')
    expect(within(etapas[0]!).getByRole('img', { name: 'concluída' })).toBeInTheDocument()
  })

  it('cada template se identifica com data-template (a medição de design conta as telas sem template)', () => {
    const casos: [string, React.ReactElement][] = [
      ['ListPage', <ListPage cabecalho={cabecalho}>x</ListPage>],
      ['FormPage', <FormPage cabecalho={cabecalho}>x</FormPage>],
      ['DetailPage', <DetailPage cabecalho={cabecalho}>x</DetailPage>],
      ['WizardPage', <WizardPage cabecalho={cabecalho} passos={['A']} passoAtual={0}>x</WizardPage>],
      ['DashboardPage', <DashboardPage cabecalho={cabecalho} indicadores={[]} />],
      ['AuthPage', <AuthPage titulo="Entrar">x</AuthPage>],
    ]
    for (const [nome, elemento] of casos) {
      const { container, unmount } = render(<MemoryRouter>{elemento}</MemoryRouter>)
      expect(container.querySelectorAll('[data-template]')).toHaveLength(1)
      expect(container.querySelector('[data-template]')).toHaveAttribute('data-template', nome)
      unmount()
    }
  })

  it('DashboardPage: indicadores em lista', () => {
    render(<DashboardPage cabecalho={cabecalho} indicadores={[{ rotulo: 'Propostas', valor: 6 }]} />)
    expect(within(screen.getByRole('list', { name: 'Indicadores' })).getByText('Propostas')).toBeInTheDocument()
  })
})
