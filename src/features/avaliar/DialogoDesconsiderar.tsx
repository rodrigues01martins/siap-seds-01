// "Desconsiderar" a experiência por critério da D2, com justificativa obrigatória (Anexo IV, 3.8.5): diálogo da
// aba D2. Aplicar grava pela /api (PATCH desconsideracoes) e a D2 é recalculada.

import { useState } from 'react'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Checkbox } from '../../components/ui/Checkbox'
import { Dialog } from '../../components/ui/Dialog'
import { TextArea } from '../../components/ui/TextArea'
import { CRITERIOS_D2, type CodigoCriterioD2, type Desconsideracao } from '../../domain/d2'
import { MATRIZ_2026 } from '../../domain/matriz'
import { camposDoErro, z } from '../../esquemas/base'
import { esquemaDesconsideracao } from '../../esquemas/experiencia'
import type { ExperienciaGravada } from '../../lib/tipos'

const TITULO_CRITERIO: Record<CodigoCriterioD2, string> = Object.fromEntries(
  CRITERIOS_D2.map((c) => [c, MATRIZ_2026.dimensao2.criterios[c].titulo]),
) as Record<CodigoCriterioD2, string>

const esquemaLista = z.array(esquemaDesconsideracao)

export function DialogoDesconsiderar({
  experiencia,
  onAplicar,
  onFechar,
}: {
  experiencia: ExperienciaGravada
  onAplicar: (lista: Desconsideracao[]) => Promise<void>
  onFechar: () => void
}) {
  const atuais = experiencia.desconsideracoes ?? []
  const [marcados, setMarcados] = useState<CodigoCriterioD2[]>(atuais.map((d) => d.criterio))
  const [justificativa, setJustificativa] = useState(atuais[0]?.justificativa ?? '')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function aplicar() {
    const lista = marcados.map((criterio) => ({ criterio, justificativa }))
    const resultado = esquemaLista.safeParse(lista)
    if (!resultado.success) {
      setErro(Object.values(camposDoErro(resultado.error))[0] ?? 'Dados inválidos.')
      return
    }
    setErro(null)
    setEnviando(true)
    try {
      await onAplicar(resultado.data)
      onFechar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível aplicar.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog
      aberto
      titulo={`Desconsiderar “${experiencia.descricao}”`}
      descricao="Desconsidere a experiência nos critérios em que a documentação não comprova o elemento necessário (Anexo IV, 3.8.5)."
      onFechar={onFechar}
      largura="lg"
      rodape={
        <>
          <Button variante="secondary" onClick={onFechar}>
            Cancelar
          </Button>
          <Button onClick={aplicar} carregando={enviando}>
            Aplicar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <fieldset className="space-y-2">
          <legend className="mb-1 text-label-md text-text-primary">Critérios</legend>
          {CRITERIOS_D2.map((criterio) => (
            <Checkbox
              key={criterio}
              rotulo={`${criterio} — ${TITULO_CRITERIO[criterio]}`}
              checked={marcados.includes(criterio)}
              onChange={(e) => setMarcados((atual) => (e.target.checked ? [...atual, criterio] : atual.filter((c) => c !== criterio)))}
            />
          ))}
        </fieldset>
        <TextArea rotulo="Justificativa (Anexo IV, 3.8.5)" rows={3} value={justificativa} onChange={(e) => setJustificativa(e.target.value)} />
        {erro && (
          <Alert tom="error" titulo="Confira os dados">
            {erro}
          </Alert>
        )}
      </div>
    </Dialog>
  )
}
