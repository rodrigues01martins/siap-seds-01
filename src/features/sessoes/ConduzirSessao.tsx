// /chamamentos/:ch/sessoes/:s — sessão: presentes e declarações, foco { propostaId, subcriterio }
// (presidente e relator) e encerrar (presidente). Os demais perfis só leem.

import { useState } from 'react'
import { useParams } from 'react-router'
import { AlertaErro } from '../../componentes/AlertaErro'
import { Botao, EstadoLeitura, LinkBotao, Secao, Titulo, dataBr } from '../../componentes/basicos'
import { CampoSelecao, Formulario } from '../../componentes/Formulario'
import { Tabela } from '../../componentes/Tabela'
import { MATRIZ_2026 } from '../../domain/matriz'
import { podeFazer } from '../../domain/permissoes'
import type { z } from '../../esquemas/base'
import { esquemaAbrirSessao, esquemaFoco } from '../../esquemas/sessao'
import { chamarApi } from '../../lib/api'
import { useColecao, useDocumento } from '../../lib/firestore'
import type { Osc, Proposta, Sessao } from '../../lib/tipos'
import { useUsuario } from '../auth/useUsuario'
import { campoDosMembros, corpoDosMembros, LinhasMembros } from './FormAberturaSessao'
import { useComissao } from './useComissao'

const SUBCRITERIOS = MATRIZ_2026.dimensao1.planos.flatMap((pa) =>
  pa.subcriterios.map((s) => ({ valor: s.codigo, rotulo: `${pa.codigo} · ${s.codigo} — ${s.titulo}` })),
)

export function ConduzirSessao() {
  const { ch, s } = useParams()
  const { usuario } = useUsuario()
  const perfil = usuario?.perfil ?? null
  const sessao = useDocumento<Sessao>(`chamamentos/${ch}/sessoes/${s}`)
  const propostas = useColecao<Proposta>(`chamamentos/${ch}/propostas`)
  const oscs = useColecao<Osc>('oscs')
  const [erro, setErro] = useState<unknown>(null)

  const carregando = sessao.carregando || propostas.carregando || oscs.carregando
  const erroLeitura = sessao.erro ?? propostas.erro ?? oscs.erro
  if (carregando || erroLeitura) return <EstadoLeitura carregando={carregando} erro={erroLeitura} />
  if (!sessao.dados) return <p className="text-slate-600">Sessão não encontrada.</p>

  const dados = sessao.dados
  const aberta = dados.status === 'aberta'
  const conduz = aberta && podeFazer(perfil, 'sessaoConduzir')
  const nomeOsc = new Map(oscs.dados.map((o) => [o.cnpj, o.razaoSocial]))
  const rotuloProposta = (id: string) => {
    const p = propostas.dados.find((x) => x.id === id)
    return p ? `${nomeOsc.get(p.oscCnpj) ?? p.oscCnpj} — Lote ${p.loteCodigo}` : id
  }
  const alterar = (corpo: Record<string, unknown>) =>
    chamarApi('/api/sessao', { metodo: 'PATCH', corpo: { chamamentoId: ch, sessaoId: s, ...corpo } })

  async function executar(acao: () => Promise<unknown>) {
    setErro(null)
    try {
      await acao()
    } catch (e) {
      setErro(e)
    }
  }

  const declaracao = (uid: string) => dados.declaracoes.find((d) => d.uid === uid)

  return (
    <>
      <Titulo
        acoes={
          <>
            <LinkBotao para={`/chamamentos/${ch}/sessoes/${s}/ata`}>Minuta de ata</LinkBotao>
            {aberta && podeFazer(perfil, 'sessaoAbrirEncerrar') && (
              <Botao
                perigo
                onClick={() => {
                  if (window.confirm('Encerrar a sessão? Depois disso não será possível registrar avaliações nela.')) {
                    void executar(() => alterar({ acao: 'encerrar' }))
                  }
                }}
              >
                Encerrar sessão
              </Botao>
            )}
          </>
        }
      >
        Sessão de {dataBr(dados.data)} — {aberta ? 'aberta' : 'encerrada'}
      </Titulo>
      <AlertaErro erro={erro} />

      <Secao titulo="Foco da projeção">
        <p className="mb-2 text-sm text-slate-700">
          {dados.foco
            ? `${rotuloProposta(dados.foco.propostaId)} · subcritério ${dados.foco.subcriterio}`
            : 'Sem foco definido.'}
        </p>
        {conduz && (
          <div className="max-w-2xl rounded-lg border border-slate-200 bg-white p-4">
            <Formulario
              key={JSON.stringify(dados.foco)}
              esquema={esquemaFoco}
              valoresIniciais={dados.foco ?? { propostaId: '', subcriterio: '' }}
              rotuloEnviar="Definir foco"
              campoDoFormulario={(campo) => campo.replace(/^foco\./, '')}
              onEnviar={(foco) => alterar({ acao: 'foco', foco }).then(() => undefined)}
            >
              <CampoSelecao
                nome="propostaId"
                rotulo="Proposta"
                opcoes={dados.pauta.map((id) => ({ valor: id, rotulo: rotuloProposta(id) }))}
              />
              <CampoSelecao nome="subcriterio" rotulo="Subcritério" opcoes={SUBCRITERIOS} />
            </Formulario>
            {dados.foco && (
              <div className="mt-3">
                <Botao onClick={() => void executar(() => alterar({ acao: 'foco', foco: null }))}>Limpar foco</Botao>
              </div>
            )}
          </div>
        )}
      </Secao>

      <Secao titulo="Presentes e declarações de impedimento">
        <Tabela
          rotulo="Presentes"
          linhas={dados.presentes}
          chave={(p) => p.uid}
          vazio="Nenhum presente registrado."
          colunas={[
            { titulo: 'Membro', celula: (p) => p.email ?? p.uid },
            { titulo: 'Perfil', celula: (p) => p.perfil },
            {
              titulo: 'Declaração',
              celula: (p) => {
                const d = declaracao(p.uid)
                if (!d) return <span className="text-amber-800">Sem declaração</span>
                return d.semImpedimento ? 'Sem impedimento' : <span className="text-red-800">Impedido: {d.motivo}</span>
              },
            },
          ]}
        />
        {conduz && <EditarPresentes sessao={dados} alterar={alterar} />}
      </Secao>

      <Secao titulo="Pauta">
        <ul className="list-inside list-disc text-sm text-slate-700">
          {dados.pauta.map((id) => (
            <li key={id}>{rotuloProposta(id)}</li>
          ))}
        </ul>
      </Secao>
    </>
  )
}

