// Diligências da proposta (RF-28): abrir (objeto, prazo), registrar resposta e encerrar.
// Aviso fixo: diligência não admite inclusão de conteúdo técnico novo (Anexo III, 29.3).

import { dataBr } from '../../componentes/basicos'
import { Campo, Formulario } from '../../componentes/Formulario'
import { z } from '../../esquemas/base'
import { esquemaCamposDiligencia, esquemaConclusao, esquemaResposta } from '../../esquemas/resultado'

export interface DiligenciaGravada {
  id: string
  objeto: string
  prazo: string
  status: 'aberta' | 'respondida' | 'encerrada'
  resposta?: { texto: string; registradaPor?: { email: string | null } }
  conclusao?: string
  criadaPor?: { email: string | null }
}

interface Props {
  diligencias: DiligenciaGravada[]
  somenteLeitura: boolean
  onCriar: (dados: { objeto: string; prazo: string }) => Promise<void>
  onResponder: (id: string, resposta: string) => Promise<void>
  onEncerrar: (id: string, conclusao: string) => Promise<void>
}

const ROTULO = { aberta: 'Aberta', respondida: 'Respondida', encerrada: 'Encerrada' }
const COR = { aberta: 'bg-amber-100 text-amber-900', respondida: 'bg-sky-100 text-sky-900', encerrada: 'bg-slate-200 text-slate-700' }
const esquemaRespostaForm = z.strictObject({ resposta: esquemaResposta })
const esquemaConclusaoForm = z.strictObject({ conclusao: esquemaConclusao })

export function ListaDiligencias({ diligencias, somenteLeitura, onCriar, onResponder, onEncerrar }: Props) {
  return (
    <div className="space-y-5">
      <p role="note" className="rounded-md border-2 border-amber-500 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
        Diligência não admite inclusão de conteúdo técnico novo (Anexo III, 29.3).
      </p>

      {!somenteLeitura && (
        <section className="max-w-2xl rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-2 font-semibold">Nova diligência</h2>
          <Formulario
            esquema={esquemaCamposDiligencia}
            valoresIniciais={{ objeto: '', prazo: '' }}
            limparAoConcluir
            rotuloEnviar="Abrir diligência"
            onEnviar={onCriar}
          >
            <Campo nome="objeto" rotulo="Objeto" tipo="textarea" />
            <Campo nome="prazo" rotulo="Prazo" tipo="date" />
          </Formulario>
        </section>
      )}

      {diligencias.length === 0 && <p className="text-sm text-slate-500">Nenhuma diligência registrada.</p>}
      {diligencias.map((d) => (
        <article key={d.id} aria-label={d.objeto} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 text-sm">
          <header className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">{d.objeto}</p>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${COR[d.status]}`}>{ROTULO[d.status]}</span>
          </header>
          <p className="text-slate-600">
            Prazo: {dataBr(d.prazo)}
            {d.criadaPor?.email ? ` · aberta por ${d.criadaPor.email}` : ''}
          </p>
          {d.resposta && (
            <p>
              <strong>Resposta:</strong> {d.resposta.texto}
            </p>
          )}
          {d.conclusao && (
            <p>
              <strong>Conclusão:</strong> {d.conclusao}
            </p>
          )}
          {!somenteLeitura && d.status !== 'encerrada' && (
            <div className="grid gap-4 md:grid-cols-2">
              <Formulario
                esquema={esquemaRespostaForm}
                valoresIniciais={{ resposta: d.resposta?.texto ?? '' }}
                rotuloEnviar="Registrar resposta"
                onEnviar={({ resposta }) => onResponder(d.id, resposta)}
              >
                <Campo nome="resposta" rotulo="Resposta" tipo="textarea" />
              </Formulario>
              <Formulario
                esquema={esquemaConclusaoForm}
                valoresIniciais={{ conclusao: '' }}
                rotuloEnviar="Encerrar diligência"
                onEnviar={({ conclusao }) => onEncerrar(d.id, conclusao)}
              >
                <Campo nome="conclusao" rotulo="Conclusão" tipo="textarea" />
              </Formulario>
            </div>
          )}
        </article>
      ))}
    </div>
  )
}
