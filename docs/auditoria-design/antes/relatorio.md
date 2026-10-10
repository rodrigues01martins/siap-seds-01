# Auditoria de design e acessibilidade — antes

Gerado por `tests/e2e/baseline.spec.ts` (Playwright + axe-core, WCAG 2.2 AA: wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa).
App local com os emuladores e os dados de ensaio (`scripts/lib/ensaio.ts`).

## Resumo

- Telas medidas: 42 (perfis: anônimo, administrador, avaliador, consulta).
- Screenshots: 84 em `telas/` (1280 e 768 px, página inteira).
- Violações axe (regra × tela): 0.
- Regras aprovadas por tela: de 13 a 27 (prova de que o axe analisou cada tela).
- O axe detecta só parte dos critérios WCAG (contraste, nomes, estrutura). Teclado, foco visível, ordem de leitura e
  reflow em 320 px pedem revisão manual nas próximas etapas.

### Violações por regra

| Regra | Impacto | Telas | Elementos | O que é |
|---|---|---|---|---|

### Itens que o axe pede para revisar à mão (incomplete)

| Regra | Telas | Elementos | O que é |
|---|---|---|---|
| `color-contrast` | 6 | 111 | Elements must meet minimum color contrast ratio thresholds |

## Violações por rota

### anonimo · login (`/login`)

Nenhuma violação.

### administrador · inicio (`/`)

Nenhuma violação.

### administrador · painel-chamamento (`/chamamentos/ensaio-2026`)

Nenhuma violação.

### administrador · chamamento-novo (`/chamamentos/novo`)

Nenhuma violação.

### administrador · chamamento-editar (`/chamamentos/ensaio-2026/editar`)

Nenhuma violação.

### administrador · proposta-nova (`/chamamentos/ensaio-2026/propostas/nova`)

Nenhuma violação.

### administrador · proposta-editar (`/chamamentos/ensaio-2026/propostas/ensaio-l1-beta/editar`)

Nenhuma violação.

### administrador · sessao-nova (`/chamamentos/ensaio-2026/sessoes/nova`)

Nenhuma violação.

### administrador · sessao (`/chamamentos/ensaio-2026/sessoes/e2e-sessao-aberta`)

Nenhuma violação.

### administrador · ata (`/chamamentos/ensaio-2026/sessoes/e2e-sessao-aberta/ata`)

Nenhuma violação.

### administrador · admissibilidade (`/chamamentos/ensaio-2026/propostas/ensaio-l1-beta/admissibilidade`)

Nenhuma violação.

### administrador · d1 (`/chamamentos/ensaio-2026/propostas/ensaio-l1-beta/d1`)

Nenhuma violação.

### administrador · d2 (`/chamamentos/ensaio-2026/propostas/ensaio-l1-beta/d2`)

Nenhuma violação.

### administrador · d2-memoria (`/chamamentos/ensaio-2026/propostas/ensaio-l1-beta/d2/memoria`)

Nenhuma violação.

### administrador · diligencias (`/chamamentos/ensaio-2026/propostas/ensaio-l1-beta/diligencias`)

Nenhuma violação.

### administrador · classificacao (`/chamamentos/ensaio-2026/lotes/L1/classificacao`)

Nenhuma violação.

### administrador · oscs (`/oscs`)

Nenhuma violação.

### administrador · usuarios (`/usuarios`)

Nenhuma violação.

### administrador · auditoria (`/auditoria`)

Nenhuma violação.

### administrador · projecao (`/projecao/ensaio-2026/e2e-sessao-aberta`)

Nenhuma violação.

### avaliador · inicio (`/`)

Nenhuma violação.

### avaliador · painel-chamamento (`/chamamentos/ensaio-2026`)

Nenhuma violação.

### avaliador · sessao (`/chamamentos/ensaio-2026/sessoes/e2e-sessao-aberta`)

Nenhuma violação.

### avaliador · ata (`/chamamentos/ensaio-2026/sessoes/e2e-sessao-aberta/ata`)

Nenhuma violação.

### avaliador · admissibilidade (`/chamamentos/ensaio-2026/propostas/ensaio-l1-beta/admissibilidade`)

Nenhuma violação.

### avaliador · d1 (`/chamamentos/ensaio-2026/propostas/ensaio-l1-beta/d1`)

Nenhuma violação.

### avaliador · d2 (`/chamamentos/ensaio-2026/propostas/ensaio-l1-beta/d2`)

Nenhuma violação.

### avaliador · d2-memoria (`/chamamentos/ensaio-2026/propostas/ensaio-l1-beta/d2/memoria`)

Nenhuma violação.

### avaliador · diligencias (`/chamamentos/ensaio-2026/propostas/ensaio-l1-beta/diligencias`)

