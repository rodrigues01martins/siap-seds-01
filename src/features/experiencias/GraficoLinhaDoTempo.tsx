// Linha do tempo das experiências A/B em SVG simples (sem biblioteca), com as sobreposições
// destacadas: no C2.2 elas contam uma vez só; no C2.3 só elas permitem somar (Anexo IV, 3.8.3).

import { dataBr } from '../../componentes/basicos'
import { paraDia } from '../../domain/intervalos'
import { linhaDoTempo, type ExperienciaNaLinha } from '../../domain/linhaDoTempo'

const LARGURA = 1000
const MARGEM = 8
const ALTURA_LINHA = 30
const TOPO = 24

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
    return <p className="text-sm text-slate-500">Nenhuma experiência nas categorias A ou B para a linha do tempo.</p>
  }
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
    <figure>
      <svg
        viewBox={`0 0 ${LARGURA} ${altura}`}
        role="img"
        aria-labelledby="titulo-linha-do-tempo"
        className="w-full rounded-md border border-slate-200 bg-white"
      >
        <title id="titulo-linha-do-tempo">
          Linha do tempo das experiências A e B, de {dataBr(linha.inicio)} a {dataBr(linha.fim)}, com {linha.sobreposicoes.length}{' '}
          sobreposição(ões)
        </title>
        {anos.map(({ ano, x }) => (
          <g key={ano}>
            <line x1={px(x)} x2={px(x)} y1={TOPO - 6} y2={altura} stroke="#e2e8f0" />
            <text x={px(x) + 3} y={14} fontSize="12" fill="#64748b">
              {ano}
            </text>
          </g>
        ))}
        {linha.sobreposicoes.map((s, i) => (
          <rect
            key={`${s.ids.join('-')}-${i}`}
            x={px(s.x0)}
            width={Math.max(px(s.x1) - px(s.x0), 2)}
            y={TOPO - 4}
            height={altura - TOPO}
            fill="#f59e0b"
            opacity={0.18}
          />
        ))}
        {linha.barras.map((b, i) => {
          const y = TOPO + i * ALTURA_LINHA
          const largura = Math.max(px(b.x1) - px(b.x0), 2)
          return (
            <g key={b.id}>
              <rect x={px(b.x0)} y={y} width={largura} height={ALTURA_LINHA - 10} rx={3} fill={b.emExecucao ? '#0284c7' : '#0369a1'} opacity={0.85} />
              <text x={px(b.x0) + 6} y={y + 14} fontSize="12" fill="#ffffff">
                {(nomes[b.id] ?? b.id).slice(0, 60)}
                {b.emExecucao ? ' (em execução)' : ''}
              </text>
            </g>
          )
        })}
      </svg>
      <figcaption className="mt-2 text-sm text-slate-600">
        {linha.sobreposicoes.length === 0 ? (
          'Sem sobreposição entre experiências A e B.'
        ) : (
          <ul className="list-inside list-disc">
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
