// Tabela das experiências da D2 (DataTable): por linha, documentos (painel lateral), editar, "desconsiderar"
// por critério com justificativa obrigatória (Anexo IV, 3.8.5, diálogo) e excluir (confirmação destrutiva).

import { Ban, FileText, SquarePen, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Checkbox } from '../../components/ui/Checkbox'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { DataTable } from '../../components/ui/DataTable'
import { Dialog } from '../../components/ui/Dialog'
import { Drawer } from '../../components/ui/Drawer'
import { Badge } from '../../components/ui/StatusBadge'
import { TextArea } from '../../components/ui/TextArea'
import { CRITERIOS_D2, type CodigoCriterioD2, type Desconsideracao } from '../../domain/d2'
import { formatarReais } from '../../domain/formatacao'
import { MATRIZ_2026 } from '../../domain/matriz'
import { camposDoErro, z } from '../../esquemas/base'
import { ROTULO_MODALIDADE, esquemaDesconsideracao, type DocumentoExperiencia, type Modalidade } from '../../esquemas/experiencia'
import { dataBr } from '../../lib/datas'

export interface ExperienciaGravada {
  id: string
  descricao: string
  categorias: string[]
  modalidade?: Modalidade
  orgaoParceiro?: string
  instrumento?: string
  mrosc?: boolean
  inicio: string
  fim: string | null
  vagas?: number | null
  unidades?: number | null
  trabalhadores?: number | null
  valorAnualCentavos?: number | null
  documentos?: DocumentoExperiencia[]
  desconsideracoes?: Desconsideracao[]
}

interface Props {
  experiencias: ExperienciaGravada[]
  somenteLeitura: boolean
  onEditar: (id: string) => void
  /** Chamado depois da confirmação. */
  onExcluir: (id: string) => Promise<void> | void
  onDesconsiderar: (id: string, desconsideracoes: Desconsideracao[]) => Promise<void>
}

const TITULO_CRITERIO: Record<CodigoCriterioD2, string> = Object.fromEntries(
  CRITERIOS_D2.map((c) => [c, MATRIZ_2026.dimensao2.criterios[c].titulo]),
) as Record<CodigoCriterioD2, string>

const esquemaLista = z.array(esquemaDesconsideracao)
const numero = (valor: number | null | undefined) => (valor == null ? '—' : valor.toLocaleString('pt-BR'))
const SimNao = ({ valor, rotulo }: { valor: boolean | undefined; rotulo: string }) => (
  <Badge tom={valor ? 'success' : 'neutral'}>{`${rotulo}: ${valor ? 'sim' : 'não'}`}</Badge>
)

