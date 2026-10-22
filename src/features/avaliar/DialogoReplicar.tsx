// Diálogo "Replicar experiências para outro lote" (aba D2): mostra a prévia da /api (GET ?replicar=true) — OSC,
// lotes de origem e destino, experiências e documentos, quantas serão copiadas e quantas já existem no destino — e
// confirma com POST { acao: 'replicar' }. A /api refaz todas as verificações na confirmação. Erro: mensagem no
// diálogo, que continua aberto; nada é gravado pela metade.

import { useEffect, useState } from 'react'
import { Alert } from '../../components/ui/Alert'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Select } from '../../components/ui/Select'
import { Skeleton } from '../../components/ui/Skeleton'
import type { PreviaReplicacao, ResultadoReplicacao } from '../../esquemas/experiencia'
import { chamarApi } from '../../lib/api'
import type { DestinoReplicacao } from './replicacao'

export const MENSAGEM_REPLICACAO =
  'As experiências cadastradas para esta OSC serão copiadas para sua proposta no outro lote. Os registros originais serão preservados. A documentação será replicada, mas sua aceitação deverá ser confirmada pela Comissão no lote de destino.'

interface Props {
  ch: string
  p: string
  sessaoId: string | null
  destinos: DestinoReplicacao[]
  rotuloLoteOrigem: string
  onFechar: () => void
  onReplicado: (resultado: ResultadoReplicacao, destino: DestinoReplicacao) => void
}

const mensagemDe = (e: unknown) => (e instanceof Error ? e.message : 'Não foi possível replicar.')

export function DialogoReplicar({ ch, p, sessaoId, destinos, rotuloLoteOrigem, onFechar, onReplicado }: Props) {
  const [destinoId, setDestinoId] = useState(destinos[0]!.propostaId)
  const [previa, setPrevia] = useState<PreviaReplicacao | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const destino = destinos.find((d) => d.propostaId === destinoId) ?? destinos[0]!

  useEffect(() => {
    let ativo = true
    setPrevia(null)
    setErro(null)
    const consulta = new URLSearchParams({ replicar: 'true', chamamentoId: ch, propostaId: p, propostaDestinoId: destinoId })
    chamarApi<PreviaReplicacao>(`/api/experiencia?${consulta.toString()}`, { metodo: 'GET' })
      .then((r) => ativo && setPrevia(r))
      .catch((e: unknown) => ativo && setErro(mensagemDe(e)))
    return () => {
      ativo = false
    }
  }, [ch, p, destinoId])

  async function confirmar() {
    setEnviando(true)
    setErro(null)
    try {
      const resultado = await chamarApi<ResultadoReplicacao>('/api/experiencia', {
        metodo: 'POST',
        corpo: { acao: 'replicar', chamamentoId: ch, propostaId: p, sessaoId, propostaDestinoId: destinoId },
      })
      onReplicado(resultado, destino)
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
      titulo="Replicar experiências para outro lote"
      mensagem={MENSAGEM_REPLICACAO}
      rotuloConfirmar="Confirmar replicação"
      onConfirmar={() => void confirmar()}
      onCancelar={onFechar}
      confirmando={enviando}
      confirmarDesabilitado={!previa || previa.copiar === 0 || !sessaoId}
    >
      <div className="space-y-4">
        {destinos.length > 1 && (
          <Select
            rotulo="Proposta de destino"
            value={destinoId}
            onChange={(e) => setDestinoId(e.target.value)}
            opcoes={destinos.map((d) => ({ valor: d.propostaId, rotulo: `Lote ${d.rotuloLote}` }))}
          />
        )}
        {!previa && !erro && <Skeleton linhas={4} rotulo="Carregando a prévia da replicação" />}
        {previa && (
          <>
            <ul aria-label="Resumo da replicação" className="space-y-1 text-body-sm text-text-primary">
              <li>
                <strong>OSC:</strong> {previa.osc.razaoSocial ?? previa.osc.cnpj}
              </li>
              <li>
                <strong>Lote de origem:</strong> {rotuloLoteOrigem}
              </li>
              <li>
                <strong>Lote de destino:</strong> {destino.rotuloLote}
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
          <Alert tom="error" titulo="Não foi possível replicar">
            {erro}
          </Alert>
        )}
      </div>
    </ConfirmDialog>
  )
}
