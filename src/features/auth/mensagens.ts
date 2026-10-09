// Mensagens de erro do login em português, a partir do código do Firebase Auth.

const CREDENCIAIS_INVALIDAS = 'E-mail ou senha incorretos.'

const MENSAGENS: Record<string, string> = {
  // Mesma mensagem para todos: não revela se o e-mail está cadastrado.
  'auth/invalid-credential': CREDENCIAIS_INVALIDAS,
  'auth/wrong-password': CREDENCIAIS_INVALIDAS,
  'auth/user-not-found': CREDENCIAIS_INVALIDAS,
  'auth/invalid-email': CREDENCIAIS_INVALIDAS,
  'auth/user-disabled': 'Esta conta foi desativada. Procure o administrador.',
  'auth/too-many-requests': 'Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.',
  'auth/network-request-failed': 'Sem conexão com o servidor. Verifique a internet e tente novamente.',
}

export function mensagemErroLogin(codigo: string | undefined): string {
  return (codigo && MENSAGENS[codigo]) || 'Não foi possível entrar. Tente novamente.'
}
