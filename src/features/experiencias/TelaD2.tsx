// /chamamentos/:ch/propostas/:p/d2 (ListPage) — experiências da OSC (D2): tabela editável (DataTable),
// painel lateral para criar/editar a experiência e seus documentos, desconsiderar por critério
// (Anexo IV, 3.8.5) e linha do tempo A/B. Escrita: quem tem a permissão "Experiências da D2", na sessão
// aberta com a proposta na pauta (o sessaoId vai em cada gravação).

import { Calculator, Plus } from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router'
import { ListPage } from '../../components/templates/paginas'
import { Alert } from '../../components/ui/Alert'
import { AlertaErroApi } from '../../components/ui/AlertaErroApi'
import { Button } from '../../components/ui/Button'
import { ButtonLink } from '../../components/ui/ButtonLink'
import { Card } from '../../components/ui/Card'
import { Drawer } from '../../components/ui/Drawer'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { Skeleton } from '../../components/ui/Skeleton'
import { useToast } from '../../components/ui/Toast'
import type { Desconsideracao } from '../../domain/d2'
import { formatarNumero } from '../../domain/formatacao'
import { MATRIZ_2026 } from '../../domain/matriz'
import type { CamposExperiencia } from '../../esquemas/experiencia'
import { chamarApi } from '../../lib/api'
import { useColecao } from '../../lib/firestore'
import { AvisoSomenteLeitura, cabecalhoDaProposta, ContextoProposta, motivoSemSessao, useDadosProposta } from '../avaliacao/CabecalhoProposta'
import { FormExperiencia } from './FormExperiencia'
import { GraficoLinhaDoTempo } from './GraficoLinhaDoTempo'
import { TabelaExperiencias, type ExperienciaGravada } from './TabelaExperiencias'

export function TelaD2() {
  const { ch = '', p = '' } = useParams()
  const { mostrar } = useToast()
  const leitura = useDadosProposta(ch, p)
  const experiencias = useColecao<Omit<ExperienciaGravada, 'id'>>(`chamamentos/${ch}/propostas/${p}/experiencias`)
  const [editando, setEditando] = useState<string | 'nova' | null>(null)
  const [erro, setErro] = useState<unknown>(null)

  const carregando = leitura.carregando || experiencias.carregando
  const erroLeitura = leitura.erro ?? experiencias.erro
  if (carregando) return <Skeleton linhas={8} rotulo="Carregando experiências da D2" />
  if (erroLeitura) return <ErrorState mensagem={erroLeitura} />
  if (!leitura.dados) return <EmptyState titulo="Proposta não encontrada" descricao="Confira o endereço ou volte ao painel do chamamento." />

  const { proposta, chamamento } = leitura.dados
  const lista = [...experiencias.dados].sort((a, b) => a.inicio.localeCompare(b.inicio) || a.id.localeCompare(b.id))
  const admissao = proposta.admissibilidade?.situacao
  const motivo = proposta.bloqueada
    ? 'Proposta homologada.'
    : admissao === 'nao_admitida' || admissao === 'desclassificada'
      ? 'Proposta não admitida (Anexo III, item 28): não segue para avaliação.'
      : motivoSemSessao(leitura.dados, 'experiências')
  const alvo = { chamamentoId: ch, propostaId: p, sessaoId: leitura.dados.sessaoAberta?.id }
  const nomes = Object.fromEntries(lista.map((e) => [e.id, e.descricao]))
  const d2 = proposta.totais?.d2

  async function salvar(dados: CamposExperiencia) {
    if (editando === 'nova') await chamarApi('/api/experiencia', { metodo: 'POST', corpo: { ...alvo, ...dados } })
    else await chamarApi('/api/experiencia', { metodo: 'PATCH', corpo: { ...alvo, id: editando, ...dados } })
    mostrar({ tom: 'success', titulo: editando === 'nova' ? 'Experiência cadastrada' : 'Experiência atualizada', mensagem: 'A D2 foi recalculada.' })
    setEditando(null)
  }

  return (
    <ListPage
      cabecalho={cabecalhoDaProposta(leitura.dados, ch, 'd2', {
        acoesSecundarias: (
          <ButtonLink para={`/chamamentos/${ch}/propostas/${p}/d2/memoria`} variante="secondary" icone={Calculator}>
            Memória de cálculo
          </ButtonLink>
        ),
        acaoPrimaria: motivo ? undefined : (
          <Button icone={Plus} onClick={() => setEditando('nova')}>
            Nova experiência
          </Button>
        ),
      })}
    >
      <ContextoProposta dados={leitura.dados} ch={ch} aba="d2" />
      <AvisoSomenteLeitura motivo={motivo} />
      <AlertaErroApi erro={erro} />

      <Card
        titulo="Experiências da OSC"
        descricao={`D2 gravada pela /api: ${d2 === undefined ? '—' : formatarNumero(d2)} de ${formatarNumero(MATRIZ_2026.dimensao2.maximo)} pontos · ${lista.length} experiência(s)`}
      >
        <TabelaExperiencias
          experiencias={lista}
          somenteLeitura={motivo !== null}
          onEditar={(id) => setEditando(id)}
          onExcluir={async (id) => {
            setErro(null)
            try {
              await chamarApi('/api/experiencia', { metodo: 'DELETE', corpo: { ...alvo, id } })
              mostrar({ tom: 'success', titulo: 'Experiência excluída', mensagem: 'A D2 foi recalculada.' })
            } catch (e) {
              setErro(e)
            }
          }}
          onDesconsiderar={(id, desconsideracoes: Desconsideracao[]) =>
            chamarApi('/api/experiencia', { metodo: 'PATCH', corpo: { ...alvo, id, desconsideracoes } }).then(() => undefined)
          }
        />
      </Card>

      <Card titulo="Linha do tempo (categorias A e B)" descricao="Sobreposições contam uma vez só no C2.2 e só elas permitem somar no C2.3 (Anexo IV, 3.8.3).">
        {chamamento.dataLimitePropostas ? (
          <GraficoLinhaDoTempo
            experiencias={lista.map((e) => ({ id: e.id, categorias: e.categorias as ('A' | 'B' | 'C' | 'D')[], inicio: e.inicio, fim: e.fim }))}
            dataLimite={chamamento.dataLimitePropostas}
            nomes={nomes}
          />
        ) : (
          <Alert tom="warning" titulo="Sem data limite">
            Cadastre a data limite das propostas no chamamento.
          </Alert>
        )}
      </Card>

      <Drawer
        aberto={editando !== null && !motivo}
        largura="lg"
        titulo={editando === 'nova' ? 'Nova experiência' : `Editar: ${nomes[editando ?? ''] ?? ''}`}
        descricao="A D2 é recalculada pela /api ao salvar."
        onFechar={() => setEditando(null)}
      >
        <FormExperiencia
          inicial={editando === 'nova' ? null : lista.find((e) => e.id === editando)}
          onSalvar={salvar}
          acoesSecundarias={
            <Button variante="secondary" onClick={() => setEditando(null)}>
              Cancelar
            </Button>
          }
        />
      </Drawer>
    </ListPage>
  )
}