function DialogoDesconsiderar({
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

function PainelDocumentos({ experiencia, onFechar }: { experiencia: ExperienciaGravada; onFechar: () => void }) {
  const documentos = experiencia.documentos ?? []
  return (
    <Drawer aberto titulo={`Documentos de ${experiencia.descricao}`} descricao="Documentos comprobatórios registrados na experiência." onFechar={onFechar}>
      {documentos.length === 0 ? (
        <p className="text-body-md text-text-secondary">Nenhum documento.</p>
      ) : (
        <table aria-label={`Documentos de ${experiencia.descricao}`} className="w-full border-collapse text-left text-body-sm">
          <thead className="bg-table-header-bg text-table-header-fg">
            <tr>
              <th scope="col" className="h-(--sds-table-header-height) px-3 text-label-md">
                Documento
              </th>
              <th scope="col" className="h-(--sds-table-header-height) px-3 text-label-md">
                Situação
              </th>
            </tr>
          </thead>
          <tbody>
            {documentos.map((d, i) => (
              <tr key={`${d.numeroSEI}-${i}`} aria-label={d.tipo} className="border-b border-table-border align-top text-text-primary last:border-b-0">
                <td className="px-3 py-3">
                  <span className="block text-label-md">{d.tipo}</span>
                  <span className="text-text-secondary">Nº SEI {d.numeroSEI}</span>
                </td>
                <td className="space-y-1 px-3 py-3">
                  <SimNao rotulo="Comprova execução satisfatória" valor={d.comprovaExecucaoSatisfatoria} />
                  <SimNao rotulo="Aceito" valor={d.aceito} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Drawer>
  )
}

export function TabelaExperiencias({ experiencias, somenteLeitura, onEditar, onExcluir, onDesconsiderar }: Props) {
  const [documentos, setDocumentos] = useState<string | null>(null)
  const [desconsiderando, setDesconsiderando] = useState<string | null>(null)
  const [excluindo, setExcluindo] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const porId = (id: string | null) => experiencias.find((e) => e.id === id)

  return (
    <>
      <DataTable<ExperienciaGravada>
        rotulo="Experiências da OSC"
        linhas={experiencias}
        chave={(e) => e.id}
        busca={{ rotulo: 'Buscar experiência', texto: (e) => `${e.descricao} ${e.orgaoParceiro ?? ''} ${e.instrumento ?? ''}` }}
        filtros={[
          { id: 'categoria', rotulo: 'Categoria', opcoes: ['A', 'B', 'C', 'D'].map((c) => ({ valor: c, rotulo: `Categoria ${c}` })), aplicar: (e, v) => e.categorias.includes(v) },
        ]}
        vazio={{ titulo: 'Nenhuma experiência cadastrada', descricao: somenteLeitura ? undefined : 'Use "Nova experiência" para cadastrar a primeira.' }}
        colunas={[
          {
            id: 'descricao',
            titulo: 'Experiência',
            ordenar: (e) => e.descricao,
            celula: (e) => (
              <span className="block min-w-44 py-2">
                <span className="block text-label-md">{e.descricao}</span>
                {(e.desconsideracoes ?? []).length > 0 && (
                  <Badge tom="warning" className="mt-1">{`Desconsiderada em ${(e.desconsideracoes ?? []).map((d) => d.criterio).join(', ')}`}</Badge>
                )}
              </span>
            ),
          },
          { id: 'categorias', titulo: 'Categorias', celula: (e) => e.categorias.join(', ') },
          { id: 'modalidade', titulo: 'Modalidade', celula: (e) => (e.modalidade ? ROTULO_MODALIDADE[e.modalidade] : '—') },
          {
            id: 'parceria',
            titulo: 'Parceria',
            celula: (e) => (
              <span className="block min-w-40 py-2">
                <span className="block">{e.orgaoParceiro ?? '—'}</span>
                <span className="block text-text-secondary">{e.instrumento ?? '—'}</span>
                <span className="block text-caption text-text-secondary">MROSC: {e.mrosc ? 'Sim' : 'Não'}</span>
              </span>
            ),
          },
          {
            id: 'periodo',
            titulo: 'Período',
            ordenar: (e) => e.inicio,
            celula: (e) => (
              <span className="block whitespace-nowrap">
                {dataBr(e.inicio)}
                <span className="block text-text-secondary">até {e.fim ? dataBr(e.fim) : 'em execução'}</span>
              </span>
            ),
          },
          {
            id: 'porte',
            titulo: 'Porte',
            ordenar: (e) => e.vagas ?? 0,
            celula: (e) => (
              <span className="block whitespace-nowrap text-body-sm">
                {numero(e.vagas)} vagas
                <span className="block text-text-secondary">
                  {numero(e.unidades)} unid. · {numero(e.trabalhadores)} trab.
                </span>
              </span>
            ),
          },
          {
            id: 'valor',
            titulo: 'Valor anual atualizado',
            alinhar: 'direita',
            ordenar: (e) => e.valorAnualCentavos ?? 0,
            celula: (e) => <span className="whitespace-nowrap">{e.valorAnualCentavos == null ? '—' : formatarReais(e.valorAnualCentavos)}</span>,
          },
        ]}
        acoes={(e) => (
          <span className="flex justify-end gap-1">
            <Button variante="tertiary" tamanho="sm" icone={FileText} aria-label={`Documentos (${(e.documentos ?? []).length}) de ${e.descricao}`} onClick={() => setDocumentos(e.id)}>
              {`Documentos (${(e.documentos ?? []).length})`}
            </Button>
            {!somenteLeitura && (
              <>
                <Button variante="tertiary" tamanho="sm" icone={SquarePen} aria-label={`Editar ${e.descricao}`} onClick={() => onEditar(e.id)}>
                  Editar
                </Button>
                <Button variante="tertiary" tamanho="sm" icone={Ban} aria-label={`Desconsiderar ${e.descricao}`} onClick={() => setDesconsiderando(e.id)}>
                  Desconsiderar
                </Button>
                <Button variante="tertiary" tamanho="sm" icone={Trash2} aria-label={`Excluir ${e.descricao}`} onClick={() => setExcluindo(e.id)}>
                  Excluir
                </Button>
              </>
            )}
          </span>
        )}
      />

      {porId(documentos) && <PainelDocumentos experiencia={porId(documentos)!} onFechar={() => setDocumentos(null)} />}
      {porId(desconsiderando) && (
        <DialogoDesconsiderar
          experiencia={porId(desconsiderando)!}
          onAplicar={(lista) => onDesconsiderar(desconsiderando!, lista)}
          onFechar={() => setDesconsiderando(null)}
        />
      )}
      <ConfirmDialog
        aberto={excluindo !== null}
        titulo="Excluir a experiência?"
        mensagem={`“${porId(excluindo)?.descricao ?? ''}” sai da proposta e a D2 é recalculada.`}
        rotuloConfirmar="Excluir"
        confirmando={confirmando}
        onCancelar={() => setExcluindo(null)}
        onConfirmar={async () => {
          setConfirmando(true)
          try {
            await onExcluir(excluindo!)
          } finally {
            setConfirmando(false)
            setExcluindo(null)
          }
        }}
      />
    </>
  )
}