/** Mesma tela de membros da abertura, aplicada como presentes + declarações. */
function EditarPresentes({
  sessao,
  alterar,
}: {
  sessao: Sessao
  alterar: (corpo: Record<string, unknown>) => Promise<unknown>
}) {
  const [aberto, setAberto] = useState(false)
  if (!aberto) {
    return (
      <div className="mt-3">
        <Botao onClick={() => setAberto(true)}>Alterar presentes e declarações</Botao>
      </div>
    )
  }
  return <EditorMembros sessao={sessao} alterar={alterar} aoConcluir={() => setAberto(false)} />
}

const esquemaMembros = esquemaAbrirSessao.pick({ presentes: true, declaracoes: true })

function EditorMembros({
  sessao,
  alterar,
  aoConcluir,
}: {
  sessao: Sessao
  alterar: (corpo: Record<string, unknown>) => Promise<unknown>
  aoConcluir: () => void
}) {
  const comissao = useComissao()
  if (comissao.carregando || comissao.erro) return <EstadoLeitura carregando={comissao.carregando} erro={comissao.erro} />

  const presentes = new Set(sessao.presentes.map((p) => p.uid))
  const linhas = comissao.dados.map((m) => {
    const d = sessao.declaracoes.find((x) => x.uid === m.uid)
    return { uid: m.uid, presente: presentes.has(m.uid), semImpedimento: d ? d.semImpedimento : true, motivo: d?.motivo ?? '' }
  })

  return (
    <div className="mt-3 max-w-3xl rounded-lg border border-slate-200 bg-white p-4">
      <Formulario
        esquema={esquemaMembros}
        valoresIniciais={{ membros: linhas }}
        transformar={(valores) => corpoDosMembros(valores.membros ?? [])}
        campoDoFormulario={(campo, corpo) => campoDosMembros(campo, corpo, linhas)}
        rotuloEnviar="Salvar presentes e declarações"
        onEnviar={async ({ presentes: uids, declaracoes }: z.output<typeof esquemaMembros>) => {
          await alterar({ acao: 'presentes', presentes: uids })
          await alterar({ acao: 'declaracoes', declaracoes })
          aoConcluir()
        }}
      >
        <LinhasMembros membros={comissao.dados} />
      </Formulario>
    </div>
  )
}
