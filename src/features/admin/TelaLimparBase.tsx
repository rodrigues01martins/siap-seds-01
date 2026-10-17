// /admin/limpar-base (DetailPage, só o admin) — Administração → Limpar base (Simplificação 4/4): começar do zero.
// Mostra em destaque o ambiente em que a /api grava (DEV ou PRODUÇÃO, pelo projectId), a prévia por coleção
// (GET ?simular=true), a situação da matriz em matrizes/{versão} com "Recarregar matriz" e a opção de remover os
// usuários. É a única exclusão do app com digitação: "Limpar base" só habilita com APAGAR TUDO digitado.
// Preservados: matrizes/ e o cadastro de quem executa (os demais usuários só saem com a opção marcada).

import { DatabaseZap, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { DetailPage } from '../../components/templates/paginas'
import { Alert } from '../../components/ui/Alert'
import { AlertaErroApi } from '../../components/ui/AlertaErroApi'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Checkbox } from '../../components/ui/Checkbox'
import { Skeleton } from '../../components/ui/Skeleton'
import { Badge } from '../../components/ui/StatusBadge'
import { TextField } from '../../components/ui/TextField'
import { CONFIRMACAO_LIMPEZA, type PreviaLimpeza, type ResultadoLimpeza } from '../../esquemas/limpeza'
import { chamarApi } from '../../lib/api'

const ROTA = '/api/admin/limpar-base'
const numero = (n: number) => n.toLocaleString('pt-BR')

