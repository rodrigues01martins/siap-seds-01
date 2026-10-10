// /chamamentos/:ch/lotes/:lote/classificacao — classificação do lote, com homologação (C5),
// reabertura (RF-18) e registro do desempate (RF-27) pelo presidente. Demais perfis só leem.
// Quadro-resumo do lote em PDF e XLSX (Etapa 6b), gerado no navegador com a mesma tabela.

import { Link, useParams } from 'react-router'
import { EstadoLeitura, Titulo } from '../../componentes/basicos'
import { podeFazer } from '../../domain/permissoes'
import { chamarApi } from '../../lib/api'
import { useColecao, useDocumento } from '../../lib/firestore'
import type { Chamamento, Osc } from '../../lib/tipos'
import { useUsuario } from '../auth/useUsuario'
import { BotoesQuadro } from '../relatorios/BotoesRelatorio'
import { TabelaClassificacao, type DecisaoRegistrada, type LinhaClassificacao } from './TabelaClassificacao'

export function TelaClassificacao() {
  const { ch = '', lote = '' } = useParams()
  const { usuario } = useUsuario()
  const perfil = usuario?.perfil ?? null
  const chamamento = useDocumento<Chamamento>(`chamamentos/${ch}`)
  const propostas = useColecao<Omit<LinhaClassificacao, 'id' | 'nomeOsc'> & { loteCodigo: string; oscCnpj: string }>(`chamamentos/${ch}/propostas`)
  const oscs = useColecao<Osc>('oscs')
  const desempates = useColecao<Omit<DecisaoRegistrada, 'id'> & { loteCodigo: string }>(`chamamentos/${ch}/desempates`)

  const carregando = chamamento.carregando || propostas.carregando || oscs.carregando || desempates.carregando
  const erro = chamamento.erro ?? propostas.erro ?? oscs.erro ?? desempates.erro
  if (carregando || erro) return <EstadoLeitura carregando={carregando} erro={erro} />
  const dadosLote = chamamento.dados?.lotes.find((l) => l.codigo === lote)
  if (!chamamento.dados || !dadosLote) return <p className="text-slate-600">Lote não encontrado.</p>

  const nomeOsc = new Map(oscs.dados.map((o) => [o.cnpj, o.razaoSocial]))
  const linhas: LinhaClassificacao[] = propostas.dados
    .filter((p) => p.loteCodigo === lote)
    .map((p) => ({ ...p, nomeOsc: nomeOsc.get(p.oscCnpj) ?? p.oscCnpj }))
  const alvo = (propostaId: string) => ({ chamamentoId: ch, propostaId })
  const decisoes = desempates.dados.filter((d) => d.loteCodigo === lote)

  return (
    <>
      <Titulo
        acoes={
          <BotoesQuadro
            cabecalho={{ chamamento: { numero: chamamento.dados.numero, titulo: chamamento.dados.titulo }, lote: dadosLote }}
            propostas={linhas}
            decisoes={decisoes}
          />
        }
      >
        Classificação — Lote {dadosLote.codigo}: {dadosLote.descricao}
      </Titulo>
      <p className="mb-4 text-sm text-slate-600">
        <Link to={`/chamamentos/${ch}`} className="underline">
          Chamamento {chamamento.dados.numero}
        </Link>{' '}
        · ranking por NF entre propostas aptas e completas (Anexo IV, 3.10). Empates de NF são resolvidos pelos
        critérios do Edital (I a VI, na ordem); se persistirem, a Comissão decide e o presidente registra.
      </p>
      <TabelaClassificacao
        lote={dadosLote}
        propostas={linhas}
        decisoes={decisoes}
        podeHomologar={podeFazer(perfil, 'homologar')}
        podeDesempatar={podeFazer(perfil, 'desempate')}
        podeReabrir={podeFazer(perfil, 'reabrir')}
        onHomologar={async (id) => {
          await chamarApi('/api/homologar', { metodo: 'POST', corpo: alvo(id) })
        }}
        onReabrir={async (id, motivo) => {
          await chamarApi('/api/reabrir', { metodo: 'POST', corpo: { ...alvo(id), motivo } })
        }}
        onDesempatar={async (ordem, justificativa) => {
          await chamarApi('/api/desempate', { metodo: 'PUT', corpo: { chamamentoId: ch, loteCodigo: lote, ordem, justificativa } })
        }}
      />
    </>
  )
}
