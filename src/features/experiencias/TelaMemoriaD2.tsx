// /chamamentos/:ch/propostas/:p/d2/memoria (DetailPage) — memória de cálculo da D2 gravada pela /api
// (resultadoD2/atual): resumo com a D2 e os pontos de cada critério; abas por critério com faixa,
// experiências usadas e o cálculo passo a passo.

import { useParams } from 'react-router'
import { DetailPage } from '../../components/templates/paginas'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { ListaDescricao } from '../../components/ui/ListaDescricao'
import { Skeleton } from '../../components/ui/Skeleton'
import { Tabs } from '../../components/ui/Tabs'
import { CRITERIOS_D2, type ResultadoCriterio, type ResultadoD2 } from '../../domain/d2'
import { formatarNumero } from '../../domain/formatacao'
import { useColecao, useDocumento } from '../../lib/firestore'
import { legivel } from '../../relatorios/memoriaD2'
import { cabecalhoDaProposta, ContextoProposta, useDadosProposta } from '../avaliacao/CabecalhoProposta'

const pontos = (r: ResultadoCriterio) => `${formatarNumero(r.pontos)} / ${formatarNumero(r.maximo)}`

function Criterio({ resultado, nomes, nivel = 2 }: { resultado: ResultadoCriterio; nomes: Record<string, string>; nivel?: 2 | 3 }) {
  const Subtitulo = nivel === 2 ? 'h3' : 'h4'
  return (
    <Card titulo={`${resultado.codigo} — ${resultado.titulo}`} nivel={nivel}>
      <ListaDescricao
        className="xl:grid-cols-3"
        itens={[
          { termo: 'Pontos', valor: <strong className="tabular-nums">{pontos(resultado)}</strong> },
          { termo: 'Faixa', valor: resultado.faixa ? `“${resultado.faixa}”` : '—' },
          {
            termo: 'Experiências usadas',
            valor: (resultado.usadas ?? []).length === 0 ? 'nenhuma' : resultado.usadas.map((id) => nomes[id] ?? id).join('; '),
          },
        ]}
      />
      <Subtitulo className="mt-6 text-label-md text-text-secondary">Cálculo passo a passo</Subtitulo>
      <ol className="mt-2 list-inside list-decimal space-y-1 text-body-md text-text-primary">
        {resultado.memoria.map((linha, i) => (
          <li key={i}>{legivel(linha, nomes)}</li>
        ))}
      </ol>
    </Card>
  )
}

export function TelaMemoriaD2() {
  const { ch = '', p = '' } = useParams()
  const leitura = useDadosProposta(ch, p)
  const resultado = useDocumento<ResultadoD2>(`chamamentos/${ch}/propostas/${p}/resultadoD2/atual`)
  const experiencias = useColecao<{ descricao?: string }>(`chamamentos/${ch}/propostas/${p}/experiencias`)

  const carregando = leitura.carregando || resultado.carregando || experiencias.carregando
  const erro = leitura.erro ?? resultado.erro ?? experiencias.erro
  if (carregando) return <Skeleton linhas={8} rotulo="Carregando memória da D2" />
  if (erro) return <ErrorState mensagem={erro} />
  if (!leitura.dados) return <EmptyState titulo="Proposta não encontrada" descricao="Confira o endereço ou volte ao painel do chamamento." />

  const nomes = Object.fromEntries(experiencias.dados.map((e) => [e.id, e.descricao ?? e.id]))
  const r = resultado.dados
  const cabecalho = cabecalhoDaProposta(leitura.dados, ch, 'memoria')

  if (!r) {
    return (
      <DetailPage cabecalho={cabecalho}>
        <ContextoProposta dados={leitura.dados} ch={ch} aba="memoria" />
        <EmptyState titulo="A D2 ainda não foi calculada" descricao="Cadastre ou avalie uma experiência: a /api calcula e grava a memória a cada alteração." />
      </DetailPage>
    )
  }

  const c23 = r.criterios['C2.3']
  return (
    <DetailPage
      cabecalho={{ ...cabecalho, descricao: 'D2 = C2.1 + C2.2 + C2.3 + C2.4 (Anexo IV, 3.9). Gravada pela /api a cada alteração.' }}
      resumo={[
        { termo: 'D2', valor: <strong className="text-heading-3 tabular-nums">{`${formatarNumero(r.total)} / ${formatarNumero(r.maximo)}`}</strong> },
        ...CRITERIOS_D2.map((c) => ({ termo: c, valor: <span className="tabular-nums">{pontos(r.criterios[c])}</span> })),
      ]}
    >
      <ContextoProposta dados={leitura.dados} ch={ch} aba="memoria" />
      <Tabs
        rotulo="Critérios da D2"
        abas={[
          { id: 'C2.1', rotulo: `C2.1 · ${pontos(r.criterios['C2.1'])}`, conteudo: <Criterio resultado={r.criterios['C2.1']} nomes={nomes} /> },
          { id: 'C2.2', rotulo: `C2.2 · ${pontos(r.criterios['C2.2'])}`, conteudo: <Criterio resultado={r.criterios['C2.2']} nomes={nomes} /> },
          {
            id: 'C2.3',
            rotulo: `C2.3 · ${pontos(c23)}`,
            conteudo: (
              <div className="space-y-4">
                <Criterio resultado={c23} nomes={nomes} />
                <Criterio resultado={c23.subcriterios['2.3.1'].A} nomes={nomes} nivel={3} />
                <Criterio resultado={c23.subcriterios['2.3.1'].B} nomes={nomes} nivel={3} />
                <Criterio resultado={c23.subcriterios['2.3.1']} nomes={nomes} nivel={3} />
                <Criterio resultado={c23.subcriterios['2.3.2']} nomes={nomes} nivel={3} />
                <Criterio resultado={c23.subcriterios['2.3.3']} nomes={nomes} nivel={3} />
              </div>
            ),
          },
          { id: 'C2.4', rotulo: `C2.4 · ${pontos(r.criterios['C2.4'])}`, conteudo: <Criterio resultado={r.criterios['C2.4']} nomes={nomes} /> },
        ]}
      />
    </DetailPage>
  )
}
