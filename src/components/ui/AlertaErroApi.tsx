// Erro de uma chamada à /api como Alert do DS: título pelo status HTTP e a mensagem em português da /api;
// erros desconhecidos mostram texto genérico (sem detalhe técnico). 401 oferece "Entrar novamente".

import { ErroApi } from '../../lib/api'
import { Alert } from './Alert'

const TITULOS: Record<number, string> = {
  0: 'Sem conexão',
  400: 'Dados inválidos',
  401: 'Sessão expirada',
  403: 'Sem permissão',
  404: 'Não encontrado',
  409: 'Operação não permitida',
}

/** Título do alerta pelo status HTTP da /api. */
export function tituloDoErro(erro: ErroApi): string {
  return TITULOS[erro.status] ?? (erro.status >= 500 ? 'Erro no servidor' : 'Erro')
}

export function AlertaErroApi({ erro }: { erro: unknown }) {
  if (!erro) return null
  if (!(erro instanceof ErroApi)) {
    return (
      <Alert tom="error" titulo="Erro">
        Não foi possível concluir a operação. Tente novamente.
      </Alert>
    )
  }
  return (
    <Alert
      tom="error"
      titulo={tituloDoErro(erro)}
      acao={
        erro.status === 401 && (
          // Recarga completa de propósito: refaz o login do zero.
          <a href="/login" className="text-label-md text-text-link underline">
            Entrar novamente
          </a>
        )
      }
    >
      {erro.message}
    </Alert>
  )
}
