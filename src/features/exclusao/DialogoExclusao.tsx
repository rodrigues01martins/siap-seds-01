// Exclusão livre (admin e presidente): um único ConfirmDialog destrutivo, sem justificativa e sem identificador
// digitado. Ao abrir, busca a prévia na /api (GET ?simular=true) e mostra "Serão apagados: 1 proposta,
// 28 avaliações, 4 experiências."; "Excluir" só habilita com a prévia carregada e confirma com DELETE.
// Erro da /api aparece no próprio diálogo. BotaoExcluir: o ícone de lixeira de cada item.

import { Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Skeleton } from '../../components/ui/Skeleton'
import type { PreviaExclusao } from '../../esquemas/exclusao'
import { chamarApi } from '../../lib/api'

export interface AlvoDialogoExclusao {
  /** Endpoint da /api (ex.: /api/propostas). */
  rota: string
  /** Identificadores aceitos pela /api (ex.: { chamamentoId, propostaId }). */
  ids: Record<string, string | number>
  /** Como o registro aparece no título e na lixeira (ex.: "proposta PROT-1 — Instituto Esperança"). */
  nome: string
}

interface Props {
  alvo: AlvoDialogoExclusao | null
  onFechar: () => void
  onExcluido: (resultado: PreviaExclusao) => void
}

export function DialogoExclusao({ alvo, ...resto }: Props) {
  if (!alvo) return null
  // Um estado novo (prévia, erro) para cada registro.
  return <Conteudo key={`${alvo.rota}:${JSON.stringify(alvo.ids)}`} alvo={alvo} {...resto} />
}

const mensagemDe = (e: unknown) => (e instanceof Error ? e.message : String(e))

function Conteudo({ alvo, onFechar, onExcluido }: Props & { alvo: AlvoDialogoExclusao }) {
  const [previa, setPrevia] = useState<PreviaExclusao | null>(null)
  const [erro, setErro] = useState<{ titulo: string; mensagem: string } | null>(null)
  const [excluindo, setExcluindo] = useState(false)
  const { rota, ids } = alvo

  useEffect(() => {
    let ativo = true
    const consulta = new URLSearchParams({ ...Object.fromEntries(Object.entries(ids).map(([k, v]) => [k, String(v)])), simular: 'true' })
    chamarApi<PreviaExclusao>(`${rota}?${consulta.toString()}`, { metodo: 'GET' })
      .then((p) => ativo && setPrevia(p))
      .catch((e: unknown) => ativo && setErro({ titulo: 'Não foi possível carregar a prévia', mensagem: mensagemDe(e) }))
    return () => {
      ativo = false
    }
  }, [rota, ids])

  const excluir = async () => {
    setExcluindo(true)
    setErro(null)
    try {
      onExcluido(await chamarApi<PreviaExclusao>(rota, { metodo: 'DELETE', corpo: ids }))
    } catch (e) {
      setErro({ titulo: 'Não foi possível excluir', mensagem: mensagemDe(e) })
    } finally {
      setExcluindo(false)
    }
  }

  return (
    <ConfirmDialog
      aberto
      titulo={`Excluir ${alvo.nome}`}
      mensagem="Esta ação não pode ser desfeita: o registro e tudo o que depende dele serão apagados."
      rotuloConfirmar="Excluir"
      onConfirmar={() => void excluir()}
      onCancelar={onFechar}
      confirmando={excluindo}
      confirmarDesabilitado={!previa}
    >
      <div className="space-y-4">
        {!previa && !erro && <Skeleton linhas={1} rotulo="Carregando prévia da exclusão" />}
        {previa && (
          <p className="text-body-sm text-text-primary" role="status">
            Serão apagados: {previa.resumo}.
          </p>
        )}
        {erro && (
          <Alert tom="error" titulo={erro.titulo}>
            {erro.mensagem}
          </Alert>
        )}
      </div>
    </ConfirmDialog>
  )
}

/** Ícone de lixeira do item; o nome acessível diz o que será excluído. */
export function BotaoExcluir({ nome, onClick }: { nome: string; onClick: () => void }) {
  return (
    <Button variante="tertiary" tamanho="sm" icone={Trash2} onClick={onClick} title={`Excluir ${nome}`}>
      <span className="sr-only">Excluir {nome}</span>
    </Button>
  )
}
