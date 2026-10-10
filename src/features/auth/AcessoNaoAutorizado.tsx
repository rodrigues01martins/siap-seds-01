// Conta sem acesso ao app (sem cadastro, sem nenhuma permissão ou desativada) ou sem a permissão da tela.
// Não há botão de "verificar": quando o administrador libera, a tela muda sozinha.

import { Link } from 'react-router'
import { podeLer } from '../../domain/permissoes'
import { useUsuario } from './useUsuario'

export function AcessoNaoAutorizado() {
  const { usuario, sair } = useUsuario()
  const acesso = usuario?.acesso ?? null
  const temApp = podeLer(acesso)

  const mensagem = temApp
    ? 'Você não tem permissão para esta tela. Se precisar dela, peça ao administrador.'
    : acesso?.ativo === false
      ? 'Esta conta está desativada. Fale com o administrador.'
      : 'Sua conta ainda não tem acesso liberado. Peça ao administrador que libere na tela Usuários; esta página atualiza sozinha.'

  return (
    <main className="mx-auto mt-24 max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-xl font-semibold text-slate-900">Acesso não autorizado</h1>
      <p className="mt-3 text-slate-600">
        Conta <strong>{usuario?.email}</strong>. {mensagem}
      </p>
      <div className="mt-6 flex gap-3">
        {temApp && (
          <Link to="/" className="rounded-md bg-slate-900 px-4 py-2 text-white">
            Voltar ao início
          </Link>
        )}
        <button type="button" onClick={() => sair()} className="rounded-md border border-slate-300 px-4 py-2">
          Sair
        </button>
      </div>
    </main>
  )
}
