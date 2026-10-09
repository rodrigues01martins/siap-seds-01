// /chamamentos/:ch/propostas/:p/d2 — experiências da OSC (D2): tabela editável, documentos,
// desconsiderar por critério (Anexo IV, 3.8.5) e linha do tempo A/B. Escrita: presidente e relator.

import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { AlertaErro } from '../../componentes/AlertaErro'
import { Botao, EstadoLeitura, Secao } from '../../componentes/basicos'
import type { Desconsideracao } from '../../domain/d2'
import { formatarNumero } from '../../domain/formatacao'
import { podeFazer } from '../../domain/permissoes'
import type { CamposExperiencia } from '../../esquemas/experiencia'
import { chamarApi } from '../../lib/api'
import { useColecao } from '../../lib/firestore'
import { useUsuario } from '../auth/useUsuario'
import { CabecalhoProposta, useDadosProposta } from '../avaliacao/CabecalhoProposta'
import { FormExperiencia } from './FormExperiencia'
import { GraficoLinhaDoTempo } from './GraficoLinhaDoTempo'
import { TabelaExperiencias, type ExperienciaGravada } from './TabelaExperiencias'

export function TelaD2() {
  const { ch = '', p = '' } = useParams()
  const { usuario } = useUsuario()
  const leitura = useDadosProposta(ch, p)
  const experiencias = useColecao<Omit<ExperienciaGravada, 'id'>>(`chamamentos/${ch}/propostas/${p}/experiencias`)
  const [editando, setEditando] = useState<string | 'nova' | null>(null)
  const [erro, setErro] = useState<unknown>(null)

  const carregando = leitura.carregando || experiencias.carregando
  const erroLeitura = leitura.erro ?? experiencias.erro
  if (carregando || erroLeitura) return <EstadoLeitura carregando={carregando} erro={erroLeitura} />
  if (!leitura.dados) return <p className="text-slate-600">Proposta não encontrada.</p>

  const { proposta, chamamento } = leitura.dados
  const lista = [...experiencias.dados].sort((a, b) => a.inicio.localeCompare(b.inicio) || a.id.localeCompare(b.id))
  const motivo = proposta.bloqueada
    ? 'Proposta homologada: somente leitura.'
    : !podeFazer(usuario?.perfil ?? null, 'experienciasD2')
      ? 'Seu perfil consulta as experiências, mas não as edita.'
      : null
  const alvo = { chamamentoId: ch, propostaId: p }
  const nomes = Object.fromEntries(lista.map((e) => [e.id, e.descricao]))

  async function executar(acao: () => Promise<unknown>) {
    setErro(null)
    try {
      await acao()
    } catch (e) {
      setErro(e)
    }
  }

  async function salvar(dados: CamposExperiencia) {
    if (editando === 'nova') await chamarApi('/api/experiencia', { metodo: 'POST', corpo: { ...alvo, ...dados } })
    else await chamarApi('/api/experiencia', { metodo: 'PATCH', corpo: { ...alvo, id: editando, ...dados } })
    setEditando(null)
  }

  return (
    <>
      <CabecalhoProposta dados={leitura.dados} ch={ch} aba="d2" />
      {motivo && <p className="mb-3 rounded-md bg-slate-100 p-2 text-sm text-slate-700">{motivo}</p>}
      <AlertaErro erro={erro} />

      <Secao
        titulo={`Experiências — D2 gravada: ${proposta.totais?.d2 === undefined ? '—' : formatarNumero(proposta.totais.d2)} / 20`}
        acoes={
          <span className="flex gap-2">
            <Link to={`/chamamentos/${ch}/propostas/${p}/d2/memoria`} className="text-sm text-sky-800 underline">
              Memória de cálculo
            </Link>
            {!motivo && editando === null && <Botao onClick={() => setEditando('nova')}>Nova experiência</Botao>}
          </span>
        }
      >
        <TabelaExperiencias
          experiencias={lista}
          somenteLeitura={motivo !== null}
          onEditar={(id) => setEditando(id)}
          onExcluir={(id) => {
            if (!window.confirm(`Excluir a experiência "${nomes[id]}"? A D2 será recalculada.`)) return
            void executar(() => chamarApi('/api/experiencia', { metodo: 'DELETE', corpo: { ...alvo, id } }))
          }}
          onDesconsiderar={(id, desconsideracoes: Desconsideracao[]) =>
            chamarApi('/api/experiencia', { metodo: 'PATCH', corpo: { ...alvo, id, desconsideracoes } }).then(() => undefined)
          }
        />
      </Secao>

      {editando !== null && !motivo && (
        <Secao titulo={editando === 'nova' ? 'Nova experiência' : `Editar: ${nomes[editando] ?? ''}`}>
          <div className="max-w-4xl rounded-lg border border-slate-200 bg-white p-5">
            <FormExperiencia inicial={editando === 'nova' ? null : lista.find((e) => e.id === editando)} onSalvar={salvar} />
            <div className="mt-3">
              <Botao onClick={() => setEditando(null)}>Cancelar</Botao>
            </div>
          </div>
        </Secao>
      )}

      <Secao titulo="Linha do tempo (categorias A e B)">
        {chamamento.dataLimitePropostas ? (
          <GraficoLinhaDoTempo
            experiencias={lista.map((e) => ({ id: e.id, categorias: e.categorias as ('A' | 'B' | 'C' | 'D')[], inicio: e.inicio, fim: e.fim }))}
            dataLimite={chamamento.dataLimitePropostas}
            nomes={nomes}
          />
        ) : (
          <p className="text-sm text-amber-800">Cadastre a data limite das propostas no chamamento.</p>
        )}
      </Secao>
    </>
  )
}