export function TelaLimparBase() {
  const [previa, setPrevia] = useState<PreviaLimpeza | null>(null)
  const [erro, setErro] = useState<unknown>(null)
  const [removerUsuarios, setRemoverUsuarios] = useState(false)
  const [confirmacao, setConfirmacao] = useState('')
  const [limpando, setLimpando] = useState(false)
  const [recarregando, setRecarregando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setErro(null)
    try {
      setPrevia(await chamarApi<PreviaLimpeza>(`${ROTA}?simular=true`, { metodo: 'GET' }))
    } catch (e) {
      setErro(e)
    }
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function limpar() {
    if (!previa) return
    setLimpando(true)
    setErro(null)
    setAviso(null)
    try {
      const r = await chamarApi<ResultadoLimpeza>(ROTA, {
        metodo: 'POST',
        corpo: { acao: 'limpar', confirmacao, projectId: previa.projectId, removerUsuarios },
      })
      setAviso(`Base limpa: ${numero(r.total)} documentos apagados, ${numero(r.usuariosRemovidos)} usuários removidos. Matriz ${r.matriz.versao}: ${r.matriz.situacao}.`)
      setConfirmacao('')
      setRemoverUsuarios(false)
      await carregar()
    } catch (e) {
      setErro(e)
    } finally {
      setLimpando(false)
    }
  }

  async function recarregarMatriz() {
    setRecarregando(true)
    setErro(null)
    setAviso(null)
    try {
      const { matriz } = await chamarApi<{ matriz: ResultadoLimpeza['matriz'] }>(ROTA, { metodo: 'POST', corpo: { acao: 'recarregar-matriz' } })
      setAviso(`Matriz ${matriz.versao} ${matriz.situacao === 'atual' ? 'já estava atual' : matriz.situacao}.`)
      await carregar()
    } catch (e) {
      setErro(e)
    } finally {
      setRecarregando(false)
    }
  }

  const producao = previa?.ambiente === 'PRODUÇÃO'
  const confirmado = confirmacao === CONFIRMACAO_LIMPEZA

  return (
    <DetailPage
      cabecalho={{
        trilha: [{ rotulo: 'Início', para: '/' }, { rotulo: 'Administração' }, { rotulo: 'Limpar base' }],
        titulo: 'Limpar base',
        descricao: 'Apaga chamamentos, propostas, sessões, avaliações, OSCs e as coleções antigas para começar do zero. Não pode ser desfeito.',
      }}
    >
      <section aria-label="Ambiente">
        {!previa ? (
          <Skeleton linhas={1} rotulo="Carregando o ambiente" />
        ) : producao ? (
          <Alert tom="error" titulo={`Ambiente: PRODUÇÃO (${previa.projectId})`}>
            Você está no banco de dados real da Comissão. Faça um backup antes (npm run backup -- --projeto prod).
          </Alert>
        ) : (
          <div className="flex flex-wrap items-center gap-3 rounded-card border-2 border-status-info bg-status-info-surface p-(--sds-card-padding) text-status-info-text">
            <strong className="text-heading-3">Ambiente: DEV</strong>
            <span className="text-body-md">Projeto {previa.projectId} (testes e ensaios).</span>
          </div>
        )}
      </section>

      <AlertaErroApi erro={erro} />
      {aviso && (
        <Alert tom="success" titulo="Concluído">
          {aviso}
        </Alert>
      )}

      <Card titulo="Prévia" descricao="Preservados: matrizes/ e o seu cadastro de administrador.">
        {!previa ? (
          <Skeleton linhas={4} rotulo="Carregando a prévia" />
        ) : (
          <div className="relative overflow-x-auto">
            <table aria-label="O que será apagado" className="w-full max-w-xl border-collapse text-left text-body-sm">
              <thead className="bg-table-header-bg text-table-header-fg">
                <tr>
                  <th scope="col" className="h-(--sds-table-header-height) px-3 text-label-md">
                    Coleção
                  </th>
                  <th scope="col" className="h-(--sds-table-header-height) px-3 text-right text-label-md">
                    Documentos
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(previa.itens)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([colecao, n]) => (
                    <tr key={colecao} className="border-b border-table-border">
                      <th scope="row" className="px-3 py-2 font-normal text-text-primary">
                        {colecao}
                      </th>
                      <td className="px-3 py-2 text-right tabular-nums">{numero(n)}</td>
                    </tr>
                  ))}
                <tr>
                  <th scope="row" className="px-3 py-2 text-label-md text-text-primary">
                    Total
                  </th>
                  <td className="px-3 py-2 text-right text-label-md tabular-nums">{numero(previa.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card titulo="Matriz de avaliação" descricao="matrizes/{versão} com o conteúdo de src/domain/matriz/matriz_2026.json. A limpeza a deixa atual no fim.">
        <div className="flex flex-wrap items-center gap-3">
          {previa && (
            <>
              <span className="text-body-md text-text-primary">Matriz {previa.matriz.versao}:</span>
              <Badge tom={previa.matriz.atual ? 'success' : 'warning'}>{previa.matriz.atual ? 'Atual' : 'Desatualizada'}</Badge>
            </>
          )}
          <Button variante="secondary" icone={RefreshCw} carregando={recarregando} onClick={() => void recarregarMatriz()}>
            Recarregar matriz
          </Button>
        </div>
      </Card>

      <Card titulo="Apagar tudo" descricao="Única exclusão do sistema com digitação, por apagar a base inteira.">
        <div className="max-w-xl space-y-4">
          <Checkbox
            rotulo={`Remover também os usuários (${numero(previa?.usuarios.contas ?? 0)} contas e ${numero(previa?.usuarios.cadastros ?? 0)} cadastros), menos você`}
            ajuda="Tira do Firebase Authentication e de usuarios/. Sem marcar, os usuários continuam com acesso."
            checked={removerUsuarios}
            onChange={(e) => setRemoverUsuarios(e.target.checked)}
          />
          <TextField
            rotulo={`Digite ${CONFIRMACAO_LIMPEZA} para habilitar o botão`}
            value={confirmacao}
            autoComplete="off"
            onChange={(e) => setConfirmacao(e.target.value)}
          />
          <Button variante="destructive" icone={DatabaseZap} desabilitado={!previa || !confirmado} carregando={limpando} onClick={() => void limpar()}>
            Limpar base
          </Button>
        </div>
      </Card>
    </DetailPage>
  )
}
