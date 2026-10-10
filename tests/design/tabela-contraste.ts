// Gera docs/auditoria-design/contraste.md com a razão de contraste de todos os pares (mesmo cálculo do teste).
// Uso: npx tsx tests/design/tabela-contraste.ts
import { writeFileSync } from 'node:fs'
import { MINIMO, PARES } from './pares'
import { contraste, cor } from './tokens'

const linhas = PARES.map((p) => {
  const razao = contraste(cor(p.frente), cor(p.fundo))
  const ok = razao >= MINIMO[p.tipo]
  return `| ${p.uso} | \`${p.frente.slice(4)}\` ${cor(p.frente)} / \`${p.fundo.slice(4)}\` ${cor(p.fundo)} | ${razao.toFixed(2).replace('.', ',')}:1 | ${p.tipo} ≥ ${String(MINIMO[p.tipo]).replace('.', ',')} | ${ok ? 'sim' : 'NÃO'} |`
})
const aprovados = PARES.filter((p) => contraste(cor(p.frente), cor(p.fundo)) >= MINIMO[p.tipo]).length

writeFileSync(
  'docs/auditoria-design/contraste.md',
  [
    '# Contraste dos tokens (WCAG 2.2 AA)',
    '',
    'Gerado por `npx tsx tests/design/tabela-contraste.ts` a partir de `src/styles/tokens.css`;',
    'o teste `tests/design/contraste.test.ts` falha se algum par ficar abaixo do mínimo.',
    `Pares: ${PARES.length} · aprovados: ${aprovados}.`,
    '',
    '| Uso | Par (frente / fundo) | Razão | Mínimo | Aprovado |',
    '|---|---|---|---|---|',
    ...linhas,
    '',
  ].join('\n'),
)
console.log(`${aprovados}/${PARES.length} aprovados`)
