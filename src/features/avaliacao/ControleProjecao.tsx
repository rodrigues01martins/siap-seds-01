// Controle do telão na tela da D1 (presidente e relator): "Projetar" o subcritério atual,
// admissibilidade, D2 ou resumo, e atalhos Alt+→ / Alt+← (próximo/anterior subcritério) e Alt+R
// (resumo). Cada troca chama /api/sessao (onProjetar). Mostra o que está no telão agora.

import { MonitorUp } from 'lucide-react'
import { useEffect } from 'react'
import { Button } from '../../components/ui/Button'
import { Icone } from '../../components/ui/Icone'
import { MATRIZ_2026 } from '../../domain/matriz'
import type { TipoFoco } from '../../esquemas/sessao'
import type { Sessao } from '../../lib/tipos'
import { ROTULO_TIPO_FOCO, tipoDoFoco } from '../projecao/foco'

const CODIGOS = MATRIZ_2026.dimensao1.planos.flatMap((p) => p.subcriterios.map((s) => s.codigo))

export interface PedidoProjecao {
  tipo: TipoFoco
  subcriterio?: string
}

interface Props {
  codigoAtual: string
  foco: Sessao['foco']
  propostaId: string
  podeProjetar: boolean
  linkTelao: string | null
  onSelecionar: (codigo: string) => void
  onProjetar: (pedido: PedidoProjecao) => Promise<void>
}

function noTelao(foco: Sessao['foco'], propostaId: string): string {
  if (!foco) return 'Nada projetado'
  if (foco.propostaId !== propostaId) return 'Outra proposta'
  const tipo = tipoDoFoco(foco)
  return tipo === 'subcriterio' ? `Subcritério ${foco.subcriterio}` : ROTULO_TIPO_FOCO[tipo]
}

export function ControleProjecao({ codigoAtual, foco, propostaId, podeProjetar, linkTelao, onSelecionar, onProjetar }: Props) {
  useEffect(() => {
    if (!podeProjetar) return
    function aoTeclar(evento: KeyboardEvent) {
      if (!evento.altKey) return
      const i = CODIGOS.indexOf(codigoAtual)
      let destino: string | undefined
      if (evento.key === 'ArrowRight') destino = CODIGOS[i + 1]
      else if (evento.key === 'ArrowLeft') destino = i > 0 ? CODIGOS[i - 1] : undefined
      else if (evento.code === 'KeyR') {
        evento.preventDefault()
        void onProjetar({ tipo: 'resumo' })
        return
      } else return
      evento.preventDefault()
      if (!destino) return
      onSelecionar(destino)
      void onProjetar({ tipo: 'subcriterio', subcriterio: destino })
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [codigoAtual, podeProjetar, onProjetar, onSelecionar])

  const projetando = foco?.propostaId === propostaId && tipoDoFoco(foco) === 'subcriterio' && foco.subcriterio === codigoAtual

  return (
    <section aria-label="Projeção" className="flex flex-wrap items-center gap-3 rounded-card border border-card-border bg-card-bg px-4 py-3">
      <span role="status" aria-label="Projetando agora" className="mr-2 text-body-sm">
        <span className="text-text-secondary">No telão:</span>{' '}
        <strong className={projetando ? 'text-status-success-text' : 'text-text-primary'}>{noTelao(foco, propostaId)}</strong>
      </span>
      {podeProjetar && (
        <>
          <Button variante="secondary" tamanho="sm" aria-label={`Projetar ${codigoAtual}`} onClick={() => void onProjetar({ tipo: 'subcriterio', subcriterio: codigoAtual })}>
            Projetar {codigoAtual}
          </Button>
          <Button variante="tertiary" tamanho="sm" onClick={() => void onProjetar({ tipo: 'admissibilidade' })}>
            Projetar admissibilidade
          </Button>
          <Button variante="tertiary" tamanho="sm" onClick={() => void onProjetar({ tipo: 'd2' })}>
            Projetar D2
          </Button>
          <Button variante="tertiary" tamanho="sm" onClick={() => void onProjetar({ tipo: 'resumo' })}>
            Projetar resumo
          </Button>
          <span className="text-caption text-text-muted">Atalhos: Alt+→ / Alt+← subcritério · Alt+R resumo</span>
        </>
      )}
      {linkTelao && (
        <a href={linkTelao} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-label-md text-text-link underline-offset-2 hover:underline">
          <Icone icone={MonitorUp} tamanho={16} />
          Abrir telão
          <span className="sr-only"> (abre em nova aba)</span>
        </a>
      )}
    </section>
  )
}
