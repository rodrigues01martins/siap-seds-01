// Erro de uma chamada à /api como Alert do DS: título pelo status HTTP e a mensagem em português da /api;
// erros desconhecidos mostram texto genérico (sem detalhe técnico). 401 oferece "Entrar novamente".

import { tituloDoErro } from '../../componentes/AlertaErro'
import { ErroApi } from '../../lib/api'
import { Alert } from './Alert'

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
