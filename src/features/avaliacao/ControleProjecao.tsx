// Controle do telão na tela da D1 (presidente e relator): "Projetar" o subcritério atual,
// admissibilidade, D2 ou resumo, e atalhos Alt+→ / Alt+← (próximo/anterior subcritério) e Alt+R
// (resumo). Cada troca chama /api/sessao (onProjetar). Mostra o que está no telão agora.

import { useEffect } from 'react'
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

const classeBotao = 'rounded-md border border-slate-300 bg-white px-2.5 py-1 text-sm hover:bg-slate-50'

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
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
      <span role="status" aria-label="Projetando agora" className="mr-2">
        <span className="text-slate-500">No telão:</span>{' '}
        <strong className={projetando ? 'text-emerald-700' : 'text-slate-800'}>{noTelao(foco, propostaId)}</strong>
      </span>
      {podeProjetar && (
        <>
          <button type="button" className={classeBotao} aria-label={`Projetar ${codigoAtual}`} onClick={() => void onProjetar({ tipo: 'subcriterio', subcriterio: codigoAtual })}>
            Projetar {codigoAtual}
          </button>
          <button type="button" className={classeBotao} onClick={() => void onProjetar({ tipo: 'admissibilidade' })}>
            Projetar admissibilidade
          </button>
          <button type="button" className={classeBotao} onClick={() => void onProjetar({ tipo: 'd2' })}>
            Projetar D2
          </button>
          <button type="button" className={classeBotao} onClick={() => void onProjetar({ tipo: 'resumo' })}>
            Projetar resumo
          </button>
          <span className="text-xs text-slate-500">Atalhos: Alt+→ / Alt+← subcritério · Alt+R resumo</span>
        </>
      )}
      {linkTelao && (
        <a href={linkTelao} target="_blank" rel="noreferrer" className="ml-auto text-sky-800 underline">
          Abrir telão
        </a>
      )}
    </div>
  )
}
