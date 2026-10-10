// Linha do tempo das experiências A/B em SVG simples (sem biblioteca), com as sobreposições
// destacadas: no C2.2 elas contam uma vez só; no C2.3 só elas permitem somar (Anexo IV, 3.8.3).
// Cor nunca sozinha: categoria A em teal e B em azul (tokens de dados), sempre com o rótulo "A"/"B" na barra
// e na legenda; em execução tem traço tracejado E o texto "(em execução)"; sobreposição tem hachura,
// o rótulo "Sobreposição" e a lista em texto abaixo do gráfico.

import { paraDia } from '../../domain/intervalos'
import { linhaDoTempo, type ExperienciaNaLinha } from '../../domain/linhaDoTempo'
import { dataBr } from '../../lib/datas'

const LARGURA = 1000
const MARGEM = 8
const ALTURA_LINHA = 36
const TOPO = 40

/** Categoria usada na cor da barra: A (socioeducativo) prevalece sobre B. */
const categoriaDaBarra = (categorias: string[]): 'A' | 'B' => (categorias.includes('A') ? 'A' : 'B')

const CLASSE_BARRA = { A: 'fill-data-1', B: 'fill-data-2' } as const

export function GraficoLinhaDoTempo({
  experiencias,
  dataLimite,
  nomes,
}: {
  experiencias: ExperienciaNaLinha[]
  dataLimite: string
  nomes: Record<string, string>
}) {
  const linha = linhaDoTempo(experiencias, dataLimite)
  if (!linha.inicio || !linha.fim) {
    return <p className="text-body-md text-text-secondary">Nenhuma experiência nas categorias A ou B para a linha do tempo.</p>
  }
  const categorias = new Map(experiencias.map((e) => [e.id, categoriaDaBarra(e.categorias)]))
  const util = LARGURA - 2 * MARGEM
  const px = (x: number) => MARGEM + x * util
  const altura = TOPO + linha.barras.length * ALTURA_LINHA + 8

  // Marcas de ano (1º de janeiro) dentro do intervalo.
  const d0 = paraDia(linha.inicio)
  const total = Math.max(paraDia(linha.fim) - d0, 1)
  const anos: { ano: number; x: number }[] = []
  for (let ano = Number(linha.inicio.slice(0, 4)) + 1; ano <= Number(linha.fim.slice(0, 4)); ano++) {
    anos.push({ ano, x: (paraDia(`${ano}-01-01`) - d0) / total })
  }

  return (
    <figure className="space-y-3">
      <ul aria-label="Legenda" className="flex flex-wrap gap-x-6 gap-y-2 text-body-sm text-text-primary">
        <li className="flex items-center gap-2">
          <svg aria-hidden="true" width="28" height="16">
            <rect width="28" height="16" rx="3" className="fill-data-1" />
            <text x="14" y="12" textAnchor="middle" fontSize="11" fontWeight="700" className="fill-text-inverse">
              A
            </text>
          </svg>
          Categoria A — socioeducativo (teal)
        </li>
        <li className="flex items-center gap-2">
          <svg aria-hidden="true" width="28" height="16">
            <rect width="28" height="16" rx="3" className="fill-data-2" />
            <text x="14" y="12" textAnchor="middle" fontSize="11" fontWeight="700" className="fill-text-inverse">
              B
            </text>
          </svg>
          Categoria B — acolhimento/alta complexidade (azul)
        </li>
        <li className="flex items-center gap-2">
          <svg aria-hidden="true" width="28" height="16">
            <rect width="28" height="16" rx="3" className="fill-background-surface stroke-text-primary" strokeDasharray="4 3" strokeWidth="1.5" />
          </svg>
          Em execução (tracejado)
        </li>
        <li className="flex items-center gap-2">
          <svg aria-hidden="true" width="28" height="16">
            <rect width="28" height="16" fill="url(#hachura-sobreposicao)" className="stroke-status-warning" />
          </svg>
          Sobreposição (hachurado)
        </li>
      </ul>
      <svg viewBox={`0 0 ${LARGURA} ${altura}`} role="img" aria-labelledby="titulo-linha-do-tempo" className="w-full rounded-card border border-card-border bg-card-bg">
        <title id="titulo-linha-do-tempo">
          Linha do tempo das experiências A e B, de {dataBr(linha.inicio)} a {dataBr(linha.fim)}, com {linha.sobreposicoes.length} sobreposição(ões)
        </title>
        <defs>
          <pattern id="hachura-sobreposicao" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="8" height="8" className="fill-status-warning-surface" />
            <line x1="0" y1="0" x2="0" y2="8" strokeWidth="3" className="stroke-status-warning" />
          </pattern>
        </defs>
        {anos.map(({ ano, x }) => (
          <g key={ano}>
            <line x1={px(x)} x2={px(x)} y1={TOPO - 8} y2={altura} className="stroke-border-default" />
            <text x={px(x) + 4} y={16} fontSize="14" className="fill-text-secondary">
              {ano}
            </text>
          </g>
        ))}
        {linha.sobreposicoes.map((s, i) => (
          <g key={`${s.ids.join('-')}-${i}`}>
            <rect x={px(s.x0)} width={Math.max(px(s.x1) - px(s.x0), 2)} y={TOPO - 6} height={altura - TOPO} fill="url(#hachura-sobreposicao)" opacity={0.6} />
            <text x={px(s.x0) + 4} y={TOPO - 10} fontSize="12" fontWeight="600" className="fill-status-warning-text">
              Sobreposição
            </text>
          </g>
        ))}
        {linha.barras.map((b, i) => {
          const y = TOPO + i * ALTURA_LINHA
          const largura = Math.max(px(b.x1) - px(b.x0), 2)
          const categoria = categorias.get(b.id) ?? 'B'
          const rotulo = `${categoria} · ${(nomes[b.id] ?? b.id).slice(0, 56)}${b.emExecucao ? ' (em execução)' : ''}`
          // Texto branco dentro da barra; se não couber, ao lado (depois ou antes), em texto escuro.
          const larguraTexto = rotulo.length * 7.5 + 16
          const posicao =
            largura >= larguraTexto
              ? { x: px(b.x0) + 8, ancora: 'start' as const, dentro: true }
              : px(b.x1) + larguraTexto <= LARGURA
                ? { x: px(b.x1) + 6, ancora: 'start' as const, dentro: false }
                : { x: px(b.x0) - 6, ancora: 'end' as const, dentro: false }
          return (
            <g key={b.id}>
              <rect
                x={px(b.x0)}
                y={y}
                width={largura}
                height={ALTURA_LINHA - 10}
                rx={4}
                className={`${CLASSE_BARRA[categoria]} stroke-text-primary`}
                strokeWidth={b.emExecucao ? 2 : 0}
                strokeDasharray={b.emExecucao ? '8 5' : undefined}
              />
              <text x={posicao.x} y={y + 18} textAnchor={posicao.ancora} fontSize="14" fontWeight="600" className={posicao.dentro ? 'fill-text-inverse' : 'fill-text-primary'}>
                {rotulo}
              </text>
            </g>
          )
        })}
      </svg>
      <figcaption className="text-body-sm text-text-secondary">
        {linha.sobreposicoes.length === 0 ? (
          'Sem sobreposição entre experiências A e B.'
        ) : (
          <ul className="list-inside list-disc space-y-1">
            {linha.sobreposicoes.map((s, i) => (
              <li key={i}>
                Sobreposição de {dataBr(s.inicio)} a {dataBr(s.fim)}: {s.ids.map((id) => nomes[id] ?? id).join(' e ')}
              </li>
            ))}
          </ul>
        )}
      </figcaption>
    </figure>
  )
}
