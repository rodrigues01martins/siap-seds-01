// Confirmação destrutiva do reset da sessão (presidente da Comissão). Ao abrir, busca a prévia na /api
// (GET /api/sessao?simular=true): por proposta, o que volta ao valor anterior e o que será apagado, e os
// desempates; bloqueio → Alert de erro com o motivo e os registros, botão desabilitado. Sem bloqueio,
// "Resetar sessão" só habilita com a justificativa (mín. 20 caracteres) e a palavra RESETAR digitada.

import { useEffect, useId, useState } from 'react'
import { Alert } from '../../components/ui/Alert'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Skeleton } from '../../components/ui/Skeleton'
import { TextArea } from '../../components/ui/TextArea'
import { TextField } from '../../components/ui/TextField'
import { JUSTIFICATIVA_RESET_MINIMA, PALAVRA_RESET } from '../../esquemas/sessao'
import { chamarApi, ErroApi } from '../../lib/api'

interface Bloqueio {
  mensagem: string
  itens: string[]
}

interface Previa {
  sessaoId: string
  status: string
  propostas: { propostaId: string; protocolo: string | null; reverter: string[]; apagar: string[] }[]
  desempates: { reverter: string[]; apagar: string[] }
  total: number
  bloqueios: Bloqueio[]
}

export interface ResultadoReset {
  revertidos: number
  apagados: number
  propostas: string[]
  resets: number
}

interface Props {
  aberto: boolean
  chamamentoId: string
  sessaoId: string
  /** Ex.: "sessão de 10/11/2026". */
  rotuloSessao: string
  nomeProposta: (id: string) => string
  onFechar: () => void
  onConcluido: (resultado: ResultadoReset) => void
}

const registros = (n: number) => `${n} ${n === 1 ? 'registro' : 'registros'}`

/** Grupo da prévia: título e as listas "volta ao valor anterior" e "será apagado". */
function GrupoPrevia({ titulo, reverter, apagar }: { titulo: string; reverter: string[]; apagar: string[] }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="rounded-input border border-border-default p-3">
      <h3 id={id} className="text-label-md text-text-primary">
        {titulo}
      </h3>
      {reverter.length > 0 && (
        <>
          <p className="mt-2 text-body-sm text-text-secondary">Volta ao valor anterior:</p>
          <ul aria-label="Volta ao valor anterior" className="list-inside list-disc text-body-sm text-text-primary">
            {reverter.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </>
      )}
      {apagar.length > 0 && (
        <>
          <p className="mt-2 text-body-sm text-text-secondary">Será apagado (não existia antes da sessão):</p>
          <ul aria-label="Será apagado" className="list-inside list-disc text-body-sm text-text-primary">
            {apagar.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

export function DialogoResetSessao(props: Props) {
  if (!props.aberto) return null
  return <Conteudo {...props} />
}

function Conteudo({ chamamentoId, sessaoId, rotuloSessao, nomeProposta, onFechar, onConcluido }: Props) {
  const [previa, setPrevia] = useState<Previa | null>(null)
  const [erroPrevia, setErroPrevia] = useState<string | null>(null)
  const [justificativa, setJustificativa] = useState('')
  const [palavra, setPalavra] = useState('')
  const [resetando, setResetando] = useState(false)
  const [erro, setErro] = useState<{ mensagem: string; justificativa?: string } | null>(null)

  useEffect(() => {
    let ativo = true
    const consulta = new URLSearchParams({ chamamentoId, sessaoId, simular: 'true' }).toString()
    chamarApi<Previa>(`/api/sessao?${consulta}`, { metodo: 'GET' })
      .then((p) => ativo && setPrevia(p))
      .catch((e: unknown) => ativo && setErroPrevia(e instanceof Error ? e.message : String(e)))
    return () => {
      ativo = false
    }
  }, [chamamentoId, sessaoId])

  const bloqueado = (previa?.bloqueios.length ?? 0) > 0
  const valido = justificativa.trim().length >= JUSTIFICATIVA_RESET_MINIMA && palavra.trim() === PALAVRA_RESET
  const desempates = previa?.desempates ?? { reverter: [], apagar: [] }

  const resetar = async () => {
    setResetando(true)
    setErro(null)
    try {
      onConcluido(await chamarApi<ResultadoReset>('/api/sessao', { metodo: 'PATCH', corpo: { acao: 'resetar', chamamentoId, sessaoId, justificativa: justificativa.trim() } }))
    } catch (e) {
      setErro({ mensagem: e instanceof Error ? e.message : String(e), justificativa: e instanceof ErroApi ? e.campos?.justificativa : undefined })
    } finally {
      setResetando(false)
    }
  }

  return (
    <ConfirmDialog
      aberto
      titulo={`Resetar a ${rotuloSessao}?`}
      mensagem="Tudo o que a Comissão registrou nesta sessão (admissibilidade, níveis da D1, experiências da D2 e desempates) volta ao estado anterior à sessão. Diligências não são afetadas. A sessão fica reiniciada, sem novos registros; presentes e declarações são mantidos e o reset entra na ata."
      rotuloConfirmar="Resetar sessão"
      onConfirmar={() => void resetar()}
      onCancelar={onFechar}
      confirmando={resetando}
      confirmarDesabilitado={!previa || bloqueado || !valido}
    >
      <div className="space-y-4">
        {!previa && !erroPrevia && <Skeleton linhas={3} rotulo="Carregando prévia do reset" />}
        {erroPrevia && (
          <Alert tom="error" titulo="Não foi possível carregar a prévia">
            {erroPrevia}
          </Alert>
        )}

        {previa && bloqueado && (
          <Alert tom="error" titulo="Reset bloqueado">
            {previa.bloqueios.map((b) => (
              <div key={b.mensagem} className="mt-1 first:mt-0">
                <p>{b.mensagem}</p>
                {b.itens.length > 0 && (
                  <ul className="mt-1 list-inside list-disc">
                    {b.itens.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </Alert>
        )}

        {previa && !bloqueado && (
          <>
            {previa.total === 0 ? (
              <p className="text-body-sm text-text-secondary">Nenhum registro desta sessão para desfazer. A sessão será marcada como reiniciada.</p>
            ) : (
              <>
                <p className="text-body-sm text-text-primary">
                  Serão desfeitos <strong>{registros(previa.total)}</strong>:
                </p>
                {previa.propostas.map((p) => (
                  <GrupoPrevia key={p.propostaId} titulo={`${nomeProposta(p.propostaId)} (${p.protocolo ?? p.propostaId})`} reverter={p.reverter} apagar={p.apagar} />
                ))}
                {desempates.reverter.length + desempates.apagar.length > 0 && <GrupoPrevia titulo="Desempates" {...desempates} />}
              </>
            )}
            <TextArea
              rotulo="Justificativa do reset"
              obrigatorio
              minimo={JUSTIFICATIVA_RESET_MINIMA}
              maximo={2000}
              rows={3}
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              erro={erro?.justificativa}
              ajuda="Fica na sessão, no histórico (auditoria) e na ata."
            />
            <TextField
              rotulo={`Para confirmar, digite ${PALAVRA_RESET}`}
              obrigatorio
              autoComplete="off"
              spellCheck={false}
              value={palavra}
              onChange={(e) => setPalavra(e.target.value)}
            />
          </>
        )}

        {erro && (
          <Alert tom="error" titulo="Não foi possível resetar">
            {erro.mensagem}
          </Alert>
        )}
      </div>
    </ConfirmDialog>
  )
}
