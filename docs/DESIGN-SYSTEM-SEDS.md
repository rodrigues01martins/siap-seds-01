# Sistema de Design SEDS — Web Corporativo 1.0
Aplicação: sistemas administrativos, painéis, formulários e aplicações Web da SEDS/GO.
Resultado pretendido: governamental + contemporâneo + limpo + confiável + operacional.

## 1. Princípios
- Institucional: respeitar marcas, cores e tipografia da SEDS/Governo de Goiás.
- Funcional: priorizar a execução de tarefas.
- Sóbrio: evitar efeitos, gradientes e decoração.
- Consistente: mesmas ações com mesma aparência e comportamento.
- Acessível: contraste, teclado, foco visível, responsividade e semântica (meta WCAG 2.2 AA).

## 2. Origem dos elementos
- Oficial: expressamente no Kit de Divulgação (fontes Gotham e Heavitas, marcas, hierarquia de marcas).
- Derivada: obtida da identidade visual (valores HEX das cores; aguardam validação da Comunicação).
- Design System: decisão criada para o app (neutros, cores funcionais, escalas, componentes).

## 3. Cores de marca (derivadas)
brand.blue #005FAA | brand.green #1D9531 | brand.teal #007770 | brand.yellow #FFDA00 | brand.white #FFFFFF | brand.black #030505

## 4. Estratégia cromática
Azul → interação | Verde → identidade institucional | Teal → navegação e dados | Amarelo → destaque | Neutros → estrutura.
Não criar app predominantemente verde. Estrutura branca/neutra; #005FAA para interação; #007770 e #1D9531 para identidade e dados; #FFDA00 como acento.

## 5. Escalas
Primary: 900 #003D6E | 800 #004B87 | 700 #00539A | 600 #005FAA | 500 #1973B9 | 400 #468DCA | 300 #78ADDA | 200 #B1D1EB | 100 #DFEFF9 | 50 #F1F8FC
Uso: botões primários, links, seleção, foco, navegação ativa, controles interativos.
Green: 700 #146B23 | 600 #187D29 | 500 #1D9531 | 400 #49AB59 | 300 #7BC587 | 200 #B5DFBB | 100 #E5F4E7
Uso: branding, indicadores positivos, gráficos, pequenos destaques. Não é cor de todos os botões.
Teal: 700 #004D49 | 600 #00615B | 500 #007770 | 400 #278E88 | 300 #60ACA7 | 200 #A5D0CD | 100 #DCEBEA
Uso: sidebar, cabeçalhos secundários, indicadores, gráficos, navegação.
Yellow: #FFDA00 como accent (destaques, marcadores). Nunca texto branco sobre amarelo; usar texto #030505.
Neutral: 950 #171717 | 900 #242424 | 800 #363636 | 700 #4A4A4A | 600 #666666 | 500 #858585 | 400 #A3A3A3 | 300 #CCCCCC | 200 #E2E2E2 | 100 #EEEEEE | 50 #F7F7F7 | 0 #FFFFFF

## 6. Tokens semânticos (componentes só consomem estes)
background.default #F7F7F7 | background.surface #FFFFFF
text.primary #242424 | text.secondary #666666 | text.muted #707070 (ajuste) | text.inverse #FFFFFF | text.link #005FAA
border.default #E2E2E2 | border.strong #CCCCCC | border.focus #005FAA
action.primary #005FAA | action.primary-hover #004B87 | action.primary-active #003D6E
focus-ring #005FAA

## 7. Cores funcionais (semânticas da aplicação, não institucionais)
success #1D7A35 | info #005FAA | warning #B77900 (ícone/borda) | warning.text #8F5F00 (ajuste) | error #B42318

## 8. AJUSTES DE CONTRASTE (decisão de sistema — WCAG AA sobre branco)
- text.muted: #858585 (≈3,7:1, reprova) → #707070 (≈4,9:1).
- warning: #B77900 (≈3,7:1) só em ícone/borda; texto de atenção em #8F5F00 (≈5,5:1).
- Texto verde: usar Green 700 #146B23; Green 500 #1D9531 (≈3,9:1) só em gráficos e ícones.
- Sobre amarelo, texto sempre #030505.
- Aprovados: #005FAA (≈6,4:1), #007770 (≈5,4:1), #1D7A35 (≈5,4:1).
Pendente: validar valores HEX derivados com a Comunicação da SEDS.