Nenhuma violação.

### avaliador · classificacao (`/chamamentos/ensaio-2026/lotes/L1/classificacao`)

Nenhuma violação.

### avaliador · projecao (`/projecao/ensaio-2026/e2e-sessao-aberta`)

Nenhuma violação.

### consulta · inicio (`/`)

Nenhuma violação.

### consulta · painel-chamamento (`/chamamentos/ensaio-2026`)

Nenhuma violação.

### consulta · sessao (`/chamamentos/ensaio-2026/sessoes/e2e-sessao-aberta`)

Nenhuma violação.

### consulta · ata (`/chamamentos/ensaio-2026/sessoes/e2e-sessao-aberta/ata`)

Nenhuma violação.

### consulta · admissibilidade (`/chamamentos/ensaio-2026/propostas/ensaio-l1-beta/admissibilidade`)

Nenhuma violação.

### consulta · d1 (`/chamamentos/ensaio-2026/propostas/ensaio-l1-beta/d1`)

Nenhuma violação.

### consulta · d2 (`/chamamentos/ensaio-2026/propostas/ensaio-l1-beta/d2`)

Nenhuma violação.

### consulta · d2-memoria (`/chamamentos/ensaio-2026/propostas/ensaio-l1-beta/d2/memoria`)

Nenhuma violação.

### consulta · diligencias (`/chamamentos/ensaio-2026/propostas/ensaio-l1-beta/diligencias`)

Nenhuma violação.

### consulta · classificacao (`/chamamentos/ensaio-2026/lotes/L1/classificacao`)

Nenhuma violação.

### consulta · projecao (`/projecao/ensaio-2026/e2e-sessao-aberta`)

Nenhuma violação.

## Cores HEX soltas no código (src/, index.html; sem testes)

Total: 13.

| Arquivo:linha | Valor | Trecho |
|---|---|---|
| src/features/experiencias/GraficoLinhaDoTempo.tsx:52 | `#e2e8f0` | `<line x1={px(x)} x2={px(x)} y1={TOPO - 6} y2={altura} stroke="#e2e8f0" />` |
| src/features/experiencias/GraficoLinhaDoTempo.tsx:53 | `#64748b` | `<text x={px(x) + 3} y={14} fontSize="12" fill="#64748b">` |
| src/features/experiencias/GraficoLinhaDoTempo.tsx:65 | `#f59e0b` | `fill="#f59e0b"` |
| src/features/experiencias/GraficoLinhaDoTempo.tsx:74 | `#0284c7` | `<rect x={px(b.x0)} y={y} width={largura} height={ALTURA_LINHA - 10} rx={3} fill={b.emExecucao ? '#0284c7' : '#0369a1'} opacity={0.85} />` |
| src/features/experiencias/GraficoLinhaDoTempo.tsx:74 | `#0369a1` | `<rect x={px(b.x0)} y={y} width={largura} height={ALTURA_LINHA - 10} rx={3} fill={b.emExecucao ? '#0284c7' : '#0369a1'} opacity={0.85} />` |
| src/features/experiencias/GraficoLinhaDoTempo.tsx:75 | `#ffffff` | `<text x={px(b.x0) + 6} y={y + 14} fontSize="12" fill="#ffffff">` |
| src/relatorios/documento.ts:48 | `#475569` | `subtitulo: { fontSize: 10, color: '#475569', margin: [0, 0, 0, 10] },` |
| src/relatorios/documento.ts:50 | `#e2e8f0` | `cabecalhoTabela: { bold: true, fillColor: '#e2e8f0' },` |
| src/relatorios/documento.ts:51 | `#334155` | `pequeno: { fontSize: 8, color: '#334155' },` |
| src/relatorios/quadroResumo.ts:188 | `#92400e` | `...(quadro.aviso ? [{ text: quadro.aviso, bold: true, color: '#92400e', margin: [0, 0, 0, 6] as [number, number, number, number] }] : []),` |
| src/relatorios/xlsx.ts:20 | `argb: 'FFE2E8F0'` | `celula.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }` |
| src/relatorios/xlsx.ts:42 | `argb: 'FFB91C1C'` | `marca.font = { bold: true, size: 14, color: { argb: 'FFB91C1C' } }` |
| src/relatorios/xlsx.ts:46 | `argb: 'FF92400E'` | `if (quadro.aviso) planilha.addRow([quadro.aviso]).font = { bold: true, color: { argb: 'FF92400E' } }` |

## Classes de cor da paleta padrão do Tailwind (não semânticas)

Total: 490 usos em 40 arquivos. Serão trocadas por tokens semânticos.

