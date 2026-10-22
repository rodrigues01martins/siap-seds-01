// Diálogo de cópia de experiências entre lotes (aba D2), nos dois sentidos:
// - enviar: desta proposta para a proposta da mesma OSC no outro lote ("Replicar para outro lote");
// - trazer: da proposta do outro lote para esta ("Trazer experiências do outro lote").
// Mostra a prévia da /api (GET ?replicar=true) — OSC, lotes de origem e destino, experiências e documentos, quantas
// serão copiadas e quantas já existem no destino — e confirma com POST { acao: 'replicar' }. A /api refaz todas as
// verificações na confirmação. Erro: mensagem no diálogo, que continua aberto; nada é gravado pela metade.

import { useEffect, useState } from 'react'
import { Alert } from '../../components/ui/Alert'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Select } from '../../components/ui/Select'
import { Skeleton } from '../../components/ui/Skeleton'
import type { PreviaReplicacao, ResultadoReplicacao } from '../../esquemas/experiencia'
import { chamarApi } from '../../lib/api'
import type { DestinoReplicacao } from './replicacao'

export type Sentido = 'enviar' | 'trazer'

export const MENSAGEM_REPLICACAO =
  'As experiências cadastradas para esta OSC serão copiadas para sua proposta no outro lote. Os registros originais serão preservados. A documentação será replicada, mas sua aceitação deverá ser confirmada pela Comissão no lote de destino.'
export const MENSAGEM_TRAZER =
  'As experiências cadastradas para esta OSC no outro lote serão copiadas para esta proposta. Os registros originais serão preservados. A documentação será replicada, mas sua aceitação deverá ser confirmada pela Comissão neste lote.'

const TEXTOS = {
  enviar: { titulo: 'Replicar experiências para outro lote', mensagem: MENSAGEM_REPLICACAO, confirmar: 'Confirmar replicação', escolha: 'Proposta de destino' },
  trazer: { titulo: 'Trazer experiências do outro lote', mensagem: MENSAGEM_TRAZER, confirmar: 'Confirmar cópia', escolha: 'Proposta de origem' },
} as const

interface Props {
  sentido: Sentido
  ch: string
  /** A proposta aberta na tela. */
  p: string
  sessaoId: string | null
  /** Propostas da mesma OSC em outro lote. */
  outras: DestinoReplicacao[]
  rotuloLoteAtual: string
  onFechar: () => void
  onReplicado: (resultado: ResultadoReplicacao, outra: DestinoReplicacao) => void
}

const mensagemDe = (e: unknown) => (e instanceof Error ? e.message : 'Não foi possível copiar as experiências.')

export function DialogoReplicar({ sentido, ch, p, sessaoId, outras, rotuloLoteAtual, onFechar, onReplicado }: Props) {
  const [outraId, setOutraId] = useState(outras[0]!.propostaId)
  const [previa, setPrevia] = useState<PreviaReplicacao | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const outra = outras.find((d) => d.propostaId === outraId) ?? outras[0]!
  const textos = TEXTOS[sentido]
  const [origem, destino] = sentido === 'enviar' ? [p, outraId] : [outraId, p]
  const [rotuloOrigem, rotuloDestino] = sentido === 'enviar' ? [rotuloLoteAtual, outra.rotuloLote] : [outra.rotuloLote, rotuloLoteAtual]

  useEffect(() => {
    let ativo = true
    setPrevia(null)
    setErro(null)
    const consulta = new URLSearchParams({ replicar: 'true', chamamentoId: ch, propostaId: origem, propostaDestinoId: destino })
    chamarApi<PreviaReplicacao>(`/api/experiencia?${consulta.toString()}`, { metodo: 'GET' })
      .then((r) => ativo && setPrevia(r))
      .catch((e: unknown) => ativo && setErro(mensagemDe(e)))
    return () => {
      ativo = false
    }
  }, [ch, origem, destino])

  async function confirmar() {
    setEnviando(true)
    setErro(null)
    try {
      const resultado = await chamarApi<ResultadoReplicacao>('/api/experiencia', {
        metodo: 'POST',
        corpo: { acao: 'replicar', chamamentoId: ch, propostaId: origem, sessaoId, propostaDestinoId: destino },
      })
      onReplicado(resultado, outra)
    } catch (e) {
      setErro(mensagemDe(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <ConfirmDialog
      aberto
      variante="primary"
      titulo={textos.titulo}
      mensagem={textos.mensagem}
      rotuloConfirmar={textos.confirmar}
      onConfirmar={() => void confirmar()}
      onCancelar={onFechar}
      confirmando={enviando}
      confirmarDesabilitado={!previa || previa.copiar === 0 || !sessaoId}
    >
      <div className="space-y-4">
        {outras.length > 1 && (
          <Select
            rotulo={textos.escolha}
            value={outraId}
            onChange={(e) => setOutraId(e.target.value)}
            opcoes={outras.map((d) => ({ valor: d.propostaId, rotulo: `Lote ${d.rotuloLote}` }))}
          />
        )}
        {!previa && !erro && <Skeleton linhas={4} rotulo="Carregando a prévia da cópia" />}
        {previa && (
          <>
            <ul aria-label="Resumo da cópia" className="space-y-1 text-body-sm text-text-primary">
              <li>
                <strong>OSC:</strong> {previa.osc.razaoSocial ?? previa.osc.cnpj}
              </li>
              <li>
                <strong>Lote de origem:</strong> {rotuloOrigem}
              </li>
              <li>
                <strong>Lote de destino:</strong> {rotuloDestino}
              </li>
              <li>
                <strong>Experiências disponíveis:</strong> {previa.experiencias}
              </li>
              <li>
                <strong>Documentos comprobatórios:</strong> {previa.documentos}
              </li>
              <li>
                <strong>Serão copiadas:</strong> {previa.copiar}
              </li>
              <li>
                <strong>Já existentes no destino (preservadas):</strong> {previa.existentesNoDestino}
              </li>
            </ul>
            {previa.experiencias === 0 && (
              <p className="text-body-sm text-text-secondary">
                {sentido === 'trazer' ? 'A proposta da OSC no outro lote não tem experiências cadastradas.' : 'Esta proposta não tem experiências cadastradas.'}
              </p>
            )}
            {previa.equivalentes > 0 && (
              <p className="text-body-sm text-text-secondary">
                {previa.equivalentes === 1
                  ? '1 já tem equivalente no destino e não será copiada de novo.'
                  : `${previa.equivalentes} já têm equivalente no destino e não serão copiadas de novo.`}
              </p>
            )}
          </>
        )}
        {erro && (
          <Alert tom="error" titulo="Não foi possível copiar">
            {erro}
          </Alert>
        )}
      </div>
    </ConfirmDialog>
  )
}
