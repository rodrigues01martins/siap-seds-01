// Confirmação destrutiva da exclusão de cadastro (chamamento, OSC, proposta) — somente admin.
// Ao abrir, busca a prévia na /api (GET ?simular=true): o que será apagado (por subcoleção) e os bloqueios.
// Bloqueio → Alert de erro com ícone, motivo e registros; o botão fica desabilitado. Sem bloqueio, o botão
// "Excluir definitivamente" só habilita com a justificativa (mín. 20 caracteres) e o identificador digitado
// (nº do chamamento, CNPJ da OSC ou protocolo da proposta). Erro da /api aparece no próprio diálogo.

import { useEffect, useState } from 'react'
import { Alert } from '../../components/ui/Alert'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Skeleton } from '../../components/ui/Skeleton'
import { TextArea } from '../../components/ui/TextArea'
import { TextField } from '../../components/ui/TextField'
import { MINIMO_JUSTIFICATIVA_EXCLUSAO } from '../../esquemas/cadastros'
import { chamarApi, ErroApi } from '../../lib/api'

export type TipoExclusao = 'chamamento' | 'osc' | 'proposta'

export interface AlvoDialogoExclusao {
  tipo: TipoExclusao
  /** Identificadores aceitos pela /api (ex.: { chamamentoId, propostaId }). */
  ids: Record<string, string>
  /** Texto que a pessoa digita para confirmar (nº do chamamento, CNPJ formatado, protocolo). */
  identificador: string
  /** Como o registro aparece no título (ex.: "chamamento 001/2026"). */
  nome: string
}

export interface ResultadoExclusao {
  caminho: string
  subcolecoes: Record<string, number>
  total: number
}

interface Bloqueio {
  mensagem: string
  itens: string[]
}

interface Previa extends ResultadoExclusao {
  existe: boolean
  emExclusao: boolean
  bloqueios: Bloqueio[]
}

const ROTA: Record<TipoExclusao, string> = { chamamento: '/api/chamamentos', osc: '/api/oscs', proposta: '/api/propostas' }

const ROTULO_IDENTIFICADOR: Record<TipoExclusao, string> = {
  chamamento: 'o nº do chamamento',
  osc: 'o CNPJ da OSC',
  proposta: 'o protocolo da proposta',
}

/** Nomes das subcoleções para a prévia; as não listadas aparecem com o nome técnico. */
const ROTULO_SUBCOLECAO: Record<string, string> = {
  avaliacoes: 'Avaliações da D1',
  experiencias: 'Experiências da D2',
  'experiencias/documentos': 'Documentos das experiências',
  documentos: 'Documentos',
  resultadoD2: 'Resultado da D2',
  diligencias: 'Diligências',
  admissibilidade: 'Admissibilidade',
  desempates: 'Desempates',
}

const documentos = (n: number) => `${n} ${n === 1 ? 'documento' : 'documentos'}`

/** Comparação tolerante a maiúsculas e espaços; no CNPJ, também à pontuação. */
function normalizar(tipo: TipoExclusao, texto: string): string {
  const t = texto.trim().toUpperCase()
  return tipo === 'osc' ? t.replace(/[^0-9A-Z]/g, '') : t
}

interface Props {
  alvo: AlvoDialogoExclusao | null
  onFechar: () => void
  onExcluido: (resultado: ResultadoExclusao) => void
}

export function DialogoExclusao({ alvo, ...resto }: Props) {
  if (!alvo) return null
  // Um estado novo (prévia, justificativa, confirmação) para cada registro.
  return <Conteudo key={`${alvo.tipo}:${JSON.stringify(alvo.ids)}`} alvo={alvo} {...resto} />
}