## 9. Tipografia
font-family: "Gotham", "Helvetica Neue", Arial, sans-serif. Fallback obrigatório.
Gotham é licenciada: usar só arquivos oficiais em public/fonts/; nunca baixar de fonte externa.
Heavitas: só telas institucionais/landing; nunca em tabelas, formulários, menus, botões, filtros ou textos longos.
Escala (tamanho/peso/line-height):
display-lg 40/700/48 | display-md 36/700/44 | heading-1 32/700/40 | heading-2 24/700/32 | heading-3 20/700/28 | heading-4 18/600/24
body-lg 18/400/28 | body-md 16/400/24 | body-sm 14/400/20 | label-md 14/600/20 | caption 12/400/16
Padrão: 16px leitura; 14px componentes; 12px metadados; 20–32px títulos.

## 10. Espaçamento (grid 4px, predominância 8px)
space-0 0 | 1 4 | 2 8 | 3 12 | 4 16 | 5 20 | 6 24 | 8 32 | 10 40 | 12 48 | 16 64 | 20 80 (px)

## 11. Raio, bordas, elevação, movimento
Radius: xs 2 | sm 4 | md 8 | lg 12 | xl 16 | full 9999. Inputs 8, Buttons 8, Cards 12, Modal 12, Badge full.
Bordas: thin 1px | medium 2px. Preferir contraste entre superfícies a bordas pesadas.
Elevation: 0 nenhuma | 1 0 1px 2px rgba(0,0,0,.06) | 2 0 2px 8px rgba(0,0,0,.08) | 3 0 8px 24px rgba(0,0,0,.12).
Card 0–1 | Dropdown 2 | Tooltip 2 | Modal 3.
Motion: fast 100ms | default 150ms | moderate 250ms; easing cubic-bezier(0.2,0,0,1); só para explicar mudança, hierarquia, abertura, fechamento ou carregamento; respeitar prefers-reduced-motion.

## 12. Layout
AppShell: header institucional + sidebar + (breadcrumb, page header, conteúdo).
Header 64px: marca, nome do sistema, ações globais, notificações, perfil. Não compete com o conteúdo.
Sidebar 240–280px; recolhida 64–72px; itens com ícone, label, estado selecionado; agrupar por domínio.
Page header: breadcrumb, título, descrição opcional, [ação secundária] [ação principal].
Breakpoints: xs 0 | sm 640 | md 768 | lg 1024 | xl 1280 | 2xl 1440. Projetar para desktop ≥1280px, funcional em tablet e celular.
Container max-width 1440px (áreas densas podem usar largura total). Padding: mobile 16 | tablet 24 | desktop 32.

## 13. Componentes
Botões: primary (fundo #005FAA, texto branco) | secondary (fundo branco, borda e texto #005FAA) | tertiary (transparente, texto #005FAA) | destructive (fundo #B42318, texto branco).
Estados: default, hover, focus, active, disabled, loading. Nunca remover focus-visible.
Alturas: small 32 | medium 40 (padrão desktop) | large 48.
Formulário: label, input, helper text, mensagem de erro. Erro nunca só pela cor (ícone ⚠ + texto).
Campos: text field, text area, search, select, autocomplete, checkbox, radio, switch, date, time, upload, currency, number, CPF/CNPJ.
Estados de campo: default, hover, focus, filled, disabled, readonly, error, success.
Formulários longos: seções (Identificação, Informações, Avaliação, Observações, Confirmação) com cards, divisores, accordions ou stepper.
Card: fundo #FFFFFF, raio 12, padding 24, borda 1px #E2E2E2.
Data table: ordenação, filtro, busca, paginação, seleção, ações por linha, densidade, loading, vazio, erro. Cabeçalho 48px; linha 48–56px.
Status badge: ponto + texto, nunca só cor.
Alertas: info, success, warning, error — [ícone] título, mensagem, ação opcional.
Feedback: toast, alert, inline, progress, skeleton, spinner, empty state, error state. O