| Arquivo | Usos | Classes |
|---|---|---|
| src/componentes/AlertaErro.tsx | 3 | bg-red-50, border-red-200, text-red-900 |
| src/componentes/basicos.tsx | 34 | bg-amber-100, bg-emerald-100, bg-red-100, bg-red-50, bg-sky-100, bg-sky-700, bg-sky-800, bg-slate-100, bg-slate-50, bg-white, border-red-200, border-red-300, border-sky-700, border-slate-300, text-amber-800, text-emerald-800, text-red-700, text-red-800, text-red-900, text-sky-800, text-slate-600, text-slate-700, text-slate-800, text-slate-900, text-white |
| src/componentes/Formulario.tsx | 12 | bg-sky-700, bg-sky-800, bg-slate-100, border-red-500, border-slate-300, text-red-700, text-slate-500, text-slate-700, text-white |
| src/componentes/Shell.tsx | 14 | bg-slate-50, bg-slate-700, bg-slate-800, bg-slate-900, bg-white, border-slate-200, border-slate-300, text-slate-100, text-slate-300, text-slate-400, text-slate-600, text-slate-900, text-white |
| src/componentes/Tabela.tsx | 6 | bg-slate-100, bg-white, border-slate-100, border-slate-200, text-slate-500, text-slate-700 |
| src/features/admissibilidade/FormAdmissibilidade.tsx | 31 | bg-red-50, bg-slate-100, bg-slate-50, bg-white, border-red-500, border-slate-100, border-slate-200, border-slate-300, text-emerald-800, text-red-700, text-red-800, text-red-900, text-slate-500, text-slate-700, text-slate-800 |
| src/features/admissibilidade/TelaAdmissibilidade.tsx | 7 | bg-white, border-slate-200, text-red-800, text-slate-500, text-slate-600 |
| src/features/auditoria/TabelaAuditoria.tsx | 22 | bg-sky-700, bg-sky-800, bg-slate-100, bg-slate-50, bg-white, border-slate-100, border-slate-200, border-slate-300, text-emerald-800, text-red-800, text-slate-500, text-slate-600, text-slate-700, text-white |
| src/features/auditoria/TelaAuditoria.tsx | 5 | bg-slate-50, bg-white, border-slate-300, text-slate-600, text-slate-700 |
| src/features/auth/AcessoNaoAutorizado.tsx | 11 | bg-amber-50, bg-slate-900, bg-white, border-slate-200, border-slate-300, text-amber-900, text-slate-600, text-slate-900, text-white |
| src/features/auth/Login.tsx | 13 | bg-slate-900, bg-white, border-slate-200, border-slate-300, text-emerald-800, text-red-700, text-slate-600, text-slate-700, text-slate-900, text-white |
| src/features/auth/RotaProtegida.tsx | 1 | text-slate-600 |
| src/features/avaliacao/CabecalhoProposta.tsx | 14 | bg-slate-100, bg-white/95, border-sky-700, border-slate-200, border-slate-300, text-amber-800, text-emerald-800, text-sky-800, text-slate-500, text-slate-600, text-slate-700, text-slate-900 |
| src/features/avaliacao/ControleProjecao.tsx | 10 | bg-slate-50, bg-white, border-slate-200, border-slate-300, text-emerald-700, text-sky-800, text-slate-500, text-slate-800 |
| src/features/avaliacao/PainelSubcriterio.tsx | 26 | bg-amber-50, bg-red-50, bg-slate-100, bg-slate-50, bg-white, border-red-500, border-slate-200, text-amber-700, text-amber-900, text-red-700, text-red-900, text-slate-500, text-slate-600, text-slate-700, text-slate-800, text-slate-900 |
| src/features/avaliacao/TelaD1.tsx | 13 | bg-sky-100, bg-slate-100, bg-white, border-slate-200, text-emerald-700, text-sky-900, text-slate-400, text-slate-500, text-slate-600, text-slate-800 |
| src/features/chamamentos/FormChamamento.tsx | 6 | bg-white, border-slate-200, text-red-700, text-slate-600, text-slate-700 |
| src/features/chamamentos/FormProposta.tsx | 5 | bg-white, border-slate-200, text-amber-800, text-slate-600 |
| src/features/chamamentos/ListaChamamentos.tsx | 1 | text-sky-800 |
| src/features/chamamentos/PainelChamamento.tsx | 14 | bg-white, border-slate-200, text-sky-800, text-slate-500, text-slate-600 |
| src/features/diligencias/ListaDiligencias.tsx | 15 | bg-amber-100, bg-amber-50, bg-sky-100, bg-slate-200, bg-white, border-amber-500, border-slate-200, text-amber-900, text-sky-900, text-slate-500, text-slate-600, text-slate-700 |
| src/features/diligencias/TelaDiligencias.tsx | 3 | bg-slate-100, text-slate-600, text-slate-700 |
| src/features/experiencias/FormExperiencia.tsx | 8 | bg-slate-50, border-slate-200, text-red-700, text-slate-500, text-slate-600, text-slate-700 |
| src/features/experiencias/GraficoLinhaDoTempo.tsx | 4 | bg-white, border-slate-200, text-slate-500, text-slate-600 |
| src/features/experiencias/TabelaExperiencias.tsx | 21 | bg-amber-50, bg-amber-700, bg-slate-100, bg-slate-50, bg-white, border-amber-300, border-slate-100, border-slate-200, border-slate-300, text-amber-800, text-red-700, text-sky-800, text-slate-500, text-slate-600, text-slate-700, text-white |
| src/features/experiencias/TelaD2.tsx | 7 | bg-slate-100, bg-white, border-slate-200, text-amber-800, text-sky-800, text-slate-600, text-slate-700 |
| src/features/experiencias/TelaMemoriaD2.tsx | 11 | bg-white, border-slate-200, text-slate-600, text-slate-700, text-slate-800 |
| src/features/oscs/TelaOscs.tsx | 3 | bg-white, border-slate-200, text-emerald-800 |
| src/features/projecao/ConteudoProjecao.tsx | 29 | bg-black, bg-red-900/60, bg-yellow-300, border-slate-600, border-slate-700, border-yellow-300, text-amber-300, text-black, text-emerald-300, text-red-300, text-red-400, text-slate-300, text-slate-400, text-white, text-yellow-300 |
| src/features/projecao/TelaProjecao.tsx | 10 | bg-black, bg-slate-800, border-slate-500, border-slate-700, text-red-300, text-slate-200, text-slate-300, text-slate-400, text-white |
| src/features/relatorios/BotoesRelatorio.tsx | 4 | bg-slate-50, bg-white, border-slate-300, text-slate-700 |
| src/features/relatorios/EditorAta.tsx | 12 | bg-amber-50, bg-sky-700, bg-sky-800, bg-slate-50, bg-white, border-amber-500, border-slate-300, text-amber-900, text-red-700, text-slate-500, text-white |
| src/features/relatorios/TelaAta.tsx | 2 | text-slate-600 |
| src/features/resultado/TabelaClassificacao.tsx | 41 | bg-amber-100, bg-amber-50, bg-amber-700, bg-sky-100, bg-sky-50, bg-sky-700, bg-slate-100, bg-slate-50, bg-violet-100, bg-white, border-amber-500, border-sky-600, border-slate-100, border-slate-200, border-slate-300, text-amber-800, text-amber-900, text-red-700, text-sky-800, text-sky-900, text-slate-500, text-slate-600, text-slate-700, text-violet-900, text-white |
| src/features/resultado/TelaClassificacao.tsx | 2 | text-slate-600 |
| src/features/sessoes/ConduzirSessao.tsx | 10 | bg-white, border-slate-200, text-amber-800, text-red-800, text-sky-800, text-slate-600, text-slate-700 |
| src/features/sessoes/FormAberturaSessao.tsx | 13 | bg-amber-50, border-red-500, border-slate-200, border-slate-300, text-amber-900, text-red-700, text-slate-500, text-slate-700 |
| src/features/sessoes/NovaSessao.tsx | 2 | bg-white, border-slate-200 |
| src/features/usuarios/TelaUsuarios.tsx | 42 | bg-emerald-100, bg-emerald-50, bg-emerald-600, bg-red-100, bg-slate-100, bg-slate-300, bg-slate-900, bg-slate-900/40, bg-white, border-slate-100, border-slate-200, border-slate-300, text-emerald-800, text-emerald-900, text-red-700, text-red-800, text-slate-500, text-slate-600, text-slate-700, text-white |
| src/main.tsx | 3 | bg-red-50, border-red-200, text-red-900 |

## Fontes

- `font-family` calculada do `<body>` no navegador: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"`.
- Fontes web carregadas (`document.fonts`): nenhuma (só fontes do sistema).
- Declarações no código:

  - src/features/auditoria/TabelaAuditoria.tsx:84 — `<td className="px-2 py-1 font-mono break-all text-red-800">{l.antes}</td>`
  - src/features/auditoria/TabelaAuditoria.tsx:85 — `<td className="px-2 py-1 font-mono break-all text-emerald-800">{l.depois}</td>`
  - src/features/auditoria/TabelaAuditoria.tsx:121 — `<span className="block font-mono text-xs text-slate-500">{r.caminho}</span>`
  - src/features/relatorios/EditorAta.tsx:32 — `className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm"`