function Conteudo({ alvo, onFechar, onExcluido }: Props & { alvo: AlvoDialogoExclusao }) {
  const [previa, setPrevia] = useState<Previa | null>(null)
  const [erroPrevia, setErroPrevia] = useState<string | null>(null)
  const [justificativa, setJustificativa] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [excluindo, setExcluindo] = useState(false)
  const [erro, setErro] = useState<{ mensagem: string; justificativa?: string } | null>(null)
  const rota = ROTA[alvo.tipo]

  useEffect(() => {
    let ativo = true
    const consulta = new URLSearchParams({ ...alvo.ids, simular: 'true' }).toString()
    chamarApi<Previa>(`${rota}?${consulta}`, { metodo: 'GET' })
      .then((p) => ativo && setPrevia(p))
      .catch((e: unknown) => ativo && setErroPrevia(e instanceof Error ? e.message : String(e)))
    return () => {
      ativo = false
    }
  }, [rota, alvo.ids])

  const bloqueado = (previa?.bloqueios.length ?? 0) > 0
  const valido =
    justificativa.trim().length >= MINIMO_JUSTIFICATIVA_EXCLUSAO && normalizar(alvo.tipo, confirmacao) === normalizar(alvo.tipo, alvo.identificador)

  const excluir = async () => {
    setExcluindo(true)
    setErro(null)
    try {
      const resultado = await chamarApi<ResultadoExclusao>(rota, { metodo: 'DELETE', corpo: { ...alvo.ids, justificativa: justificativa.trim() } })
      onExcluido(resultado)
    } catch (e) {
      const mensagem = e instanceof Error ? e.message : String(e)
      setErro({ mensagem, justificativa: e instanceof ErroApi ? e.campos?.justificativa : undefined })
    } finally {
      setExcluindo(false)
    }
  }

  const subcolecoes = Object.entries(previa?.subcolecoes ?? {})

  return (
    <ConfirmDialog
      aberto
      titulo={`Excluir ${alvo.nome}`}
      mensagem="Esta ação não pode ser desfeita: o registro e tudo o que depende dele serão apagados. O histórico (auditoria) guarda uma cópia completa e a justificativa."
      rotuloConfirmar="Excluir definitivamente"
      onConfirmar={() => void excluir()}
      onCancelar={onFechar}
      confirmando={excluindo}
      confirmarDesabilitado={!previa || bloqueado || !valido}
    >
      <div className="space-y-4">
        {!previa && !erroPrevia && <Skeleton linhas={3} rotulo="Carregando prévia da exclusão" />}
        {erroPrevia && (
          <Alert tom="error" titulo="Não foi possível carregar a prévia">
            {erroPrevia}
          </Alert>
        )}

        {previa && previa.emExclusao && (
          <Alert tom="warning" titulo="Exclusão interrompida" papel="status">
            A exclusão foi iniciada e não terminou. Confirme para concluir.
          </Alert>
        )}

        {previa && bloqueado && (
          <Alert tom="error" titulo="Exclusão bloqueada">
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
            <div className="text-body-sm text-text-primary">
              <p>
                Serão apagados <strong>{documentos(previa.total)}</strong> no total.
              </p>
              {subcolecoes.length === 0 ? (
                <p className="mt-1 text-text-secondary">Só o próprio registro (não há dados vinculados abaixo dele).</p>
              ) : (
                <ul aria-label="O que será apagado" className="mt-1 list-inside list-disc">
                  <li>O próprio registro: 1</li>
                  {subcolecoes.map(([nome, n]) => (
                    <li key={nome}>
                      {ROTULO_SUBCOLECAO[nome] ?? nome}: {n}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <TextArea
              rotulo="Justificativa da exclusão"
              obrigatorio
              minimo={MINIMO_JUSTIFICATIVA_EXCLUSAO}
              maximo={2000}
              rows={3}
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              erro={erro?.justificativa}
              ajuda="Fica registrada no histórico (auditoria) junto com a cópia do que foi apagado."
            />
            <TextField
              rotulo={`Para confirmar, digite ${ROTULO_IDENTIFICADOR[alvo.tipo]}: ${alvo.identificador}`}
              obrigatorio
              autoComplete="off"
              spellCheck={false}
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
            />
          </>
        )}

        {erro && (
          <Alert tom="error" titulo="Não foi possível excluir">
            {erro.mensagem}
          </Alert>
        )}
      </div>
    </ConfirmDialog>
  )
}
