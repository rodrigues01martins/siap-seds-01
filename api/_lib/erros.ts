// Erro de negócio da /api: vira resposta HTTP { erro, campos? } com o status indicado.

export class ErroApi extends Error {
  constructor(
    readonly status: number,
    mensagem: string,
    readonly campos?: Record<string, string>,
    readonly cabecalhos?: Record<string, string>,
  ) {
    super(mensagem)
    this.name = 'ErroApi'
  }
}

export const MENSAGENS = {
  semLogin: 'Faça login para continuar.',
  sessaoInvalida: 'Sessão inválida ou expirada. Entre novamente.',
  semPermissao: 'Seu perfil não tem permissão para esta operação.',
  dadosInvalidos: 'Dados inválidos.',
  jsonInvalido: 'O corpo da requisição deve ser um JSON válido.',
  naoEncontrado: 'Registro não encontrado.',
  jaExiste: 'Registro já existe.',
  homologada: 'Proposta homologada: alteração não permitida.',
  propostaNaoEncontrada: 'Proposta não encontrada.',
  interno: 'Erro interno no servidor. Tente novamente.',
} as const
