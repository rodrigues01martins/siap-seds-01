// /chamamentos/:ch — painel: dados do chamamento, propostas por lote com status e sessões.

import { Link, useParams } from 'react-router'
import { EstadoLeitura, LinkBotao, Secao, SeloStatus, Titulo, dataBr } from '../../componentes/basicos'
import { Tabela } from '../../componentes/Tabela'
import { formatarCnpj } from '../../domain/cnpj'
import { podeFazer } from '../../domain/permissoes'
import { statusDaProposta } from '../../domain/statusProposta'
import { useColecao, useDocumento, type ComId } from '../../lib/firestore'
import type { Chamamento, Osc, Proposta, Sessao } from '../../lib/tipos'
import { useUsuario } from '../auth/useUsuario'

const numero = (valor: number | undefined) =>
  valor === undefined ? '—' : valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 })

export function PainelChamamento() {
  const { ch } = useParams()
  const { usuario } = useUsuario()
  const perfil = usuario?.perfil ?? null
  const chamamento = useDocumento<Chamamento>(`chamamentos/${ch}`)
  const propostas = useColecao<Proposta>(`chamamentos/${ch}/propostas`)
  const oscs = useColecao<Osc>('oscs')
  const sessoes = useColecao<Sessao>(`chamamentos/${ch}/sessoes`)

  const carregando = chamamento.carregando || propostas.carregando || oscs.carregando || sessoes.carregando
  const erro = chamamento.erro ?? propostas.erro ?? oscs.erro ?? sessoes.erro
  if (carregando || erro) return <EstadoLeitura carregando={carregando} erro={erro} />
  if (!chamamento.dados) return <p className="text-slate-600">Chamamento não encontrado.</p>

  const c = chamamento.dados
  const nomeOsc = new Map(oscs.dados.map((o) => [o.cnpj, o.razaoSocial]))
  const admin = podeFazer(perfil, 'cadastros')
  const sessaoAberta = sessoes.dados.find((s) => s.status === 'aberta')

  return (
    <>
      <Titulo
        acoes={
          admin && (
            <>
              <LinkBotao para={`/chamamentos/${ch}/editar`}>Editar chamamento</LinkBotao>
              <LinkBotao para={`/chamamentos/${ch}/propostas/nova`} primario>
                Nova proposta
              </LinkBotao>
            </>
          )
        }
      >
        Chamamento {c.numero} — {c.titulo}
      </Titulo>

      <dl className="grid gap-x-6 gap-y-1 rounded-lg border border-slate-200 bg-white p-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-slate-500">Processo SEI</dt>
          <dd>{c.processoSei ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Data limite das propostas</dt>
          <dd>{dataBr(c.dataLimitePropostas)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Correção monetária</dt>
          <dd>{c.indiceCorrecao ? `${c.indiceCorrecao} (base ${dataBr(c.dataBaseCorrecao)})` : '—'}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Propostas</dt>
          <dd>{propostas.dados.length}</dd>
        </div>
      </dl>

      {c.lotes.map((lote) => (
        <Secao key={lote.codigo} titulo={`Lote ${lote.codigo} — ${lote.descricao}`}>
          <Tabela<ComId<Proposta>>
            rotulo={`Propostas do lote ${lote.codigo}`}
            linhas={propostas.dados.filter((p) => p.loteCodigo === lote.codigo)}
            chave={(p) => p.id}
            vazio="Nenhuma proposta neste lote."
            colunas={[
              {
                titulo: 'OSC',
                celula: (p) => (
                  <>
                    <span className="font-medium">{nomeOsc.get(p.oscCnpj) ?? 'OSC não encontrada'}</span>
                    <span className="block text-xs text-slate-500">{formatarCnpj(p.oscCnpj)}</span>
                  </>
                ),
              },
              { titulo: 'Protocolo', celula: (p) => p.protocolo ?? '—' },
              { titulo: 'Nº SEI', celula: (p) => p.numeroSEI ?? '—' },
              { titulo: 'NF', celula: (p) => numero(p.totais?.nf), classe: 'text-right' },
              { titulo: 'Status', celula: (p) => <SeloStatus status={statusDaProposta(p)} /> },
              {
                titulo: 'Ações',
                celula: (p) => (
                  <span className="flex flex-wrap gap-3">
                    <Link to={`/chamamentos/${ch}/propostas/${p.id}/admissibilidade`} className="text-sky-800 underline">
                      Admissibilidade
                    </Link>
                    <Link to={`/chamamentos/${ch}/propostas/${p.id}/d1`} className="text-sky-800 underline">
                      D1
                    </Link>
                    <Link to={`/chamamentos/${ch}/propostas/${p.id}/d2`} className="text-sky-800 underline">
                      D2
                    </Link>
                    {admin && !p.bloqueada && (
                      <Link to={`/chamamentos/${ch}/propostas/${p.id}/editar`} className="text-sky-800 underline">
                        Editar
                      </Link>
                    )}
                  </span>
                ),
              },
            ]}
          />
        </Secao>
      ))}

      <Secao
        titulo="Sessões da Comissão"
        acoes={
          podeFazer(perfil, 'sessaoAbrirEncerrar') &&
          !sessaoAberta && (
            <LinkBotao para={`/chamamentos/${ch}/sessoes/nova`} primario>
              Abrir sessão
            </LinkBotao>
          )
        }
      >
        <Tabela<ComId<Sessao>>
          rotulo="Sessões"
          linhas={[...sessoes.dados].sort((a, b) => b.data.localeCompare(a.data))}
          chave={(s) => s.id}
          vazio="Nenhuma sessão registrada."
          colunas={[
            {
              titulo: 'Data',
              celula: (s) => (
                <Link to={`/chamamentos/${ch}/sessoes/${s.id}`} className="font-medium text-sky-800 underline">
                  {dataBr(s.data)}
                </Link>
              ),
            },
            { titulo: 'Situação', celula: (s) => (s.status === 'aberta' ? 'Aberta' : 'Encerrada') },
            { titulo: 'Presentes', celula: (s) => s.presentes.length },
            { titulo: 'Propostas na pauta', celula: (s) => s.pauta.length },
          ]}
        />
      </Secao>
    </>
  )
}
