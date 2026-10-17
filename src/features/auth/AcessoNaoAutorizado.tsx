// Conta sem acesso ao app (sem cadastro, cadastro antigo sem perfil ou desativada): tela própria (AuthPage).
// Cadastro do modelo anterior (relator, membro, controle): "Seu acesso precisa ser atualizado pelo administrador".
// Presidente numa tela só do admin (Usuários): aviso dentro do AppShell (sem outro header/main).
// Não há botão de "verificar": quando o administrador libera, a tela muda sozinha.

import { House, LogOut, RotateCw } from 'lucide-react'
import { AuthPage } from '../../components/templates/AuthPage'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/PageHeader'
import { ButtonLink } from '../../components/ui/ButtonLink'
import { ACESSO_DESATUALIZADO, podeLer, precisaAtualizarAcesso } from '../../domain/permissoes'
import { useUsuario } from './useUsuario'

export function AcessoNaoAutorizado() {
  const { usuario, sair } = useUsuario()
  const acesso = usuario?.acesso ?? null
  const temApp = podeLer(acesso)

  const mensagem = temApp
    ? 'Você não tem permissão para esta tela. Se precisar dela, peça ao administrador.'
    : acesso?.ativo === false
      ? 'Esta conta está desativada. Fale com o administrador.'
      : precisaAtualizarAcesso(acesso)
        ? `${ACESSO_DESATUALIZADO} Esta página atualiza sozinha quando ele der o perfil.`
        : 'Sua conta ainda não tem acesso liberado. Peça ao administrador que libere na tela Usuários; esta página atualiza sozinha.'

  if (temApp) {
    return (
      <>
        <PageHeader titulo="Acesso não autorizado" />
        <Alert tom="warning" titulo="Sem permissão para esta tela" acao={<ButtonLink para="/" variante="secondary" tamanho="sm" icone={House}>Voltar ao início</ButtonLink>}>
          Conta {usuario?.email}. {mensagem}
        </Alert>
      </>
    )
  }

  return (
    <AuthPage titulo="Acesso não autorizado">
      <p className="text-body-md text-text-primary">
        Conta <strong>{usuario?.email}</strong>. {mensagem}
      </p>
      {usuario?.erro && usuario.erro !== ACESSO_DESATUALIZADO && (
        <div className="mt-4">
          <Alert tom="warning" titulo="Detalhe">
            {usuario.erro}
          </Alert>
        </div>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        <Button icone={RotateCw} onClick={() => window.location.reload()}>
          Recarregar
        </Button>
        <Button variante="secondary" icone={LogOut} onClick={() => void sair()}>
          Sair
        </Button>
      </div>
    </AuthPage>
  )
}
