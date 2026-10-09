// Alerta de erro: título pelo status HTTP e a mensagem em português vinda da /api.
// Erros que não vieram da /api mostram texto genérico (sem detalhes técnicos).

import { ErroApi } from '../lib/api'

const TITULOS: Record<number, string> = {
  0: 'Sem conexão',
  400: 'Dados inválidos',
  401: 'Sessão expirada',
  403: 'Sem permissão',
  404: 'Não encontrado',
  409: 'Operação não permitida',
}

export function tituloDoErro(erro: ErroApi): string {
  return TITULOS[erro.status] ?? (erro.status >= 500 ? 'Erro no servidor' : 'Erro')
}

export function AlertaErro({ erro }: { erro: unknown }) {
  if (!erro) return null
  const daApi = erro instanceof ErroApi
  return (
    <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
      <p className="font-semibold">{daApi ? tituloDoErro(erro) : 'Erro'}</p>
      <p className="mt-1">
        {daApi ? erro.message : 'Não foi possível concluir a operação. Tente novamente.'}
        {daApi && erro.status === 401 && (
          <>
            {' '}
            {/* Recarga completa de propósito: refaz o login do zero. */}
            <a href="/login" className="font-medium underline">
              Entrar novamente
            </a>
          </>
        )}
      </p>
    </div>
  )
}
